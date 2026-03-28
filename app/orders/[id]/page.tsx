"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Printer, Copy, Download, MessageCircle, Plus } from "lucide-react";
import "./viewOrder.css";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface ProductLock {
  id: string;
  deliveryDate: string;
  returnDate: string;
  product: {
    id: string;
    name: string;
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

  const productAmount = order.productLocks.reduce(
    (sum, lock) => sum + (lock.product?.price || 0),
    0
  );
  const additionalCharges = order.additionalCharges || 0; 
  const securityDeposit = order.securityDeposit;
  const discount = order.discount;
  const rentamount = productAmount + additionalCharges;
  const total = rentamount - discount
  const remainingPayment = total - order.advancePayment;
  const returnAmount = (securityDeposit + (order.advancePayment)) - total;

  const generatePDF = () => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let currentY = 20;

  const formatCurrency = (amount: number) =>
    `Rs.${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

  const logo = new Image();
    logo.src = "/icons/icon-512x512.png"; // Make sure this exists in /public/icons

    const logoSize = 22;
    const logoX = margin;
    const logoY = currentY;

    // ✅ Draw logo
    doc.addImage(logo, "PNG", logoX, logoY, logoSize, logoSize);

    // ✅ Draw circle mask around logo (makes it look circular)
    doc.setDrawColor(200);
    doc.setLineWidth(0.6);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, "S");

    // ✅ Text positioned to the right of the logo
    const textX = logoX + logoSize + 5;
    let textY = logoY + 4;

    doc.setFont("helvetica", "bold").setFontSize(14).setTextColor(0);
    doc.text(organizationInfo.organizationName, textX, textY);

    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(80);
    textY += 6;
    const addressLines = doc.splitTextToSize(organizationInfo.address, 80); // wrap width ~80px

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

    currentY = logoY + logoSize + 15; // Move content down cleanly

    const billedBoxHeight = 30;
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, currentY, pageWidth - 2 * margin, billedBoxHeight, "F"); 
    doc.setTextColor(0).setFont("helvetica", "bold").setFontSize(11);
    doc.text("Billed To:", margin + 5, currentY + 8);
    doc.setFont("helvetica", "normal").setFontSize(10);
    doc.text(order.customerName, margin + 5, currentY + 15);
    doc.text(`${order.phoneNumberPrimary} , ${order.phoneNumberSecondary}`, margin + 5, currentY + 22);

    currentY += billedBoxHeight + 5;

    autoTable(doc, {
      startY: currentY,
      head: [["#", "Product Name", "Del. Date", "Return Date", "Amount"]],
      body: order.productLocks.map((lock, i) => [
        i + 1,
        lock.product.name,
        new Date(lock.deliveryDate).toLocaleDateString("en-GB"),
        new Date(lock.returnDate).toLocaleDateString("en-GB"),
        formatCurrency(lock.product.price),
      ]),
      theme: "grid",
      styles: { lineColor: [200, 200, 200], lineWidth: 0.2, fontSize: 10, cellPadding: 3 },
      headStyles: {
        fillColor: [245, 245, 245],
        textColor: 0,
        fontStyle: "bold",
        halign: "center",
      },
      bodyStyles: { textColor: 0, halign: "center" },
      columnStyles: { 1: { halign: "left" }, 4: { halign: "right" } },
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;

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

    doc.text("(b) Discount:", rightX + 4, boxY + step * 2);
    doc.text(`- ${formatCurrency(discount)}`, rightX + boxWidth - 4, boxY + step * 2, { align: "right" });
    const dividerY_Right = boxY + step * 2 + gapAfterDivider;
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

      if (currentY + 80 > doc.internal.pageSize.height - 20) {
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
    if (currentY + 70 > doc.internal.pageSize.height - 30) {
      currentY = doc.internal.pageSize.height - 120;
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

  const handleDownload = () => {
    const doc = generatePDF();
    doc.save(`invoice_${order.invoiceNumber}.pdf`);
  };

  const handlePrint = () => {
    const doc = generatePDF();
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

        <table className="product-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Product Name</th>
              <th>Delivery Date</th>
              <th>Return Date</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.productLocks.map((lock, index) => (
              <tr key={lock.id}>
                <td>{index + 1}</td>
                <td>{lock.product.name}</td>
                <td>{new Date(lock.deliveryDate).toLocaleDateString("en-GB")}</td>
                <td>{new Date(lock.returnDate).toLocaleDateString("en-GB")}</td>
                <td>₹{lock.product.price}</td>
              </tr>
            ))}
          </tbody>
        </table>

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
              <div>
                <span>(b) Discount:</span>
                <span className="discount">-₹{discount}</span>
              </div>
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
