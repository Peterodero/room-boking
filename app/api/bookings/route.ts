import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";
import { getUser } from "../../../lib/auth";

const HOLD_MINUTES = Number(process.env.BOOKING_HOLD_MINUTES || 15);

const createBookingSchema = z.object({
  listingId: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  guestCount: z.number().int().positive().default(1),
});

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { listingId, guestCount } = parsed.data;
  const checkIn = new Date(parsed.data.checkIn);
  const checkOut = new Date(parsed.data.checkOut);
  if (checkOut <= checkIn) {
    return NextResponse.json({ error: "checkOut must be after checkIn" }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || !listing.isActive) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (guestCount > listing.maxGuests) {
    return NextResponse.json(
      { error: `This listing allows at most ${listing.maxGuests} guests` },
      { status: 400 }
    );
  }

  try {
    const booking = await prisma.$transaction(async (tx) => {
      // Lazy sweep: there's no always-on cron here (serverless + free tier),
      // so expired holds are cleared out right before we need accurate
      // availability, as part of the same transaction.
      await tx.booking.updateMany({
        where: { listingId, status: "PENDING", holdExpiresAt: { lt: new Date() } },
        data: { status: "EXPIRED", holdExpiresAt: null },
      });

      const overlap = await tx.booking.findFirst({
        where: {
          listingId,
          status: { in: ["CONFIRMED", "PENDING"] },
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
