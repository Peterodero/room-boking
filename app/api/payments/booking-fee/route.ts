import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import { getUser } from "../../../../lib/auth";
import { chargeToken } from "../../../../lib/square";

const paySchema = z.object({
  bookingId: z.string(),
  sourceId: z.string(),
});

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = paySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { bookingId, sourceId } = parsed.data;

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.guestId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (booking.status !== "PENDING") {
    return NextResponse.json(
      { error: `Booking is ${booking.status.toLowerCase()}, not payable` },
      { status: 400 }
    );
  }
  if (booking.holdExpiresAt && booking.holdExpiresAt < new Date()) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "EXPIRED", holdExpiresAt: null },
    });
    return NextResponse.json(
      { error: "This booking hold has expired. Please rebook." },
      { status: 410 }
    );
  }

  const amountCents = Math.round(Number(booking.bookingFee) * 100);
  if (amountCents <= 0) {
    return NextResponse.json({ error: "This listing has no booking fee configured" }, { status: 400 });
  }

  const paymentRecord = await prisma.payment.create({
    data: {
      bookingId: booking.id,
      amount: booking.bookingFee,
      type: "BOOKING_FEE",
      status: "PENDING",
    },
  });

  try {
    const squarePayment = await chargeToken({
      sourceId,
      amountCents,
      idempotencyKey: crypto.randomUUID(),
      referenceId: booking.id,
    });

    const succeeded = squarePayment?.status === "COMPLETED" || squarePayment?.status === "APPROVED";

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentRecord.id },
      data: {
        squarePaymentId: squarePayment?.id,
        status: succeeded ? "COMPLETED" : "FAILED",
        rawResponse: JSON.parse(
          JSON.stringify(squarePayment, (_key, v) => (typeof v === "bigint" ? v.toString() : v))
        ),
      },
    });

    if (!succeeded) {
      return NextResponse.json({ error: "Payment was not completed", payment: updatedPayment }, { status: 402 });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CONFIRMED", holdExpiresAt: null },
    });

    return NextResponse.json({ booking: updatedBooking, payment: updatedPayment });
  } catch (err) {
    console.error("Square charge failed:", err);
    await prisma.payment.update({ where: { id: paymentRecord.id }, data: { status: "FAILED" } });
    return NextResponse.json({ error: "Payment processing failed. No charge was made." }, { status: 502 });
  }
}
