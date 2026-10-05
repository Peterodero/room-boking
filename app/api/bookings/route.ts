import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";
import { getUser } from "../../../lib/auth";

const HOLD_MINUTES = Number(process.env.BOOKING_HOLD_MINUTES || 15);

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where = user.role === "ADMIN" ? {} : { guestId: user.id };

  const bookings = await (prisma.booking as any).findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          city: true,
          state: true,
          photos: true,
          listingType: true,
        },
      },
      payments: true,
    },
  });

  return NextResponse.json(bookings);
}

// Schema for nightly booking
const nightlySchema = z.object({
  listingId: z.string(),
  bookingType: z.literal("NIGHTLY"),
  checkIn: z.string(),
  checkOut: z.string(),
  guestCount: z.number().int().positive().default(1),
});

// Schema for monthly booking
const monthlySchema = z.object({
  listingId: z.string(),
  bookingType: z.literal("MONTHLY"),
  moveInDate: z.string(),
  guestCount: z.number().int().positive().default(1),
});

// Schema for plot sale booking
const plotSaleSchema = z.object({
  listingId: z.string(),
  bookingType: z.literal("PLOT_SALE"),
  option: z.enum(["RESERVE_HOLD", "PAY_DEPOSIT", "BUY_OUTRIGHT"]).default("RESERVE_HOLD"),
  guestCount: z.number().int().positive().default(1),
});

const createBookingSchema = z.discriminatedUnion("bookingType", [nightlySchema, monthlySchema, plotSaleSchema]);

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { listingId, guestCount } = parsed.data;

  const listing = await (prisma.listing as any).findUnique({ where: { id: listingId } });
  if (!listing || !listing.isActive) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (guestCount > listing.maxGuests) {
    return NextResponse.json(
      { error: `This listing allows at most ${listing.maxGuests} guests` },
      { status: 400 }
    );
  }

  // ── PLOT SALE BOOKING ───────────────────────────────────────────────────
  if (parsed.data.bookingType === "PLOT_SALE") {
    if (listing.listingType !== "PLOT_SALE") {
      return NextResponse.json({ error: "This listing is not a plot for sale" }, { status: 400 });
    }

    const salePrice = Number(listing.salePrice) || 0;
    const depositAmount = Number(listing.depositAmount) || Math.round(salePrice * 0.1);
    const holdFee = Number(listing.bookingFee) || 100;
    const option = parsed.data.option;

    const initialSaleStatus = option === "BUY_OUTRIGHT" ? "BUY_OUTRIGHT" : option === "PAY_DEPOSIT" ? "DEPOSIT_PAID" : "RESERVED";

    const booking = await (prisma.booking as any).create({
      data: {
        listingId,
        guestId: user.id,
        guestCount: 1,
        totalPrice: salePrice,
        bookingFee: holdFee,
        depositAmount: depositAmount,
        status: "PENDING",
        saleStatus: initialSaleStatus,
        holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60 * 1000),
      },
    });

    return NextResponse.json(booking, { status: 201 });
  }

  // ── MONTHLY BOOKING ──────────────────────────────────────────────────────
  if (parsed.data.bookingType === "MONTHLY") {
    if (listing.listingType !== "MONTHLY") {
      return NextResponse.json({ error: "This listing is not available for monthly rental" }, { status: 400 });
    }

    const moveInDate = new Date(parsed.data.moveInDate);
    const depositAmount = Number(listing.depositAmount) || 0;

    const booking = await (prisma.booking as any).create({
      data: {
        listingId,
        guestId: user.id,
        guestCount,
        totalPrice: depositAmount,        // total due online = deposit
        bookingFee: listing.bookingFee,
        status: "PENDING",                // nightly status unused but required
        monthlyStatus: "RESERVED",
        moveInDate,
        depositAmount,
        holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60 * 1000),
      },
    });

    return NextResponse.json(booking, { status: 201 });
  }

  // ── NIGHTLY BOOKING ───────────────────────────────────────────────────────
  const checkIn = new Date(parsed.data.checkIn);
  const checkOut = new Date(parsed.data.checkOut);
  if (checkOut <= checkIn) {
    return NextResponse.json({ error: "checkOut must be after checkIn" }, { status: 400 });
  }

  try {
    const booking = await (prisma as any).$transaction(async (tx: any) => {
      // Lazy sweep: expire stale holds
      await tx.booking.updateMany({
        where: { listingId, status: "PENDING", holdExpiresAt: { lt: new Date() } },
        data: { status: "EXPIRED", holdExpiresAt: null },
      });

      // If the current guest already has an active PENDING hold for these dates, refresh and return it
      const existingUserHold = await tx.booking.findFirst({
        where: {
          listingId,
          guestId: user.id,
          status: "PENDING",
          checkIn: { lt: checkOut },
          checkOut: { gt: checkIn },
        },
      });

      if (existingUserHold) {
        return tx.booking.update({
          where: { id: existingUserHold.id },
          data: { holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60 * 1000) },
        });
      }

      const overlap = await tx.booking.findFirst({
        where: {
          listingId,
          status: "CONFIRMED",
          checkIn: { lt: checkOut },
          checkOut: { gt: checkIn },
        },
      });
      if (overlap) throw new Error("DATES_UNAVAILABLE");

      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      const totalPrice = Number(listing.pricePerNight) * nights;

      return tx.booking.create({
        data: {
          listingId,
          guestId: user.id,
          checkIn,
          checkOut,
          guestCount,
          totalPrice,
          bookingFee: listing.bookingFee,
          status: "PENDING",
          holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60 * 1000),
        },
      });
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (err: any) {
    if (err.message === "DATES_UNAVAILABLE") {
      return NextResponse.json({ error: "Those dates are no longer available" }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
