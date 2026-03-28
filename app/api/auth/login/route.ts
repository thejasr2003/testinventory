import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });

  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET || "secret",
    { expiresIn: "1h" }
  );

  const res = NextResponse.json({
    message: "Login successful",
    user: { id: user.id, name: user.name, email: user.email },
  });

  // ✅ Set token cookie
  res.cookies.set({
    name: "token",
    value: token,
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60, 
    sameSite: "lax",
  });

  return res;
}
