import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { verifyNowPaymentsWebhook } from "../../../../../../lib/crypto-gateways";

// NOWPayments sends IPN (Instant Payment Notification) when payment status changes.
// Reference: https://documenter.getpostman.com/view/7907941/2s93JqTRWN#callbacks
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-nowpayments-sig") ?? "";

  if (!verifyNowPaymentsWebhook(rawBody, signature)) {
    console.warn("NOWPayments webhook: invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let data: any;
  try {
    data = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // order_id was set as "bookingId:paymentRecordId"
  const [bookingId, paymentRecordId] = String(data.order_id ?? "").split(":");
  const paymentStatus: string = data.payment_status ?? "";
  const npPaymentId = String(data.payment_id ?? "");

  if (!bookingId || !paymentRecordId) {
    return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
  }

  // Statuses: waiting | confirming | confirmed | sending | partially_paid | finished | failed | refunded | expired
  const isFinished = paymentStatus === "finished" || paymentStatus === "confirmed";
  const isFailed = paymentStatus === "failed" || paymentStatus === "expired" || paymentStatus === "refunded";

  if (isFinished) {
    // Mark payment COMPLETED
    await (prisma.payment as any).updateMany({
      where: { id: paymentRecordId, bookingId },
      data: {
        squarePaymentId: `np:${npPaymentId}`,
        status: "COMPLETED",
        rawResponse: data,
      },
    });

    // Determine which booking field to update based on payment type
    const payment = await (prisma.payment as any).findUnique({ where: { id: paymentRecordId } });
    if (payment?.type === "DEPOSIT") {
      await (prisma.booking as any).update({
        where: { id: bookingId },
        data: { monthlyStatus: "DEPOSIT_PAID", depositPaidAt: new Date(), holdExpiresAt: null },
      });
    } else {
      await (prisma.booking as any).update({
        where: { id: bookingId },
        data: { status: "CONFIRMED", holdExpiresAt: null },
      });
    }
  } else if (isFailed) {
    await (prisma.payment as any).updateMany({
      where: { id: paymentRecordId, bookingId },
      data: { status: "FAILED", rawResponse: data },
    });
  }

  // Always respond 200 so NOWPayments stops retrying
  return NextResponse.json({ received: true });
}
