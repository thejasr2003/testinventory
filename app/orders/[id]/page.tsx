"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Printer, Copy, Download, MessageCircle, Plus } from "lucide-react";
import "./viewOrder.css";

import { jsPDF } from "jspdf";

interface ProductLock {
  id: string;
  deliveryDate: string;
  returnDate: string
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    images: string[];
    size: string[];
  };
}

interface OrderDetails {
  id: string;
  customerName: string;
  phoneNumberPrimary: string;
  phoneNumberSecondary: string;
  notes?: string;
  rentAmount: number;
  securityDeposit: number;
  returnAmount: number;
  advancePayment: number;
  discount: number;
  discountType: string;
  additionalCharges?: number; 
  invoiceNumber: number;
  createdAt: string;
  totalDeposit: number;
  productLocks: ProductLock[];
}

interface OrganizationInfo {
  organizationName: string;
  address: string;
  contactNumber: string;
  email: string;
}

export default function ViewOrderPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [organizationInfo, setOrganizationInfo] = useState<OrganizationInfo | null>(null);

  useEffect(() => {
    async function fetchOrderAndOrganizationInfo() {
      try {
        const resOrder = await fetch(`/api/booking/${id}`);
        const dataOrder = await resOrder.json();
        if (dataOrder?.data) setOrder(dataOrder.data);

        const resOrganization = await fetch("/api/organization/get-organization-info");
        const dataOrganization = await resOrganization.json();
        setOrganizationInfo(dataOrganization.data[0]);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    }
    fetchOrderAndOrganizationInfo();
  }, [id]);

  if (!order || !organizationInfo)
    return (
      <div className="view-order-container">
        <div className="loading-screen">
          <div className="loader"></div> &nbsp; Loading...
        </div>
      </div>
    );

  const productAmount = order.productLocks.reduce((sum, lock) => {
    const unitPrice = lock.product?.price || 0;
    const discountValue = Math.max(0, Number((lock as any).discount ?? 0));
    return sum + Math.max(0, unitPrice - discountValue);
  }, 0);
  const additionalCharges = order.additionalCharges || 0;
  const securityDeposit = order.securityDeposit;
  const discount = order.discount;
  const rentamount = productAmount + additionalCharges;
  const total = rentamount;
  const returnAmount = Math.max(0, securityDeposit + order.advancePayment - total);

  const loadImageAsDataUrl = async (url?: string): Promise<string | null> => {
    if (!url) return null;

    if (url.startsWith("data:")) {
      return url;
    }

    try {
      const response = await fetch(url, { mode: "cors" });
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const blob = await response.blob();
      const reader = new FileReader();

      const dataUrl = await new Promise<string | null>((resolve) => {
        reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });

      if (dataUrl) {
        return dataUrl;
      }
    } catch {
      // Fallback below for environments that can still load the image directly.
    }

    return await new Promise<string | null>((resolve) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        try {
          const size = 240;
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const context = canvas.getContext("2d");

          if (!context) {
            resolve(null);
            return;
          }

          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, size, size);

          const ratio = Math.min(size / image.naturalWidth, size / image.naturalHeight);
          const drawWidth = image.naturalWidth * ratio;
          const drawHeight = image.naturalHeight * ratio;
          const offsetX = (size - drawWidth) / 2;
          const offsetY = (size - drawHeight) / 2;

          context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
          resolve(canvas.toDataURL("image/jpeg", 0.98));
        } catch {
          resolve(null);
        }
      };
      image.onerror = () => resolve(null);
      image.src = url;
    });
  };

  const generatePDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let currentY = 20;

    const formatCurrency = (amount: number) =>
      `Rs.${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

    const imageDataUrls = await Promise.all(
      order.productLocks.map((lock) => loadImageAsDataUrl(lock.product.images?.[0]))
    );

    const logo = new Image();
    logo.src = "/icons/icon-512x512.png";

    const logoSize = 22;
    const logoX = margin;
    const logoY = currentY;

    doc.addImage(logo, "PNG", logoX, logoY, logoSize, logoSize);

    doc.setDrawColor(200);
    doc.setLineWidth(0.6);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, "S");

    const textX = logoX + logoSize + 5;
    let textY = logoY + 4;

    doc.setFont("helvetica", "bold").setFontSize(14).setTextColor(0);
    doc.text(organizationInfo.organizationName, textX, textY);

    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(80);
    textY += 6;
    const addressLines = doc.splitTextToSize(organizationInfo.address, 80);

    doc.text(addressLines[0], textX, textY);
    textY += 6;

    if (addressLines[1]) {
      doc.text(addressLines[1], textX, textY);
      textY += 6;
    }

    doc.text(`Email: ${organizationInfo.email}`, textX, textY);
    textY += 6;
    doc.text(`Phone: ${organizationInfo.contactNumber}`, textX, textY);

    doc.setFont("helvetica", "normal").setFontSize(12).setTextColor(0);
    doc.text(`Invoice #: ${order.invoiceNumber}`, pageWidth - margin, logoY + 4, { align: "right" });
    doc.text(
      `Date: ${new Date(order.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}`,
      pageWidth - margin,
      logoY + 10,
      { align: "right" }
    );

    currentY = logoY + logoSize + 15;

    const billedBoxHeight = 30;
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, currentY, pageWidth - 2 * margin, billedBoxHeight, "F");
    doc.setTextColor(0).setFont("helvetica", "bold").setFontSize(11);
    doc.text("Billed To:", margin + 5, currentY + 8);
    doc.setFont("helvetica", "normal").setFontSize(10);
    doc.text(order.customerName, margin + 5, currentY + 15);
    doc.text(`${order.phoneNumberPrimary} , ${order.phoneNumberSecondary}`, margin + 5, currentY + 22);

    currentY += billedBoxHeight + 5;

    const columnWidths = [12, 24, 38, 22, 18, 24, 24, 18];
    const columnLabels = ["#", "Image", "Product Name", "SKU", "Size", "Del. Date", "Return Date", "Amount"];

    const drawCell = (
      x: number,
      y: number,
      width: number,
      height: number,
      text?: string,
      align: "left" | "center" | "right" = "left",
      fontStyle: "normal" | "bold" = "normal",
      textColor: [number, number, number] = [0, 0, 0],
      fillColor?: [number, number, number]
    ) => {
      if (fillColor) {
        doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
        doc.rect(x, y, width, height, "F");
      }

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.rect(x, y, width, height);

      if (!text) return;

      doc.setFont("helvetica", fontStyle).setFontSize(8.5).setTextColor(textColor[0], textColor[1], textColor[2]);
      const lines = doc.splitTextToSize(text, width - 6);
      const textY = y + 6 + (height - lines.length * 5) / 2;

      if (align === "center") {
        doc.text(lines, x + width / 2, textY, { align: "center" });
      } else if (align === "right") {
        doc.text(lines, x + width - 3, textY, { align: "right" });
      } else {
        doc.text(lines, x + 3, textY);
      }
    };

    const tableYStart = currentY;
    let tableY = currentY;

    const drawHeader = () => {
      const headerHeight = 12;
      const headerX = margin;

      doc.setFillColor(245, 245, 245);
      doc.rect(headerX, tableY, pageWidth - margin * 2, headerHeight, "F");

      let columnX = headerX;
      columnLabels.forEach((label, index) => {
        const align = index === 0 || index === 1 || index === 4 || index === 5 || index === 6 || index === 7 ? "center" : "left";
        drawCell(columnX, tableY, columnWidths[index], headerHeight, label, align, "bold");
        columnX += columnWidths[index];
      });

      tableY += headerHeight;
    };

    const getCellHeight = (lines: string[]) => Math.max(30, lines.length * 5 + 10);

    const ensurePageSpace = (rowHeight: number) => {
      if (tableY + rowHeight > pageHeight - 20) {
        doc.addPage();
        tableY = 20;
        drawHeader();
      }
    };

    drawHeader();

    order.productLocks.forEach((lock, index) => {
      const imageData = imageDataUrls[index];
      const deliveryDate = new Date(lock.deliveryDate).toLocaleDateString("en-GB");
      const returnDate = new Date(lock.returnDate).toLocaleDateString("en-GB");
      const sizeText = lock.product.size?.join(", ") || "N/A";
      const lockDiscount = Math.max(0, Number((lock as any).discount ?? 0));
      const finalPrice = Math.max(0, (lock.product.price || 0) - lockDiscount);

      const productNameLines = doc.splitTextToSize(lock.product.name, columnWidths[2] - 6);
      const skuLines = doc.splitTextToSize(lock.product.sku, columnWidths[3] - 6);
      const sizeLines = doc.splitTextToSize(sizeText, columnWidths[4] - 6);
      const dateLines = doc.splitTextToSize(deliveryDate, columnWidths[5] - 6);
      const returnLines = doc.splitTextToSize(returnDate, columnWidths[6] - 6);
      const amountText = formatCurrency(finalPrice);
      const rowHeight = Math.max(
        30,
        getCellHeight(productNameLines),
        getCellHeight(skuLines),
        getCellHeight(sizeLines),
        getCellHeight(dateLines),
        getCellHeight(returnLines)
      );

      ensurePageSpace(rowHeight);

      let columnX = margin;
      const rowY = tableY;

      doc.setFillColor(255, 255, 255);
      doc.rect(columnX, rowY, pageWidth - margin * 2, rowHeight, "F");

      drawCell(columnX, rowY, columnWidths[0], rowHeight, String(index + 1), "center", "normal");
      columnX += columnWidths[0];

      if (imageData) {
        const imageWidth = 20;
        const imageHeight = 20;
        const imageX = columnX + (columnWidths[1] - imageWidth) / 2;
        const imageY = rowY + (rowHeight - imageHeight) / 2;
        doc.addImage(imageData, "JPEG", imageX, imageY, imageWidth, imageHeight);
      }
      drawCell(columnX, rowY, columnWidths[1], rowHeight, "", "center", "normal");
      columnX += columnWidths[1];

      drawCell(columnX, rowY, columnWidths[2], rowHeight, lock.product.name, "left", "normal");
      columnX += columnWidths[2];

      drawCell(columnX, rowY, columnWidths[3], rowHeight, lock.product.sku, "center", "normal");
      columnX += columnWidths[3];

      drawCell(columnX, rowY, columnWidths[4], rowHeight, sizeText, "center", "normal");
      columnX += columnWidths[4];

      drawCell(columnX, rowY, columnWidths[5], rowHeight, deliveryDate, "center", "normal");
      columnX += columnWidths[5];

      drawCell(columnX, rowY, columnWidths[6], rowHeight, returnDate, "center", "normal");
      columnX += columnWidths[6];

      drawCell(columnX, rowY, columnWidths[7], rowHeight, amountText, "right", "normal");

      tableY += rowHeight;
    });

    currentY = tableY + 10;

    if (currentY + 90 > pageHeight - 20) {
      doc.addPage();
      currentY = 20;
    }

    const boxWidth = 80;
    const boxHeight = 32;
    const leftX = margin;
    const rightX = pageWidth - margin - boxWidth;
    const boxY = currentY;

    doc.setDrawColor(200);
    doc.setLineWidth(0.4);
    doc.setFont("helvetica", "normal").setFontSize(9);

    const step = 6; // compact spacing
    const gapAfterDivider = 3; // extra gap 
    doc.roundedRect(leftX, boxY, boxWidth, boxHeight, 2, 2);

    doc.text("Adv. Payment:", leftX + 4, boxY + step);
    doc.text(formatCurrency(order.advancePayment), leftX + boxWidth - 4, boxY + step, { align: "right" });

    doc.text("Security Deposit:", leftX + 4, boxY + step * 2);
    doc.text(formatCurrency(order.securityDeposit), leftX + boxWidth - 4, boxY + step * 2, { align: "right" });

    const dividerY_Left = boxY + step * 2 + gapAfterDivider;
    doc.line(leftX + 3, dividerY_Left, leftX + boxWidth - 3, dividerY_Left);
    doc.setFont("helvetica", "bold");
    doc.text("(d) Total Deposit:", leftX + 4, dividerY_Left + step);
    doc.text(formatCurrency(order.securityDeposit + order.advancePayment), leftX + boxWidth - 4, dividerY_Left + step, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.text("Return Amount (c - d):", leftX + 4, dividerY_Left + step * 2);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(returnAmount), leftX + boxWidth - 4, dividerY_Left + step * 2, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.roundedRect(rightX, boxY, boxWidth, boxHeight, 2, 2);

    doc.text("(a) Rent Amount:", rightX + 4, boxY + step);
    doc.text(formatCurrency(rentamount), rightX + boxWidth - 4, boxY + step, { align: "right" });

    let discountLineY = boxY + step * 2;
    if (discount > 0) {
      doc.text("(b) Discount:", rightX + 4, discountLineY);
      doc.text(`- ${formatCurrency(discount)}`, rightX + boxWidth - 4, discountLineY, { align: "right" });
    } else {
      discountLineY -= step; // Move divider up if no discount
    }
    const dividerY_Right = discountLineY + gapAfterDivider;
    doc.line(rightX + 3, dividerY_Right, rightX + boxWidth - 3, dividerY_Right);
    doc.setFont("helvetica", "bold");
    doc.text("(c) Total Rent:", rightX + 4, dividerY_Right + step);
    doc.text(formatCurrency(total), rightX + boxWidth - 4, dividerY_Right + step, { align: "right" });

    currentY = boxY + boxHeight + 10; 

    if (order.notes) {
      doc.setFont("helvetica", "bold").setFontSize(11);
      doc.text("Special Note:", margin, currentY);

      currentY += 8;

      doc.setFont("helvetica", "normal").setFontSize(10);
      const noteText = doc.splitTextToSize(order.notes, pageWidth - margin * 2);
      doc.text(noteText, margin, currentY);
      currentY += (noteText.length * 6) + 14;
    }

    currentY += 5;

    if (currentY + 80 > pageHeight - 30) {
      doc.addPage();
      currentY = 20;
    }

    const termsList = [
      "1. Extra Day Charge: Rs.250 will be charged per gown or blazer for each extra day.",
      "2. Dress Care: Dresses must be returned clean and without any damage. Do not use fire bombs, cold bombs, or color bombs.",
      "3. Damage Fee: Minimum charge of Rs.2,000 will apply for any damage.",
      "4. Pickup & Return: Customers must handle collection and return of dresses.",
      "5. Delivery Charges: All courier or delivery costs (Dunzo, Swiggy, etc.) must be paid by the customer for both pickup and return.",
      "6. No refund of advance payment on any booking cancellation."
    ];

    const boxWidthFull = pageWidth - margin * 2;
    if (currentY + 70 > pageHeight - 30) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFillColor(255, 249, 234);
    doc.roundedRect(margin, currentY, boxWidthFull, 70, 4, 4, "F");
    doc.setDrawColor(255, 171, 0);
    doc.setLineWidth(1.5);
    doc.line(margin + 2, currentY + 5, margin + 2, currentY + 65);

    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text("Terms & Conditions:", margin + 10, currentY + 12);

    currentY += 20;
    doc.setFont("helvetica", "normal").setFontSize(9);

    termsList.forEach((line) => {
      const wrapped = doc.splitTextToSize(line, boxWidthFull - 28);
      doc.circle(margin + 8, currentY - 2, 1.3, "F"); 
      doc.text(wrapped, margin + 14, currentY);
      currentY += wrapped.length * 5 + 3;
    });
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setDrawColor(220);
    doc.line(margin, footerY - 6, pageWidth - margin, footerY - 6);
    doc.setFont("helvetica", "italic").setFontSize(10).setTextColor(120);
    doc.text("Thanks You Visit Again!", pageWidth / 2, footerY, { align: "center" });
    return doc;
  };

  const handleDownload = async () => {
    const doc = await generatePDF();
    doc.save(`invoice_${order.invoiceNumber}.pdf`);
  };

  const handlePrint = async () => {
    const doc = await generatePDF();
    const blobUrl = doc.output("bloburl");
    window.open(blobUrl, "_blank");
  };

  const handleWhatsappShare = () => {
    if (!order) return;

    const phoneNumber = order.phoneNumberPrimary.startsWith("+")
      ? order.phoneNumberPrimary.slice(1)
      : order.phoneNumberPrimary;

    const baseUrl = window.location.origin;
    const receiptLink = `${baseUrl}/e-receipt/${order.id}`;

    const message = `👉 *Invoice #${order.invoiceNumber} is Ready!*\n\nHello *${order.customerName}*,\n\nThank you for choosing our service.\n\n *Please find the invoice attached:*\n${receiptLink}\n\nIf you have any questions, feel free to contact us.`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

    window.open(whatsappUrl, "_blank");
  };

  const handleCopy = async () => {
    if (!order) return;

    const baseUrl = window.location.origin;
    const receiptLink = `${baseUrl}/e-receipt/${order.id}`;

    const message = `👉 *Invoice #${order.invoiceNumber} is Ready!*\n\nHello *${order.customerName}*,\n\nThank you for choosing our service.\n\n*Please find the invoice attached:*\n${receiptLink}\n\nIf you have any questions, feel free to contact us.`;

    try {
      await navigator.clipboard.writeText(message);
      alert("Invoice message copied");
    } catch (err) {
      console.error("Failed to copy:", err);
      alert("Failed to copy message!");
    }
  };

  return (
    <div className="view-order-container">
      <div className="view-header">
        <button className="back-btn" onClick={() => router.push("/orders")}>
          <ArrowLeft size={18} /> Orders
        </button>
        <div className="action-buttons">
          <button className="create-booking" onClick={() => router.push("/create-booking")}>
            <Plus size={16} /> Create Booking
          </button>
          <button className="whatsapp" onClick={handleWhatsappShare}>
            <MessageCircle size={16} /> Share on Whatsapp
          </button>
          <button className="copy" onClick={handleCopy}>
            <Copy size={16} /> Copy
          </button>
          <button className="print" onClick={handlePrint}>
            <Printer size={16} /> Print Invoice
          </button>
          <button className="download" onClick={handleDownload}>
            <Download size={16} /> Download
          </button>
        </div>
      </div>

      <div className="invoice-card">
        <div className="invoice-header">
          <h4>Invoice # {order.invoiceNumber}</h4>
          <span className="date">
            {new Date(order.createdAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>

        <div className="customer-details">
          <p className="name">{order.customerName}</p>
          <p>{order.phoneNumberPrimary} | {order.phoneNumberSecondary}</p>
        </div>

        <div className="table-responsive">
        <table className="product-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Image</th>
              <th>Product Name</th>
              <th>SKU</th>
              <th>Size</th>
              <th>Delivery Date</th>
              <th>Return Date</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.productLocks.map((lock, index) => (
              <tr key={lock.id}>
                <td>{index + 1}</td>
                <td>
                  {lock.product.images && lock.product.images.length > 0 ? (
                    <img
                      src={lock.product.images[0]}
                      alt={lock.product.name}
                      className="invoice-product-image"
                    />
                  ) : (
                    <span>No Image</span>
                  )}
                </td>
                <td>{lock.product.name}</td>
                <td>{lock.product.sku}</td>
                <td>{lock.product.size?.join(", ") || "N/A"}</td>
                <td>{new Date(lock.deliveryDate).toLocaleDateString("en-GB")}</td>
                <td>{new Date(lock.returnDate).toLocaleDateString("en-GB")}</td>
                <td>₹{Math.max(0, (lock.product.price || 0) - Math.max(0, Number((lock as any).discount ?? 0)))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        <div className="footer-section">
          <div className="notes">
            <strong>Notes:</strong> {order.notes || "N/A"}
          </div>

          <div className="payment-summary">
            <div className="payment-box">
              <div>
                <span>Adv. Payment:</span>
                <span className="amount">₹{order.advancePayment}</span>
              </div>
              <div>
                <span>Security Deposite:</span>
                <span>₹{securityDeposit}</span>
              </div>
              <div className="payment-total">
                <span>(d) Total Deposite:</span>
                <span>₹{securityDeposit + (order.advancePayment)}</span>
              </div>
              <div>
                <span>Return Amount(c-d):</span>
                <span className="return">₹{returnAmount}</span>
              </div>
            </div>

            <div className="totals">
              <div>
                <span>(a) Rent Amount:</span>
                <span>₹{rentamount}</span>
              </div>
              {discount > 0 && (
                <div>
                  <span>(b) Discount:</span>
                  <span className="discount">-₹{discount}</span>
                </div>
              )}
              <div className="total">
                <span>(c) Total Rent:</span>
                <span>₹{total}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
