import { NextResponse } from "next/server";
import { deleteImageFromCloudinary } from "@/lib/cloudinary";
import prisma from "@/lib/prisma"; // ✅ fixed import
import validate from "../../auth/validate";

export async function DELETE(req: Request) {
  try {
    await validate();

    const { imageUrl, productId } = await req.json();

    if (!imageUrl || !productId) {
      return NextResponse.json(
        { message: "Image URL and Product ID required" },
        { status: 400 }
      );
    }

    // 1️⃣ Delete from Cloudinary
    await deleteImageFromCloudinary(imageUrl);

    // 2️⃣ Remove the image from the DB
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    const updatedImages = product.images.filter((url) => url !== imageUrl);

    await prisma.product.update({
      where: { id: productId },
      data: { images: updatedImages },
    });

    return NextResponse.json({
      message: "Image deleted from Cloudinary and DB",
    });
  } catch (error: any) {
    console.error("Error deleting image:", error);
    return NextResponse.json(
      { message: "Failed to delete image", error: String(error) },
      { status: 500 }
    );
  }
}
