import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";
import { getUser } from "../../../lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city");
  const checkIn = searchParams.get("checkIn");
  const checkOut = searchParams.get("checkOut");

  const where: any = { isActive: true };
  if (city) where.city = { equals: city, mode: "insensitive" };

  let listings = await prisma.listing.findMany({ where });

  if (checkIn && checkOut) {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const conflicting = await prisma.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "PENDING"] },
        checkIn: { lt: end },
        checkOut: { gt: start },
      },
      select: { listingId: true },
    });
    const blockedIds = new Set(conflicting.map((b) => b.listingId));
    listings = listings.filter((l) => !blockedIds.has(l.id));
  }

  return NextResponse.json(listings);
}

const createListingSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  pricePerNight: z.number().positive(),
  bookingFee: z.number().nonnegative(),
  maxGuests: z.number().int().positive(),
  amenities: z.array(z.string()).default([]),
  photos: z.array(z.string().url()).default([]),
});

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user || !["HOST", "ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createListingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const listing = await prisma.listing.create({
    data: { ...parsed.data, hostId: user.id },
  });
  return NextResponse.json(listing, { status: 201 });
}
