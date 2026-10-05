import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const { bookingId } = params;
    const { searchParams } = new URL(req.url);
    const paymentType = searchParams.get("paymentType") || "FULL";

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        monthlyStatus: true,
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            type: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const latestPayment = booking.payments[0];

    const isPaid =
      paymentType === "DEPOSIT"
        ? booking.monthlyStatus === "DEPOSIT_PAID" || booking.status === "CONFIRMED"
        : booking.status === "CONFIRMED";

    return NextResponse.json({
      bookingId: booking.id,
      bookingStatus: booking.status,
      monthlyStatus: booking.monthlyStatus,
      isPaid,
      latestPaymentStatus: latestPayment?.status || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to check status" },
      { status: 500 }
    );
  }
}
