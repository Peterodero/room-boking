import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";
import { getUser } from "../../../lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city");
  const state = searchParams.get("state");
  const type = searchParams.get("type"); // "NIGHTLY" | "MONTHLY"
  const checkIn = searchParams.get("checkIn");
  const checkOut = searchParams.get("checkOut");

  const where: any = { isActive: true };
  if (city) where.city = { contains: city, mode: "insensitive" };
  if (state && state !== "All States") where.state = { equals: state, mode: "insensitive" };
  if (type === "NIGHTLY" || type === "MONTHLY") where.listingType = type;

  let listings = await (prisma.listing as any).findMany({ where, orderBy: { createdAt: "desc" } });

  // ── Availability filter for NIGHTLY listings only ─────────────────────────
  // Monthly listings are ALWAYS visible regardless of existing bookings —
  // a booking on a monthly listing does NOT block new clients from seeing
  // or reserving it (the host manages occupancy offline).
  if (checkIn && checkOut && (!type || type === "NIGHTLY")) {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const conflicting = await prisma.booking.findMany({
      where: {
        listing: { listingType: "NIGHTLY" },
        status: { in: ["CONFIRMED", "PENDING"] },
        checkIn: { lt: end },
        checkOut: { gt: start },
      } as any,
      select: { listingId: true },
    });
    const blockedIds = new Set(conflicting.map((b) => b.listingId));
    listings = listings.filter((l: any) => !blockedIds.has(l.id));
  }

  return NextResponse.json(listings);
}

const createListingSchema = z.discriminatedUnion("listingType", [
  z.object({
    listingType: z.literal("NIGHTLY"),
    title: z.string().min(1),
    description: z.string().min(1),
    address: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    pricePerNight: z.number().positive(),
    bookingFee: z.number().nonnegative().default(0),
    maxGuests: z.number().int().positive(),
    amenities: z.array(z.string()).default([]),
    photos: z.array(z.string().url()).min(1),
  }),
  z.object({
    listingType: z.literal("MONTHLY"),
    title: z.string().min(1),
    description: z.string().min(1),
    address: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    pricePerMonth: z.number().positive(),
    depositAmount: z.number().nonnegative(),
    bookingFee: z.number().nonnegative().default(0),
    maxGuests: z.number().int().positive(),
    amenities: z.array(z.string()).default([]),
    photos: z.array(z.string().url()).min(1),
  }),
]);

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

  const listing = await (prisma.listing as any).create({
    data: { ...parsed.data, hostId: user.id },
  });
  return NextResponse.json(listing, { status: 201 });
}
