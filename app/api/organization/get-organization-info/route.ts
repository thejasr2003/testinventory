import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import validate from "../../auth/validate";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  // await validate();
  try {
    const organizations = await prisma.organization.findMany();

    if (!organizations || organizations.length === 0) {
      return NextResponse.json(
        { success: false, message: "No organizations found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: organizations });
  } catch (error) {
    console.error("Error fetching organization info:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
