import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ success: false, message: "Both current and new passwords are required" });
    }

    const setting = await prisma.settings.findUnique({
      where: { key: "statisticsPassword" },
    });

    if (!setting) {
      return NextResponse.json({ success: false, message: "Statistics password not set" });
    }

    const valid = await bcrypt.compare(currentPassword, setting.value);
    if (!valid) {
      return NextResponse.json({ success: false, message: "Current password is incorrect." });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.settings.update({
      where: { key: "statisticsPassword" },
      data: { value: hashed },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error changing statistics password:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
