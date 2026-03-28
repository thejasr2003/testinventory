import validate from "../../auth/validate";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { uploadImageToCloudinary, deleteImageFromCloudinary } from "@/lib/cloudinary";

export async function GET(req: Request, context: any) {
  await validate();

  const params = await context.params;
  const id = params.id;

  const product = await prisma.product.findFirst({
    where: { id, isDeleted: false },
  });

  if (!product) {
    return NextResponse.json({ message: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ data: product });
}

export async function PUT(req: Request, context: any) {
  await validate();

  const params = await context.params;
  const id = params.id;
  const contentType = req.headers.get("content-type") || "";

  const existingProduct = await prisma.product.findUnique({
    where: { id },
  });

  if (!existingProduct) {
    return NextResponse.json({ message: "Product not found" }, { status: 404 });
  }

  let name = existingProduct.name;
  let sku = existingProduct.sku;
  let description = existingProduct.description;
  let price = existingProduct.price;
  let gender = existingProduct.gender;
  let category = existingProduct.category;
  let size = existingProduct.size;
  let status = existingProduct.status;
  let images = existingProduct.images || [];

  try {
    if (contentType.includes("application/json")) {
      const data = await req.json();

      name = data.name ?? existingProduct.name;
      sku = data.sku ?? existingProduct.sku;
      description = data.description ?? existingProduct.description;
      price = data.price ?? existingProduct.price;
      gender = data.gender ?? existingProduct.gender;
      category = data.category ?? existingProduct.category;
      status = data.status ?? existingProduct.status;

      if (data.size) {
        if (Array.isArray(data.size)) {
          size = data.size.map((s: any) => String(s).trim());
        } else if (typeof data.size === "string") {
          try {
            const parsed = JSON.parse(data.size);
            if (Array.isArray(parsed)) {
              size = parsed.map((s: any) => String(s).trim());
            } else {
              size = [String(parsed).trim()];
            }
          } catch {
            size = [data.size.trim()];
          }
        }
      }

      if (Array.isArray(data.images) && data.images.length > 0) {
        images = data.images;
      }
    }

    else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const getValue = (key: string, fallback: string) =>
        (formData.get(key) as string) || fallback;

      name = getValue("name", existingProduct.name);
      sku = getValue("sku", existingProduct.sku);
      description = getValue("description", existingProduct.description);
      gender = getValue("gender", existingProduct.gender);
      category = getValue("category", existingProduct.category);
      status = getValue("status", existingProduct.status);
      price = parseFloat(
        (formData.get("price") as string) || existingProduct.price.toString()
      );

      const sizes = formData.getAll("size");
      if (sizes.length > 0) {
        size = sizes
          .map((s) => {
            try {
              const parsed = JSON.parse(String(s));
              if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim());
              return String(s).trim();
            } catch {
              return String(s).trim();
            }
          })
          .flat()
          .filter((s) => s !== "");
      }

      const files = formData.getAll("images");
      const newImages: string[] = [];

      if (files.length > 0 && files.some((f) => typeof f === "object" && "arrayBuffer" in f)) {
        if (existingProduct.images && existingProduct.images.length > 0) {
          for (const oldImage of existingProduct.images) {
            try {
              await deleteImageFromCloudinary(oldImage);
            } catch (err) {
              console.warn("Failed to delete old image:", oldImage, err);
            }
          }
        }

        for (const file of files) {
          if (typeof file === "object" && "arrayBuffer" in file) {
            const url = await uploadImageToCloudinary(file, "inventory-products");
            newImages.push(url);
          }
        }

        images = newImages;
      }
    } else {
      return NextResponse.json(
        { message: "Unsupported Content-Type" },
        { status: 400 }
      );
    }

    if (!Array.isArray(size)) size = [String(size)];
    size = size.filter((s) => typeof s === "string" && s.trim() !== "");

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name,
        sku,
        description,
        price,
        gender,
        category,
        size,
        status,
        images,
      },
    });

    return NextResponse.json({
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (err: any) {
    console.error("Error updating product:", err);
    if (err.code === "P2002" && err.meta?.target?.includes("sku")) {
      return NextResponse.json(
        { message: `SKU "${sku}" already exists. Use a different SKU.` },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Failed to update product", error: String(err) },
      { status: 500 }
    );
  }
}


export async function DELETE(req: Request, context: any) {
  await validate();

  const { id } = await context.params;

  const product = await prisma.product.findUnique({ where: { id } });

  if (!product || product.isDeleted) {
    return NextResponse.json({ message: "Product not found" }, { status: 404 });
  }

  const now = new Date();
  const isBooked = await prisma.productLock.findFirst({
    where: {
      productId: id,
      OR: [
        { deliveryDate: { gte: now } },
        { returnDate: { gte: now } },
      ],
    },
  });

  if (isBooked) {
    return NextResponse.json(
      {
        message:
          "This product has future bookings and cannot be deleted.",
      },
      { status: 400 }
    );
  }

  if (product.images && product.images.length > 0) {
    for (const imageUrl of product.images) {
      try {
        await deleteImageFromCloudinary(imageUrl);
      } catch (err) {
        console.warn("Failed to delete image from Cloudinary:", imageUrl, err);
      }
    }
  }

  await prisma.product.update({
    where: { id },
    data: { isDeleted: true },
  });

  return NextResponse.json({ message: "Product deleted successfully" });
}
