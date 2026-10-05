import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../../../../../lib/prisma";
import { getUser } from "../../../../../lib/auth";
import { chargeToken } from "../../../../../lib/square";

const payDepositSchema = z.object({
  sourceId: z.string().optional().default("cashapp-sandbox-deposit-token"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = payDepositSchema.safeParse(body);
  const sourceId = parsed.success && parsed.data.sourceId ? parsed.data.sourceId : "cashapp-sandbox-deposit-token";

  const booking = await (prisma.booking as any).findUnique({
    where: { id: params.id },
    include: { listing: true },
  });

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.guestId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const isPlotSale = booking.listing?.listingType === "PLOT_SALE";

  // Already paid check
  if (isPlotSale && booking.saleStatus === "DEPOSIT_PAID") {
    return NextResponse.json({ error: "Down payment deposit already paid for this plot" }, { status: 409 });
  }
  if (!isPlotSale && booking.monthlyStatus === "DEPOSIT_PAID") {
    return NextResponse.json({ error: "Security deposit has already been paid for this booking" }, { status: 409 });
  }

  const depositAmount = Number(booking.depositAmount) || 0;
  const amountCents = Math.round(depositAmount * 100);

  if (amountCents <= 0) {
    return NextResponse.json({ error: "No deposit amount configured for this listing" }, { status: 400 });
  }

  const paymentRecord = await (prisma.payment as any).create({
    data: {
      bookingId: booking.id,
      amount: depositAmount,
      type: "DEPOSIT",
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

    const updatedPayment = await (prisma.payment as any).update({
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
      return NextResponse.json({ error: "Deposit payment was not completed", payment: updatedPayment }, { status: 402 });
    }

    // Update the right status field depending on listing type
    const statusUpdate = isPlotSale
      ? { saleStatus: "DEPOSIT_PAID", status: "CONFIRMED", depositPaidAt: new Date(), holdExpiresAt: null }
      : { monthlyStatus: "DEPOSIT_PAID", depositPaidAt: new Date(), holdExpiresAt: null };

    const updatedBooking = await (prisma.booking as any).update({
      where: { id: booking.id },
      data: statusUpdate,
    });

    return NextResponse.json({ booking: updatedBooking, payment: updatedPayment });
  } catch (err) {
    console.error("Deposit payment failed:", err);
    await (prisma.payment as any).update({ where: { id: paymentRecord.id }, data: { status: "FAILED" } });
    return NextResponse.json({ error: "Deposit payment processing failed. No charge was made." }, { status: 502 });
  }
}

