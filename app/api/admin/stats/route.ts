import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getUser } from "../../../../lib/auth";

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const [totalUsers, totalListings, activeListings, totalBookings, confirmedBookings, pendingBookings, payments] = await Promise.all([
    prisma.user.count(),
    prisma.listing.count(),
    prisma.listing.count({ where: { isActive: true } }),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "CONFIRMED" } }),
    prisma.booking.count({ where: { status: "PENDING" } }),
    prisma.payment.aggregate({
      where: { status: "COMPLETED" },
      _sum: { amount: true },
    }),
  ]);

  const totalRevenue = payments._sum.amount ? Number(payments._sum.amount) : 0;

  return NextResponse.json({
    totalUsers,
    totalListings,
    activeListings,
    totalBookings,
    confirmedBookings,
    pendingBookings,
    totalRevenue,
  });
}
