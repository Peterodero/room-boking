import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import { getUser } from "../../../../lib/auth";

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      role: true,
      isUSCitizen: true,
      createdAt: true,
      _count: {
        select: {
          listings: true,
          bookings: true,
        },
      },
    } as any,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

const updateUserSchema = z.object({
  userId: z.string(),
  role: z.enum(["GUEST", "HOST", "ADMIN"]).optional(),
  isUSCitizen: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const admin = getUser(req);
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { userId, role, isUSCitizen } = parsed.data;

  const dataToUpdate: any = {};
  if (role !== undefined) dataToUpdate.role = role;
  if (isUSCitizen !== undefined) dataToUpdate.isUSCitizen = isUSCitizen;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: dataToUpdate,
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      role: true,
      isUSCitizen: true,
      createdAt: true,
    } as any,
  });

  return NextResponse.json(updatedUser);
}
