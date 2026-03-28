import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import validate from "../../../auth/validate";

export async function GET(req: NextRequest) {
  await validate();

  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all";
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    const getDateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = getDateOnly(new Date());
    const tomorrow = getDateOnly(new Date(Date.now() + 24 * 60 * 60 * 1000));

    let productLockWhere: any = {};

    if (filter === "today") {
      productLockWhere = { deliveryDate: { gte: today, lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) } };
    } else if (filter === "tomorrow") {
      productLockWhere = { deliveryDate: { gte: tomorrow, lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000) } };
    } else if (filter === "custom" && start && end) {
      // Parse date-only string as local date (avoid relying on Date parsing of "YYYY-MM-DD" which can be treated as UTC)
      const parseDateOnly = (s: string) => {
        const [y, m, d] = s.split("-").map(Number);
        return new Date(y, m - 1, d);
      };

      const startDate = getDateOnly(parseDateOnly(start));
      const endDate = getDateOnly(parseDateOnly(end));
      // make end exclusive to match the behavior used for "today"/"tomorrow"
      productLockWhere = { deliveryDate: { gte: startDate, lt: new Date(endDate.getTime() + 24 * 60 * 60 * 1000) } };
    }

    // If filter is 'all' return all bookings (include all productLocks). Otherwise return only bookings with matching productLocks.
    let bookings;
    if (filter === "all") {
      bookings = await prisma.booking.findMany({
        include: {
          productLocks: {
            include: { product: true }, // include all locks
          },
        },
        orderBy: { createdAt: "asc" },
      });
    } else {
      bookings = await prisma.booking.findMany({
        where: {
          productLocks: {
            some: productLockWhere,
          },
        },
        include: {
          productLocks: {
            where: productLockWhere, // include only matching locks
            include: { product: true },
          },
        },
        orderBy: { createdAt: "asc" },
      });
    }

    // Sort bookings by the latest deliveryDate among their productLocks (descending => latest first)
    const getLatestDeliveryTs = (b: any) => {
      const dates = (b.productLocks || [])
        .map((l: any) => (l.deliveryDate ? new Date(l.deliveryDate).getTime() : NaN))
        .filter(Number.isFinite);
      return dates.length ? Math.max(...dates) : 0;
    };

    (bookings as any[]).sort((a: any, b: any) => getLatestDeliveryTs(b) - getLatestDeliveryTs(a));

    return NextResponse.json({ data: bookings });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
