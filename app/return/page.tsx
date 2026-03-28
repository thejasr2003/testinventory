"use client";

import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import { Search } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";
import "./Return.css";

interface Booking {
  id: string;
  customerName: string;
  phoneNumberPrimary: string;
  phoneNumberSecondary: string;
  notes: string;
  rentAmount: number;
  totalDeposit: number;
  returnAmount: number;
  advancePayment: number;
  discount: number;
  additionalcharges: number;
  discountType: string;
  rentalType: string;
  invoiceNumber: number;
  returnPaymentMethod: "Cash" | "Bank" | "";
}

interface Product {
  id: string;
  name: string;
  price: number;
  sku: string;
  images: string[];
  size: string[];
}

interface ProductLock {
  id: string;
  bookingId: string;
  productId: string;
  deliveryDate: string;
  returnDate: string;
  product: Product;
}

interface ReturnRecord extends Booking {
  productLocks: ProductLock[];
}

export default function ReturnPage() {
  const [filterType, setFilterType] = useState<string>("Tomorrow");
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [search, setSearch] = useState<string>("");
  const [data, setData] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  const formatDate = (date: Date) => date.toISOString().split("T")[0];

  const toggleRow = (bookingId: string) => {
    setExpandedRows((prev) =>
      prev.includes(bookingId)
        ? prev.filter((id) => id !== bookingId)
        : [...prev, bookingId]
    );
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let filterValue = filterType.toLowerCase();
      if (filterType === "Custom Date") filterValue = "custom";

      if (filterValue === "custom" && (!fromDate || !toDate)) {
        setLoading(false);
        return;
      }

      let url = `/api/booking/list-booking/return?filter=${encodeURIComponent(filterValue)}`;

      if (filterValue === "custom" && fromDate && toDate) {
        url += `&start=${formatDate(fromDate)}&end=${formatDate(toDate)}`;
      }

      const res = await fetch(url);
      const json = await res.json();

      if (json.data) setData(json.data);
      else setData([]);
    } catch (error) {
      console.error("Failed to fetch return data:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterType, fromDate, toDate]);

  const filteredData = data.filter((item) =>
    item.phoneNumberPrimary.includes(search.trim())
  );

  const handleFilterChange = (value: string) => {
    setFilterType(value);
    if (value !== "Custom Date") {
      setFromDate(null);
      setToDate(null);
    }
  };

  const handlePaymentMethodChange = async (
    bookingId: string,
    newMethod: "Cash" | "Bank"
  ) => {
    setUpdatingBookingId(bookingId);
    try {
      const formData = new FormData();
      formData.append("bookingId", bookingId);
      formData.append("returnPaymentMethod", newMethod);

      const res = await fetch("/api/booking/update-booking", {
        method: "PUT",
        body: formData,
      });

      if (!res.ok) {
        console.error("Failed to update payment method");
        return;
      }

      setData((prevData) =>
        prevData.map((item) =>
          item.id === bookingId
            ? { ...item, returnPaymentMethod: newMethod }
            : item
        )
      );
    } catch (error) {
      console.error("Error updating payment method:", error);
    } finally {
      setUpdatingBookingId(null);
    }
  };

  return (
    <div className="orders-container">
      <div className="orders-header">
        <h2 className="orders-title">Return</h2>

        <div className="filters">
          <select
            value={filterType}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="date-wrapper"
          >
            <option value="Today">Today</option>
            <option value="Tomorrow">Tomorrow</option>
            <option value="Custom Date">Custom Date</option>
          </select>

          {filterType === "Custom Date" && (
            <>
              <div className="date-wrapper">
                <DatePicker
                  selected={fromDate}
                  onChange={(date) => setFromDate(date)}
                  placeholderText="From date"
                  className="date-input"
                />
              </div>
              <div className="date-wrapper">
                <DatePicker
                  selected={toDate}
                  onChange={(date) => setToDate(date)}
                  placeholderText="To date"
                  className="date-input"
                />
              </div>
            </>
          )}

          <div className="search-wrapper">
            <Search size={16} className="icon" />
            <input
              type="text"
              placeholder="Search by mobile no"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="no-data">Loading...</div>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Mobile No.</th>
                <th>Alternate No.</th>
                <th>Return Amount</th>
                <th>Return Mode</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((booking) => {
                  const totalProductAmount = booking.productLocks.reduce(
                    (sum, lock) => sum + (lock.product?.price || 0),
                    0
                  );

                  const additionalCharges = booking.additionalcharges || 0;

                  const returnAmount = Math.max(
                    0,
                    booking.totalDeposit - (totalProductAmount + additionalCharges)
                  );

                  const isExpanded = expandedRows.includes(booking.id);

                  return (
                    <React.Fragment key={booking.id}>
                      {/* Main Row */}
                      <tr>
                        <td>{booking.customerName}</td>
                        <td>{booking.phoneNumberPrimary}</td>
                        <td>{booking.phoneNumberSecondary}</td>
                        <td>₹{returnAmount.toLocaleString()}</td>
                        <td
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            justifyContent: "center",
                          }}
                        >
                          <select
                            value={booking.returnPaymentMethod || "Cash"}
                            disabled={updatingBookingId === booking.id}
                            onChange={(e) =>
                              handlePaymentMethodChange(
                                booking.id,
                                e.target.value as "Cash" | "Bank"
                              )
                            }
                          >
                            <option value="Cash">Cash</option>
                            <option value="Bank">Bank</option>
                          </select>

                          <span
                            onClick={() => toggleRow(booking.id)}
                            style={{
                              cursor: "pointer",
                              fontSize: "14px",
                              userSelect: "none",
                            }}
                            aria-label={isExpanded ? "Collapse details" : "Expand details"}
                          >
                            {isExpanded ? "▲" : "▼"}
                          </span>
                        </td>
                      </tr>

                      {/* Expanded Row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} style={{ background: "#f9fafb" }}>
                            <table className="product-details-table">
                              <thead>
                                <tr>
                                  <th>Image</th>
                                  <th>SKU</th>
                                  <th>Product Name</th>
                                  <th>Delivery Date</th>
                                  <th>Return Date</th>
                                  <th>Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {booking.productLocks.map((lock) => (
                                  <tr key={lock.id}>
                                    <td>
                                      <img
                                        src={
                                          lock.product.images && lock.product.images.length > 0
                                            ? lock.product.images[0]
                                            : "/no_image.jpg"
                                        }
                                        alt={lock.product.name}
                                        className="product-image"
                                      />
                                    </td>
                                    <td>{lock.product.sku}</td>
                                    <td>{lock.product.name}</td>
                                    <td>{new Date(lock.deliveryDate).toLocaleDateString()}</td>
                                    <td>{new Date(lock.returnDate).toLocaleDateString()}</td>
                                    <td>₹{lock.product.price.toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {booking.notes && (
                              <div className="notes-box">
                                <strong>Notes:</strong> {booking.notes}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="no-data">
                    No bookings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
