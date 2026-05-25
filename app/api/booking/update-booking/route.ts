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

    // Handle return status update for individual product
    const productLockId = formData.get("productLockId")?.toString();
    const returnStatus = formData.get("returnStatus")?.toString();

    if (productLockId && returnStatus) {
      const productLock = await prisma.productLock.findUnique({ where: { id: productLockId } });
      if (!productLock) {
        return NextResponse.json({ success: false, message: "Product lock not found" }, { status: 404 });
      }

      await prisma.productLock.update({
        where: { id: productLockId },
        data: { returnStatus },
      });

      const updatedBooking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          productLocks: {
            include: { product: true },
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: "Return status updated successfully",
        data: updatedBooking,
      });
    }

    // Parse all fields
    const customerName = formData.get("customerName")?.toString();
    const phoneNumberPrimary = formData.get("phoneNumberPrimary")?.toString();
    const phoneNumberSecondary = formData.get("phoneNumberSecondary")?.toString();
    const notes = formData.get("notes")?.toString();
    const securityDeposit = formData.get("securityDeposit")
      ? parseFloat(formData.get("securityDeposit")!.toString())
      : undefined;
    const advancePayment = formData.get("advancePayment")
      ? parseFloat(formData.get("advancePayment")!.toString())
      : undefined;
    const additionalCharges = formData.get("additionalCharges")
      ? parseFloat(formData.get("additionalCharges")!.toString())
      : undefined;

    const discountType = formData.get("discountType")?.toString();
    const rentalType = formData.get("rentalType")?.toString();
    const invoiceNumber = formData.get("invoiceNumber")
      ? parseInt(formData.get("invoiceNumber")!.toString())
      : undefined;
    const advancePaymentMethod = formData.get("advancePaymentMethod")?.toString();
    const deliverypaymnetMethod = formData.get("deliverypaymnetMethod")?.toString();
    const returnpaymnetMethod = formData.get("returnpaymnetMethod")?.toString();
    const productsString = formData.get("products")?.toString() || "[]";

    let products: any[] = [];
    try {
      products = JSON.parse(productsString);
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid products payload" },
        { status: 400 }
      );
    }

    if (!Array.isArray(products)) {
      return NextResponse.json(
        { success: false, message: "Invalid products payload" },
        { status: 400 }
      );
    }

    if (products.length > 0) {
      for (const p of products) {
        const productExists = await prisma.product.findUnique({ where: { id: p.productId } });
        if (!productExists) {
          return NextResponse.json(
            { message: `Product not found: ID ${p.productId}` },
            { status: 400 }
          );
        }

        if (productExists.status !== "available") {
          return NextResponse.json({
            message: `${productExists.name}: currently ${productExists.status}. Please wait until it becomes available.`,
          }, { status: 400 });
        }

        const existingLock = await prisma.productLock.findFirst({ where: { bookingId, productId: p.productId } });

        if (existingLock) {
          await prisma.productLock.update({
            where: { id: existingLock.id },
            data: {
              deliveryDate: p.deliveryDate ? new Date(p.deliveryDate) : existingLock.deliveryDate,
              returnDate: p.returnDate ? new Date(p.returnDate) : existingLock.returnDate,
              discount: Math.max(0, parseFloat(p.discount || "0") || 0),
            },
          });
        } else {
          await prisma.productLock.create({
            data: {
              bookingId,
              productId: p.productId,
              deliveryDate: new Date(p.deliveryDate),
              returnDate: new Date(p.returnDate),
              discount: Math.max(0, parseFloat(p.discount || "0") || 0),
            },
          });
        }
      }
    }

    const currentLocks = await prisma.productLock.findMany({
      where: { bookingId },
      include: { product: true },
    });

    const effectiveAdvancePayment = advancePayment ?? bookingExists.advancePayment ?? 0;
    const effectiveSecurityDeposit = securityDeposit ?? bookingExists.securityDeposit ?? 0;
    const effectiveAdditionalCharges = additionalCharges ?? bookingExists.additionalCharges ?? 0;

    const totalDiscount = currentLocks.reduce((sum, lock) => sum + Math.max(0, lock.discount || 0), 0);
    const finalProductAmount = currentLocks.reduce((sum, lock) => {
      const unitPrice = lock.product?.price || 0;
      const discountValue = Math.max(0, lock.discount || 0);
      return sum + Math.max(0, unitPrice - discountValue);
    }, 0);

    const rentAmount = Math.max(finalProductAmount + effectiveAdditionalCharges, 0);
    const totalDeposit = effectiveAdvancePayment + effectiveSecurityDeposit;
    const returnAmount = Math.max(0, totalDeposit - rentAmount);

    const updateData: any = {};
    if (customerName) updateData.customerName = customerName;
    if (phoneNumberPrimary) updateData.phoneNumberPrimary = phoneNumberPrimary;
    if (phoneNumberSecondary) updateData.phoneNumberSecondary = phoneNumberSecondary;
    if (notes) updateData.notes = notes;
    updateData.rentAmount = rentAmount;
    updateData.totalDeposit = totalDeposit;
    updateData.securityDeposit = effectiveSecurityDeposit;
    updateData.returnAmount = returnAmount;
    updateData.advancePayment = effectiveAdvancePayment;
    updateData.discount = totalDiscount;
    updateData.additionalCharges = effectiveAdditionalCharges;
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
