import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import validate from "../../auth/validate";

const prisma = new PrismaClient();

export async function PUT(req: NextRequest) {
  await validate();

  try {
    const contentType = req.headers.get("content-type") || "";
    let data: any = {};

    if (contentType.includes("application/json")) {
      data = await req.json();
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();

      data.id = formData.get("id")?.toString();
      data.organizationName = formData.get("organizationName")?.toString();
      data.ownerName = formData.get("ownerName")?.toString();
      data.description = formData.get("description")?.toString();
      data.address = formData.get("address")?.toString();
      const billingRules = formData.get("billingRules");
      data.billingRules = billingRules ? JSON.parse(billingRules.toString()) : undefined;

      const isActive = formData.get("isActive");
      if (isActive !== null) data.isActive = isActive.toString() === "true";

      const contactNumber = formData.get("contactNumber");
      if (contactNumber) data.contactNumber = contactNumber.toString();

      const email = formData.get("email");
      if (email) data.email = email.toString();

      const activeTill = formData.get("activeTill");
      if (activeTill) data.activeTill = new Date(activeTill.toString());

  
      const logoFile = formData.get("logo") as File;
      if (logoFile && typeof logoFile === "object" && "arrayBuffer" in logoFile) {
        const logoUrl = await uploadImageToCloudinary(logoFile, "organization-logos");
        data.logo = logoUrl;
      }
    }

    if (!data.id) {
      return NextResponse.json(
        { success: false, message: "Organization ID is required" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    const fields = [
      "organizationName",
      "ownerName",
      "description",
      "address",
      "billingRules",
      "isActive",
      "contactNumber",
      "email",
      "activeTill",
      "logo",
    ];

    for (const field of fields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    const updated = await prisma.organization.update({
      where: { id: data.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating organization:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update organization" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
