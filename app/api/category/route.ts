import validate from "../auth/validate";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  await validate();

  const { searchParams } = new URL(req.url);
  const parent = searchParams.get("parentName");

  const data = await prisma.category.findMany({
    where: parent ? { parentName: parent } : {},
    orderBy: { createdAt: "desc" },
  });

  if (data.length === 0) {
    return NextResponse.json(
      { message: "No categories found", data: [] },
      { status: 200 }
    );
  }

  return NextResponse.json({ data }, { status: 200 });
}

export async function POST(req: Request) {
  await validate();
  const form = await req.formData();

  const name = form.get("name") as string;
  const parentName = form.get("parentName") as string | null;

  try {
    const data = await prisma.category.create({
      data: { name, parentName },
    });

    return NextResponse.json({ message: "Created", data });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json(
        { message: "Category name already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}


