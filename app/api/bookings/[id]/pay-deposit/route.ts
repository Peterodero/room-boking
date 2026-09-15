import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getUser } from "../../../../../lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const booking = await (prisma.booking as any).findUnique({
    where: { id: params.id },
    include: { listing: true },
  });

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.guestId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (booking.monthlyStatus !== "RESERVED") {
    return NextResponse.json({ error: "Deposit already paid or booking cancelled" }, { status: 409 });
  }

  const depositAmount = Number(booking.depositAmount) || 0;

  // Mark deposit paid and record a Payment entry
  const [updatedBooking] = await (prisma as any).$transaction([
    (prisma.booking as any).update({
      where: { id: booking.id },
      data: {
        monthlyStatus: "DEPOSIT_PAID",
        depositPaidAt: new Date(),
        holdExpiresAt: null,
      },
    }),
    (prisma.payment as any).create({
      data: {
        bookingId: booking.id,
        amount: depositAmount,
        type: "DEPOSIT",
        status: "COMPLETED",
      },
    }),
  ]);

  return NextResponse.json(updatedBooking);
}
