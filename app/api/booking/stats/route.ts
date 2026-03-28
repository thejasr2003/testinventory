import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import validate from "../../auth/validate";

function getWeekRange(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 (Sun) - 6 (Sat)
  const diffToMon = (day + 6) % 7; // Mon = 0
  const start = new Date(d);
  start.setDate(d.getDate() - diffToMon);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  const startStr = start.toLocaleDateString("en-US", options);
  const endStr = end.toLocaleDateString("en-US", options);
  return `${startStr} - ${endStr}`;
}

export async function GET(req: NextRequest) {
  await validate();
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json({ message: "Please provide 'from' and 'to' dates" }, { status: 400 });
    }

    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const locks = await prisma.productLock.findMany({
      where: {
        booking: {
          isDeleted: false,
          createdAt: { gte: fromDate, lte: toDate },
        },
      },
      include: { booking: true, product: true },
    });

    const weeklyMap: Record<string, { revenue: number; bookings: Set<string> }> = {};

    locks.forEach((l) => {
      const createdAt = l.booking?.createdAt;
      if (!createdAt) return;
      const weekRange = getWeekRange(new Date(createdAt));
      if (!weeklyMap[weekRange]) weeklyMap[weekRange] = { revenue: 0, bookings: new Set() };
      weeklyMap[weekRange].revenue += l.product?.price || 0;
      weeklyMap[weekRange].bookings.add(l.bookingId);
    });

    const weeklyStats = Object.entries(weeklyMap)
      .sort(([a], [b]) => new Date(a.split(" - ")[0]).getTime() - new Date(b.split(" - ")[0]).getTime())
      .map(([week, data]) => ({
        week,
        revenue: data.revenue,
        bookings: data.bookings.size,
      }));

    const bookingsMap: Record<string, { booking: any; products: any[] }> = {};
    locks.forEach((lock) => {
      if (!bookingsMap[lock.bookingId]) bookingsMap[lock.bookingId] = { booking: lock.booking, products: [] };
      bookingsMap[lock.bookingId].products.push(lock.product);
    });

    // Calculate totalRevenue using product prices + additionalCharges - discount
    const totalRevenue = Object.values(bookingsMap).reduce((sum, b) => {
      const productSum = b.products.reduce((s, p) => s + (p.price || 0), 0);
      const additionalCharges = b.booking.additionalCharges || 0;
      const discount = b.booking.discount || 0;
      return sum + productSum + additionalCharges - discount;
    }, 0);

    const totalBookingCount = Object.keys(bookingsMap).length;

    const revenueInCash = Object.values(bookingsMap).reduce((sum, b) => {
      if (b.booking.advancePaymentMethod === "Cash") {
        const productSum = b.products.reduce((s, p) => s + (p.price || 0), 0);
        return sum + productSum + (b.booking.additionalCharges || 0) - (b.booking.discount || 0);
      }
      return sum;
    }, 0);

    const revenueInBank = Object.values(bookingsMap).reduce((sum, b) => {
      if (b.booking.advancePaymentMethod === "Card") {
        const productSum = b.products.reduce((s, p) => s + (p.price || 0), 0);
        return sum + productSum + (b.booking.additionalCharges || 0) - (b.booking.discount || 0);
      }
      return sum;
    }, 0);

    return NextResponse.json({
      weeklyStats,
      total: { totalRevenue, totalBookingCount, revenue: { revenueInCash, revenueInBank } },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
