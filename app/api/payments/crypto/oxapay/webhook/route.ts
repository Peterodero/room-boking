import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { verifyOxaPayWebhook } from "../../../../../../lib/crypto-gateways";

// OxaPay sends a POST to this URL when payment status changes.
// Reference: https://docs.oxapay.com/#tag/Merchant/operation/merchant.callback
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const hmac = req.headers.get("hmac") ?? "";

  if (!verifyOxaPayWebhook(rawBody, hmac)) {
    console.warn("OxaPay webhook: invalid HMAC signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let data: any;
  try {
    data = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // orderId was set as "bookingId:paymentRecordId"
  const [bookingId, paymentRecordId] = String(data.orderId ?? "").split(":");
  const status: string = data.status ?? "";
  const trackId = String(data.trackId ?? "");

  if (!bookingId || !paymentRecordId) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  }

  // OxaPay statuses: Waiting | Confirming | Paid | Expired | Error
  const isPaid = status === "Paid";
  const isFailed = status === "Expired" || status === "Error";

  if (isPaid) {
    await (prisma.payment as any).updateMany({
      where: { id: paymentRecordId, bookingId },
      data: {
        squarePaymentId: `oxa:${trackId}`,
        status: "COMPLETED",
        rawResponse: data,
      },
    });

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

  return NextResponse.json({ received: true });
}
