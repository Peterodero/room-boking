import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import { signToken } from "../../../../lib/auth";

const signupSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  isUSCitizen: z.boolean(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { username, email, password, name, isUSCitizen } = parsed.data;

  if (!isUSCitizen) {
    return NextResponse.json(
      { error: "This platform is limited to US citizens." },
      { status: 403 }
    );
  }

  const existingUsername = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } } as any,
  });
  if (existingUsername) {
    return NextResponse.json(
      { error: "That username is already taken. Please choose another." },
      { status: 409 }
    );
  }

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    return NextResponse.json(
      { error: "An account with that email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      name,
      role: "GUEST",
      isUSCitizen,
    } as any,
  });

  const token = signToken(user);
  const { passwordHash: _omit, ...publicUser } = user;
  return NextResponse.json({ token, user: publicUser }, { status: 201 });
}
