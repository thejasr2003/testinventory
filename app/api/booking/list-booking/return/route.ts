import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import validate from "../../../auth/validate";

export async function GET(req: NextRequest) {
  await validate();

  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "tomorrow";
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    const getDateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = getDateOnly(new Date());
    const tomorrow = getDateOnly(new Date(Date.now() + 24 * 60 * 60 * 1000));

    let productLockWhere: any = {};

    if (filter === "today") {
      productLockWhere = { returnDate: { gte: today, lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) } };
    } else if (filter === "tomorrow") {
      productLockWhere = { returnDate: { gte: tomorrow, lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000) } };
    } else if (filter === "custom" && start && end) {
      productLockWhere = { returnDate: { gte: new Date(start), lte: new Date(end) } };
    }

    const bookings = await prisma.booking.findMany({
      where: {
        productLocks: {
          some: productLockWhere,
        },
      },
      include: {
        productLocks: {
          where: productLockWhere,
          include: { product: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ data: bookings });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
