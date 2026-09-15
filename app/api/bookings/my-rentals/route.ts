import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getUser } from "../../../../lib/auth";

// GET /api/bookings/my-rentals — returns all monthly bookings for logged-in user
export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rentals = await (prisma.booking as any).findMany({
    where: {
      guestId: user.id,
      monthlyStatus: { not: null },
    },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          city: true,
          state: true,
          pricePerMonth: true,
          photos: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(rentals);
}
