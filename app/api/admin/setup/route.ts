import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import { signToken } from "../../../../lib/auth";

const setupAdminSchema = z.object({
  secretKey: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = setupAdminSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { secretKey, email, password, name } = parsed.data;

  // Validate secret key against environment variable or fallback secret
  const expectedSecret = process.env.ADMIN_SETUP_SECRET || "roomstays_admin_secret_2026";
  if (secretKey !== expectedSecret) {
    return NextResponse.json({ error: "Invalid admin setup secret key" }, { status: 403 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Upsert user to ADMIN role
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: "ADMIN",
      passwordHash,
      isUSCitizen: true,
    },
    create: {
      email,
      passwordHash,
      name,
      role: "ADMIN",
      isUSCitizen: true,
    },
  });

  const token = signToken(user);
  const { passwordHash: _omit, ...publicUser } = user;

  return NextResponse.json({
    message: "Admin account successfully configured",
    token,
    user: publicUser,
  });
}
