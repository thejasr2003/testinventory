import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import validate from "../../auth/validate";

export async function GET(req: NextRequest, context: { params: { id: string } }) {
  await validate();

  const { id } = await context.params;

  try {
    const productLocks = await prisma.productLock.findMany({
      where: { productId: id },
      select: {
        bookingId: true,
        productId: true,
        deliveryDate: true,
        returnDate: true,
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
          },
        },
      },
    });

    if (productLocks.length === 0) {
      return NextResponse.json(
        { message: "No bookings found for this product" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: productLocks });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(req: NextRequest, context: { params: { id: string } }) {
  await validate();

  const { id } = context.params;

  if (!id) {
    return NextResponse.json({ success: false, message: "Please check Product ID" }, { status: 400 });
  }

  try {
    const existingLock = await prisma.productLock.findUnique({ where: { id } });

    if (!existingLock) {
      return NextResponse.json({ success: false, message: "Booked product not found" }, { status: 404 });
    }

    const now = new Date();
    if (existingLock.deliveryDate > now) {
      return NextResponse.json({
        success: false,
        message: "This product is booked for a future date and cannot be deleted.",
      }, { status: 400 });
    }

    await prisma.productLock.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Product removed from booking successfully" });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}