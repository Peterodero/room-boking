import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

type AuthUser = { id: string; email: string; role: string };

export function signToken(user: { id: string; email: string; role: string }) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );
}

/** Returns the authenticated user, or null if the request has no valid token. */
export function getUser(req: NextRequest): AuthUser | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(header.slice(7), process.env.JWT_SECRET!) as AuthUser;
  } catch {
    return null;
  }
}
