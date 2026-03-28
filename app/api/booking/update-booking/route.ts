import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import validate from "../../auth/validate";

export async function PUT(req: NextRequest) {
  await validate();

  try {
    const formData = await req.formData();

    const bookingId = formData.get("bookingId")?.toString();
    if (!bookingId) {
      return NextResponse.json({ success: false, message: "Missing bookingId" }, { status: 400 });
    }

    const bookingExists = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!bookingExists) {
      return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
    }

    // Parse all fields
    const customerName = formData.get("customerName")?.toString();
    const phoneNumberPrimary = formData.get("phoneNumberPrimary")?.toString();
    const phoneNumberSecondary = formData.get("phoneNumberSecondary")?.toString();
    const notes = formData.get("notes")?.toString();
    const rentAmount = formData.get("rentAmount") ? parseFloat(formData.get("rentAmount")!.toString()) : undefined;
    const totalDeposit = formData.get("totalDeposit") ? parseFloat(formData.get("totalDeposit")!.toString()) : undefined;
    const securityDeposit = formData.get("securityDeposit") ? parseFloat(formData.get("securityDeposit")!.toString()) : undefined;
    const returnAmount = formData.get("returnAmount") ? parseFloat(formData.get("returnAmount")!.toString()) : undefined;
    const advancePayment = formData.get("advancePayment") ? parseFloat(formData.get("advancePayment")!.toString()) : undefined;
    const discount = formData.get("discount") ? parseFloat(formData.get("discount")!.toString()) : undefined;
    const additionalCharges = formData.get("additionalCharges") ? parseFloat(formData.get("additionalCharges")!.toString()) : undefined;

    const discountType = formData.get("discountType")?.toString();
    const rentalType = formData.get("rentalType")?.toString();
    const invoiceNumber = formData.get("invoiceNumber") ? parseInt(formData.get("invoiceNumber")!.toString()) : undefined;
    const advancePaymentMethod = formData.get("advancePaymentMethod")?.toString();
    const deliverypaymnetMethod = formData.get("deliverypaymnetMethod")?.toString();
    const returnpaymnetMethod = formData.get("returnpaymnetMethod")?.toString();
    const productsString = formData.get("products")?.toString() || "[]";

    const updateData: any = {};
    if (customerName) updateData.customerName = customerName;
    if (phoneNumberPrimary) updateData.phoneNumberPrimary = phoneNumberPrimary;
    if (phoneNumberSecondary) updateData.phoneNumberSecondary = phoneNumberSecondary;
    if (notes) updateData.notes = notes;
    if (rentAmount !== undefined) updateData.rentAmount = rentAmount;
    if (totalDeposit !== undefined) updateData.totalDeposit = totalDeposit;
    if (securityDeposit !== undefined) updateData.securityDeposit = securityDeposit;
    if (returnAmount !== undefined) updateData.returnAmount = returnAmount;
    if (advancePayment !== undefined) updateData.advancePayment = advancePayment;
    if (discount !== undefined) updateData.discount = discount;
    if (additionalCharges !== undefined) updateData.additionalCharges = additionalCharges;
    if (discountType) updateData.discountType = discountType;
    if (rentalType) updateData.rentalType = rentalType;
    if (invoiceNumber !== undefined) updateData.invoiceNumber = invoiceNumber;
    if (advancePaymentMethod) updateData.advancePaymentMethod = advancePaymentMethod;
    if (deliverypaymnetMethod) updateData.deliverypaymnetMethod = deliverypaymnetMethod;
    if (returnpaymnetMethod) updateData.returnpaymnetMethod = returnpaymnetMethod;

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: updateData,
    });

    const products = JSON.parse(productsString);
    if (Array.isArray(products) && products.length > 0) {
      for (const p of products) {
        const productExists = await prisma.product.findUnique({ where: { id: p.productId } });
        if (!productExists) {
          return NextResponse.json(
            { message: `Product not found: ID ${p.productId}` },
            { status: 400 }
          );
        }

        const productName = productExists.name;

        if (productExists.status !== "available") {
          return NextResponse.json({
            message: `${productName}: currently ${productExists.status}. Please wait until it becomes available.`,
          }, { status: 400 });
        }

        const existingLock = await prisma.productLock.findFirst({ where: { bookingId, productId: p.productId } });

        if (existingLock) {
          await prisma.productLock.update({
            where: { id: existingLock.id },
            data: {
              deliveryDate: p.deliveryDate ? new Date(p.deliveryDate) : existingLock.deliveryDate,
              returnDate: p.returnDate ? new Date(p.returnDate) : existingLock.returnDate,
            },
          });
        } else {
          await prisma.productLock.create({
            data: {
              bookingId,
              productId: p.productId,
              deliveryDate: new Date(p.deliveryDate),
              returnDate: new Date(p.returnDate),
            },
          });
        }
      }
    }

    const bookingWithProducts = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { productLocks: true },
    });

    return NextResponse.json({
      success: true,
      message: "Booking updated successfully",
      data: bookingWithProducts,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
