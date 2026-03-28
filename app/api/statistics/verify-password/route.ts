import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (!password) return NextResponse.json({ success: false, message: "Password required" });

    const setting = await prisma.settings.findUnique({ where: { key: 'statisticsPassword' } });
    if (!setting) return NextResponse.json({ success: false, message: "Password not set" });

    const isValid = await bcrypt.compare(password, setting.value);
    return NextResponse.json({ success: isValid });
  } catch (error: any) {
    console.error("Error verifying password:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

