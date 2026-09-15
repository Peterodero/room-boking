import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import { getUser } from "../../../../lib/auth";

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const bookings = await prisma.booking.findMany({
    include: {
      listing: {
        select: { id: true, title: true, city: true, state: true },
      },
      guest: {
        select: { id: true, name: true, email: true },
      },
      payments: {
        select: { id: true, amount: true, status: true, type: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(bookings);
}

const updateBookingSchema = z.object({
  bookingId: z.string(),
  status: z.enum(["PENDING", "CONFIRMED", "EXPIRED", "CANCELLED"]),
});

export async function PATCH(req: NextRequest) {
  const admin = getUser(req);
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { bookingId, status } = parsed.data;

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status,
      holdExpiresAt: status === "CONFIRMED" || status === "CANCELLED" || status === "EXPIRED" ? null : undefined,
    },
  });

  return NextResponse.json(updatedBooking);
}
