import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import { getUser } from "../../../../lib/auth";

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const listings = await prisma.listing.findMany({
    include: {
      host: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: { bookings: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(listings);
}

const updateListingSchema = z.object({
  listingId: z.string(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const admin = getUser(req);
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateListingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { listingId, isActive } = parsed.data;

  const updatedListing = await prisma.listing.update({
    where: { id: listingId },
    data: { isActive },
  });

  return NextResponse.json(updatedListing);
}

export async function DELETE(req: NextRequest) {
  const admin = getUser(req);
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const listingId = searchParams.get("id");

  if (!listingId) {
    return NextResponse.json({ error: "Missing listingId" }, { status: 400 });
  }

  await prisma.listing.delete({
    where: { id: listingId },
  });

  return NextResponse.json({ success: true, message: "Listing deleted" });
}
