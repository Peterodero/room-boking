import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../lib/prisma";
import { getUser } from "../../../../../lib/auth";
import { createOxaPayInvoice } from "../../../../../lib/crypto-gateways";

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

  // Create a PENDING payment record
  const paymentRecord = await (prisma.payment as any).create({
    data: {
      bookingId,
      amount: amountUsd,
      type: normalizedPaymentType,
      status: "PENDING",
    },
  });

  const baseUrl = req.nextUrl.origin;
  const confirmationUrl =
    paymentType === "DEPOSIT"
      ? `${baseUrl}/my-rentals`
      : `${baseUrl}/booking/${bookingId}/confirmation`;

  // Safe orderId: remove colons and special chars OxaPay might reject
  const safeOrderId = `${bookingId}-${paymentRecord.id}`.replace(/[^a-zA-Z0-9\-_]/g, "-");

  try {
    const invoice = await createOxaPayInvoice({
      amountUsd,
      orderId: safeOrderId,
      callbackUrl: `${baseUrl}/api/payments/crypto/oxapay/webhook`,
      returnUrl: confirmationUrl,
    });

    await (prisma.payment as any).update({
      where: { id: paymentRecord.id },
      data: {
        rawResponse: {
          provider: "oxapay",
          trackId: invoice.trackId,
          payAddress: invoice.payAddress,
          payAmount: invoice.payAmount,
          payCurrency: invoice.payCurrency,
          expiresAt: invoice.expiresAt,
          isSimulation: invoice.isSimulation,
        },
      },
    });

    return NextResponse.json({
      paymentRecordId: paymentRecord.id,
      trackId: invoice.trackId,
      payAddress: invoice.payAddress,
      payAmount: invoice.payAmount,
      payCurrency: invoice.payCurrency,
      expiresAt: invoice.expiresAt,
      payLink: invoice.payLink,
      isSimulation: invoice.isSimulation,
    });
  } catch (err: any) {
    const isNetworkError = err?.cause?.code === "ETIMEDOUT" || err?.code === "ETIMEDOUT"
      || err?.message?.includes("fetch failed") || err?.message?.includes("ETIMEDOUT");

    // In local dev when the network can't reach OxaPay, return a simulated invoice
    const isDev = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");
    if (isNetworkError && isDev) {
      const simTrackId = `sim_${Math.random().toString(36).slice(2, 11)}`;
      await (prisma.payment as any).update({
        where: { id: paymentRecord.id },
        data: { rawResponse: { provider: "oxapay", trackId: simTrackId, isSimulation: true } },
      });
      return NextResponse.json({
        paymentRecordId: paymentRecord.id,
        trackId: simTrackId,
        payAddress: "TSimOxaAddr1234567890ABCDEF123456789",
        payAmount: amountUsd,
        payCurrency: "USDT",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        payLink: null,
        isSimulation: true,
      });
    }

    await (prisma.payment as any).update({ where: { id: paymentRecord.id }, data: { status: "FAILED" } });
    console.error("OxaPay invoice creation failed:", err);
    return NextResponse.json(
      { error: isNetworkError ? "Cannot reach OxaPay servers. Check your internet connection." : (err.message ?? "Failed to create OxaPay invoice") },
      { status: 502 }
    );
  }
}
