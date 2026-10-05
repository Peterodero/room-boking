import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../lib/prisma";
import { getUser } from "../../../../../lib/auth";
import { createNowPaymentsInvoice } from "../../../../../lib/crypto-gateways";

const schema = z.object({
  bookingId: z.string(),
  paymentType: z.enum(["BOOKING_FEE", "DEPOSIT", "FULL", "FULL_PAYMENT"]),
});

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) {
    return NextResponse.json(
      { error: "Please log in to initiate crypto payment.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { bookingId, paymentType } = parsed.data;

  const booking = await (prisma.booking as any).findUnique({
    where: { id: bookingId },
    include: { listing: true },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.guestId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const normalizedPaymentType =
    paymentType === "DEPOSIT" ? "DEPOSIT" : "BOOKING_FEE";

  const amountUsd =
    normalizedPaymentType === "DEPOSIT"
      ? Number(booking.depositAmount)
      : Number(booking.bookingFee);

  if (!amountUsd || amountUsd <= 0) {
    return NextResponse.json({ error: "No payable amount found for this booking" }, { status: 400 });
  }

  // Create a PENDING payment record first
  const paymentRecord = await (prisma.payment as any).create({
    data: {
      bookingId,
      amount: amountUsd,
      type: normalizedPaymentType,
      status: "PENDING",
    },
  });

  const baseUrl = req.nextUrl.origin;
  try {
    const invoice = await createNowPaymentsInvoice({
      amountUsd,
      orderId: `${bookingId}:${paymentRecord.id}`,
      callbackUrl: `${baseUrl}/api/payments/crypto/nowpayments/webhook`,
    });

    // Persist the NOWPayments payment id in rawResponse
    await (prisma.payment as any).update({
      where: { id: paymentRecord.id },
      data: {
        rawResponse: {
          provider: "nowpayments",
          trackId: invoice.paymentId,
          payAddress: invoice.payAddress,
          payAmount: invoice.payAmount,
          payCurrency: invoice.payCurrency,
          expiresAt: invoice.expiresAt,
        },
      },
    });

    return NextResponse.json({
      paymentRecordId: paymentRecord.id,
      trackId: invoice.paymentId,
      payAddress: invoice.payAddress,
      payAmount: invoice.payAmount,
      payCurrency: invoice.payCurrency,
      expiresAt: invoice.expiresAt,
      paymentUrl: invoice.paymentUrl,
    });
  } catch (err: any) {
    await (prisma.payment as any).update({ where: { id: paymentRecord.id }, data: { status: "FAILED" } });
    console.error("NOWPayments invoice creation failed:", err);
    return NextResponse.json({ error: err.message ?? "Failed to create crypto invoice" }, { status: 502 });
  }
}
