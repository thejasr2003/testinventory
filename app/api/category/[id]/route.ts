import validate from "../../auth/validate";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request, ctx: any) {
  await validate();
  const { id } = await ctx.params;

  const cat = await prisma.category.findUnique({ where: { id } });
  if (!cat) return NextResponse.json({ message: "Not found" }, { status: 404 });

  return NextResponse.json({ data: cat });
}

export async function PUT(req: Request, ctx: any) {
  await validate();
  const { id } = await ctx.params;
  const form = await req.formData();

  const name = form.get("name") as string;
  const parentName = form.get("parentName") as string | null;

  const up = await prisma.category.update({
    where: { id },
    data: { name, parentName },
  });

  return NextResponse.json({ message: "Updated", data: up });
}

export async function DELETE(req: Request, ctx: any) {
  await validate();
  const { id } = await ctx.params;

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ message: "Deleted" });
}
