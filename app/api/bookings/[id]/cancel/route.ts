import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getUser } from "../../../../../lib/auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const booking = await prisma.booking.findUnique({ where: { id: params.id } });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.guestId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (booking.status === "CONFIRMED") {
    return NextResponse.json(
      { error: "Cancel a confirmed booking through support (refund required)" },
      { status: 400 }
    );
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "CANCELLED", holdExpiresAt: null },
  });
  return NextResponse.json(updated);
}
