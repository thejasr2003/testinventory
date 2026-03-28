import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import validate from "../../auth/validate";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  await validate();

  const { id } = await context.params; 

  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { productLocks: { include: { product: true } } },
    });

    if (!booking) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({ data: booking });
  } catch (error) {
    console.error("Error fetching booking:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await validate();

  const { id } = await context.params;

  try {
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      return NextResponse.json(
        { message: `Booking ID not found` },
        { status: 404 }
      );
    }

    await prisma.productLock.deleteMany({ where: { bookingId: id } });

    await prisma.booking.delete({ where: { id } });

    return NextResponse.json({ message: "Booking deleted successfully" });
  } catch (error) {
    console.error("Error deleting booking:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}