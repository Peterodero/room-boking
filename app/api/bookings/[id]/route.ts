import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getUser } from "../../../../lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { listing: true, payments: true },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.guestId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Lazy expiry: reflect a timed-out hold the moment anyone looks at it,
  // rather than relying on a scheduled job that isn't available for free.
  if (booking.status === "PENDING" && booking.holdExpiresAt && booking.holdExpiresAt < new Date()) {
    booking = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "EXPIRED", holdExpiresAt: null },
      include: { listing: true, payments: true },
    });
  }

  return NextResponse.json(booking);
}
