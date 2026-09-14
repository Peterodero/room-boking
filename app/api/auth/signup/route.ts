import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import { signToken } from "../../../../lib/auth";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(["GUEST", "HOST"]).default("GUEST"),
  isUSCitizen: z.boolean(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { email, password, name, role, isUSCitizen } = parsed.data;

  if (!isUSCitizen) {
    return NextResponse.json(
      { error: "This platform is limited to US citizens." },
      { status: 403 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, role, isUSCitizen },
  });

  const token = signToken(user);
  const { passwordHash: _omit, ...publicUser } = user;
  return NextResponse.json({ token, user: publicUser }, { status: 201 });
}
