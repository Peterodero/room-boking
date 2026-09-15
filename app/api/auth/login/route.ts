import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import { signToken } from "../../../../lib/auth";

const loginSchema = z.object({
  username: z.string().optional(),
  email: z.string().optional(),
  password: z.string(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { username, email, password } = parsed.data;

  const identifier = username || email;
  if (!identifier) {
    return NextResponse.json({ error: "Username or email is required" }, { status: 400 });
  }

  // Find user by username or email
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: { equals: identifier, mode: "insensitive" } },
        { email: { equals: identifier, mode: "insensitive" } },
      ],
    } as any,
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid username/email or password" }, { status: 401 });
  }

  const token = signToken(user);
  const { passwordHash: _omit, ...publicUser } = user;
  return NextResponse.json({ token, user: publicUser });
}
