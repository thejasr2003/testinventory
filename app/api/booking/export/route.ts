import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import validate from "../../auth/validate";
import ExcelJS from "exceljs";

export async function GET(req: NextRequest) {
  await validate();

  try {
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("from_date");
    const toDate = searchParams.get("to_date");


    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate
      ? new Date(new Date(toDate).setHours(23, 59, 59, 999))
      : null;

    const bookings = await prisma.booking.findMany({
      where: {
        createdAt: {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        },
        isDeleted: false,
      },
      include: {
        productLocks: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Bookings");

    const headers = [
      "Invoice No.",
      "Booking Date",
      "Customer Name",
      "Mobile No.",
      "Alternate No.",
      "Amount",
      "Deposit",
    ];
    sheet.addRow(headers);

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: "center" };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFF99" },
      };
    });

    const rows: any[] = [];

    bookings.forEach((b) => {
      const totalAmount = b.productLocks.reduce(
        (sum, pl) => sum + (pl.product?.price || 0),
        0
      );

      rows.push({
        invoiceNumber: b.invoiceNumber || "",
        bookingDate: b.createdAt,
        customerName: b.customerName || "",
        phoneNumberPrimary: b.phoneNumberPrimary || "",
        phoneNumberSecondary: b.phoneNumberSecondary || "",
        amount: totalAmount,
        deposit: b.securityDeposit || 0,
      });
    });

    // ✅ Sort by booking date (createdAt)
    rows.sort((a, b) => a.bookingDate.getTime() - b.bookingDate.getTime());

    rows.forEach((r) =>
      sheet.addRow([
        r.invoiceNumber,
        r.bookingDate.toLocaleDateString("en-GB"), // dd/mm/yyyy format
        r.customerName,
        r.phoneNumberPrimary,
        r.phoneNumberSecondary,
        r.amount,
        r.deposit,
      ])
    );

    // ✅ Format ₹ columns
    sheet.getColumn(6).numFmt = '"₹"#,##0.00';
    sheet.getColumn(7).numFmt = '"₹"#,##0.00';

    // ✅ Auto column width
    sheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const value = cell.value ? cell.value.toString() : "";
        maxLength = Math.max(maxLength, value.length);
      });
      column.width = maxLength + 2;
    });

    // ✅ Add border to all cells
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const formatDate = (d: string | null) => d ?? "all";
    const fileName = `bookings_export_${formatDate(fromDate)}_to_${formatDate(
      toDate
    )}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting bookings:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
