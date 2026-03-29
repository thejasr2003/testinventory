import validate from "../auth/validate";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import Papa from "papaparse";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

function generateProductId(name: string, gender: string) {
  const prefix =
    gender.toLowerCase() === "men"
      ? "pm"
      : gender.toLowerCase() === "women"
      ? "pw"
      : "px";

  const cleanName = name.replace(/\s+/g, ""); 
  const last4 = cleanName.slice(-4).toLowerCase();

  const randomDigits = Math.floor(1000 + Math.random() * 9000);

  return `${prefix}${last4}${randomDigits}`;
}


export async function GET(req: Request) {
  try {
    await validate();
  } catch (error: any) {
    console.error("Validation error:", error?.message || error);
    return NextResponse.json(
      { success: false, error: "Unauthorized - Please login again" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); 

  try {
    const whereClause: any = { isDeleted: false };

    if (status) {
      whereClause.status = status; 
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: products }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching products:", error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  await validate();

  try {
    const contentType = req.headers.get("content-type") || "";
    const images: string[] = [];
    let status: string = "available";

    if (contentType.includes("application/json")) {
      const data = await req.json();
      const {
        name,
        sku,
        description,
        price,
        gender,
        category,
        size,
        organizationId,
        status = "available",
        images: dataImages = [],
      } = data;

      const productId = generateProductId(name, gender);

      await prisma.product.create({
        data: {
          id: productId,
          name,
          sku,
          description,
          price,
          gender,
          category,
          size: Array.isArray(size) ? size : [size],
          status,
          images: dataImages,
          organizationId,
        },
      });

      return NextResponse.json({ message: "Product created successfully" });
    }

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();

      const csvFile = formData.get("csv") as File;
      if (csvFile && csvFile.name.endsWith(".csv")) {
        const csvText = await csvFile.text();
        const parsed = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
        });

        const products = parsed.data as any[];

        const organizationId = formData.get("organizationId") as string;
        const category = formData.get("category") as string || "default";
        const gender = formData.get("gender") as string || "unisex";
        const status = formData.get("status")?.toString() || "available";

        const created: string[] = [];
        const skipped: { sku: string, reason: string }[] = [];

        for (const item of products) {
          const name = item.name;
          const description = item.description;
          const price = parseFloat(item.price);
          const sku = item.sku;
          const size = item.size ? item.size.split(",").map((s: string) => s.trim()) : [];

          const productId = generateProductId(name, gender);

          try {
            await prisma.product.create({
              data: {
                id: productId,
                name,
                sku,
                description,
                price,
                gender,
                category,
                size,
                status,
                images: [],
                organizationId,
              },
            });
            created.push(sku);
          } catch (err: any) {
            if (err.code === "P2002" && err.meta?.target?.includes("sku")) {
              console.warn(`SKU already exists: ${sku}`);
              skipped.push({ sku, reason: "SKU already exists" });
              continue;
            }
            console.error("Error importing product:", err);
          }
        }

        return NextResponse.json({
          message: `CSV import finished.`,
          imported: created.length,
          skipped: skipped,
        });
      }

      const name = formData.get("name") as string;
      const sku = formData.get("sku") as string;
      const description = formData.get("description") as string;
      const price = parseFloat(formData.get("price") as string);
      const gender = formData.get("gender") as string;
      const category = formData.get("category") as string;
      const sizeRaw = formData.get("size");
      const size = sizeRaw ? sizeRaw.toString().split(",").map((s) => s.trim()) : [];
      const organizationId = formData.get("organizationId") as string;
      const statusRaw = formData.get("status");
      if (statusRaw) status = statusRaw.toString();

      const files = formData.getAll("images");
      for (const file of files) {
        if (typeof file === "object" && "arrayBuffer" in file) {
          const url = await uploadImageToCloudinary(file, "inventory-products");
          images.push(url);
        }
      }

      const jsonImageList = formData.get("images[]");
      if (jsonImageList) {
        try {
          const parsed = JSON.parse(jsonImageList.toString());
          if (Array.isArray(parsed)) {
            images.push(...parsed);
          }
        } catch (e) {
          console.warn("Failed to parse images[] JSON:", e);
        }
      }

      const productId = generateProductId(name, gender);

      await prisma.product.create({
        data: {
          id: productId,
          name,
          sku,
          description,
          price,
          images,
          gender,
          category,
          size,
          status,
          organizationId,
        },
      });

      return NextResponse.json({ message: "Product created successfully" });
    }

    return NextResponse.json({ message: "Unsupported Content-Type" }, { status: 400 });
  } catch (err: any) {
    if (err.code === "P2002" && err.meta?.target?.includes("sku")) {
      return NextResponse.json({ message: `SKU already exists.` }, { status: 400 });
    }

    console.error("Server error:", err);
    return NextResponse.json({ message: "Failed to create product", error: String(err) }, { status: 500 });
  }
}
