"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import "./viewReceipt.css";

export default function EReceiptPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [organizationInfo, setOrganizationInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [orderRes, orgRes] = await Promise.all([
          fetch(`/api/booking/e-receipt/${id}`),
          fetch("/api/organization/get-organization-info"),
        ]);

        if (!orderRes.ok) {
          if (orderRes.status === 404) {
            setError("Booking not found. Please check the booking ID.");
          } else {
            setError("Something went wrong. Please try again later.");
          }
          setLoading(false);
          return;
        }

        const orderData = await orderRes.json();
        const orgData = await orgRes.json();

        setOrder(orderData.data);
        setOrganizationInfo(orgData.data[0]);
      } catch (err) {
        console.error(err);
        setError("Unable to fetch booking. Please check your connection.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ textAlign: "center", marginTop: "50px" }}>{error}</div>;
  if (!order || !organizationInfo)
    return <div style={{ textAlign: "center", marginTop: "50px" }}>No booking data found.</div>;

  const productAmount = order.productLocks.reduce(
    (sum: number, lock: any) => sum + (lock.product?.price || 0),
    0
  );



  const TOTAL = productAmount + (order.additionalCharges || 0) 

  const remainingPayment = order.advancePayment + order.securityDeposit;
  const returnAmount = (remainingPayment - (TOTAL - order.discount));

  return (
    <div className="invoice-wrapper">
      <div className="invoice-card">
        {/* === HEADER === */}
        <div className="invoice-header">
          <div className="org-header">
            <div className="org-logo">
              <img src="/icons/icon-512x512.png" alt="Logo" />
            </div>

            <div className="org-details">
              <h2>{organizationInfo.organizationName}</h2>
              <p>{organizationInfo.address}</p>
              <p>Email: {organizationInfo.email}</p>
              <p>Phone: {organizationInfo.contactNumber}</p>
            </div>
          </div>


          <div className="invoice-meta">
            <p>
              <strong>Invoice #:</strong> {order.invoiceNumber}
            </p>
            <p>
              <strong>Date:</strong>{" "}
              {new Date(order.createdAt).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* === BILLED TO === */}
        <div className="billed-box">
          <p className="billed-title">Billed To</p>
          <p className="billed-name">{order.customerName}</p>
          <p className="billed-contact">
            {order.phoneNumberPrimary} {order.phoneNumberSecondary ? `| ${order.phoneNumberSecondary}` : ""}
          </p>
        </div>

        {/* === PRODUCT TABLE === */}
        <table className="product-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Product Name</th>
              <th>Size</th>
              <th>Del. Date</th>
              <th>Return Date</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.productLocks.map((lock: any, index: number) => (
              <tr key={lock.id}>
                <td>{index + 1}</td>
                <td>{lock.product.name}</td>
                <td>{lock.product.size?.join(", ") || "N/A"}</td>
                <td>{new Date(lock.deliveryDate).toLocaleDateString("en-GB")}</td>
                <td>{new Date(lock.returnDate).toLocaleDateString("en-GB")}</td>
                <td>Rs.{lock.product.price}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* === PAYMENT SUMMARY === */}
        <div className="payment-summary">
          {/* LEFT BOX */}
          <div className="calc-box">
            <div className="row">
              <span>Adv. Payment:</span>
              <span>Rs.{order.advancePayment}</span>
            </div>

            <div className="row">
              <span>Security Deposit:</span>
              <span>Rs.{order.securityDeposit}</span>
            </div>

            {/* DIVIDER ABOVE TOTAL */}
            <div className="divider" />

            <div className="row total-row">
              <span>(d) Total Deposit:</span>
              <span>Rs.{order.advancePayment + order.securityDeposit}</span>
            </div>

            <div className="row return-row">
              <span>Return Amount (c - d):</span>
              <span>Rs.{returnAmount}</span>
            </div>
          </div>

          {/* RIGHT BOX */}
          <div className="calc-box">
            <div className="row">
              <span>(a) Rent Amount:</span>
              <span>Rs.{TOTAL}</span>
            </div>

            {order.discount > 0 && (
              <div className="row">
                <span>(b) Discount:</span>
                <span>- Rs.{order.discount}</span>
              </div>
            )}

            <div className="divider" />

            <div className="row total-row">
              <span>(c) Total Rent:</span>
              <span>Rs.{TOTAL - order.discount}</span>
            </div>
          </div>
        </div>


       {/* === SPECIAL NOTE === */}
        {order.notes && (
          <div className="special-note">
            <h4>Special Note:</h4>
            <p>{order.notes}</p>
          </div>
        )}



        {/* === TERMS & CONDITIONS === */}
        <div className="terms-box">
          <h4>Terms & Conditions</h4>
          <ul>
            <li>1. Extra Day Charge: ₹250 will be charged per gown or blazer for each extra day.</li>
            <li>2. Dress Care: Dresses must be returned clean and without any damage. Do not use fire bombs, cold bombs, or color bombs.</li>
            <li>3. Damage Fee: Minimum charge of ₹2,000 will apply for any damage.</li>
            <li>4. Pickup & Return: Customers must handle collection and return of dresses.</li>
            <li>5. Delivery Charges: All courier or delivery costs (Dunzo, Swiggy, etc.) must be paid by the customer for both pickup and return.</li>
            <li>6. No refund of advance payment on any booking cancellation.</li>
          </ul>
        </div>




        {/* === FOOTER === */}
        <div className="footer-note">
          <p>Thanks You Visit Again!</p>
        </div>
      </div>
    </div>
  );
}
