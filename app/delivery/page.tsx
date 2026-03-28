"use client";
import * as XLSX from "xlsx";
import { useState, useEffect } from "react";
import React from "react";
import DatePicker from "react-datepicker";
import { Search, Edit, Eye, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import "react-datepicker/dist/react-datepicker.css";
import "./Delivery.css";

interface Booking {
  id: string;
  customerName: string;
  phoneNumberPrimary: string;
  phoneNumberSecondary: string;
  notes: string;

  rentAmount: number;
  totalDeposit: number;
  additionalCharges: number;
  returnAmount: number;

  advancePayment: number;
  securityDeposit: number;
  discount: number;

  invoiceNumber: number;
  rentalType: string;

  advancePaymentMethod: string;
  deliverypaymnetMethod: "Cash" | "Bank" | "" | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  sku: string;
  images: string[];
  size: string[];
  category: string;
  gender: string;
}

interface ProductLock {
  id: string;
  bookingId: string;
  productId: string;
  deliveryDate: string;
  returnDate: string;
  returnStatus: string;
  product: Product;
}

interface DeliveryRecord extends Booking {
  productLocks: ProductLock[];
}


export default function DeliveryPage() {
  const router = useRouter();
  const [filterType, setFilterType] = useState<string>("All");
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [search, setSearch] = useState<string>("");
  const [data, setData] = useState<DeliveryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);

  // Pagination (client-side, 10 per page to match Orders page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Format as local date-only (YYYY-MM-DD) to avoid UTC offset when serializing
  const pad = (n: number) => n.toString().padStart(2, "0");
  const formatDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

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

      let url = `/api/booking/list-booking/delivery?filter=${encodeURIComponent(filterValue)}`;

      if (filterValue === "custom" && fromDate && toDate) {
        url += `&start=${formatDate(fromDate)}&end=${formatDate(toDate)}`;
      }

      const res = await fetch(url);
      const json = await res.json();

      if (json.data) setData(json.data);
      else setData([]);
    } catch (error) {
      console.error("Failed to fetch delivery data:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterType, fromDate, toDate]);

  const q = search.trim().toLowerCase();
  const filteredData = data.filter((item) => {
    if (!q) return true;
    return (
      (item.phoneNumberPrimary || "").toLowerCase().includes(q) ||
      (item.phoneNumberSecondary || "").toLowerCase().includes(q) ||
      (item.customerName || "").toLowerCase().includes(q)
    );
  });

  // Reset to first page when filters/search/data change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, fromDate, toDate, search, data]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const getPaginationButtons = () => {
    const buttons = [];
    const maxVisible = 5; // Show max 5 page buttons
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      buttons.push(
        <button
          key={1}
          className={currentPage === 1 ? "active-page" : ""}
          onClick={() => goToPage(1)}
        >
          1
        </button>
      );
      if (startPage > 2) {
        buttons.push(
          <span key="ellipsis-start" className="pagination-ellipsis">
            ...
          </span>
        );
      }
    }


    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          className={currentPage === i ? "active-page" : ""}
          onClick={() => goToPage(i)}
        >
          {i}
        </button>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttons.push(
          <span key="ellipsis-end" className="pagination-ellipsis">
            ...
          </span>
        );
      }
      buttons.push(
        <button
          key={totalPages}
          className={currentPage === totalPages ? "active-page" : ""}
          onClick={() => goToPage(totalPages)}
        >
          {totalPages}
        </button>
      );
    }

    return buttons;
  };

  const handleFilterChange = (value: string) => {
    setFilterType(value);
    if (value !== "Custom Date") {
      setFromDate(null);
      setToDate(null);
    }
  };


  const formatUI = (d?: string) =>
    d ? new Date(d).toLocaleDateString() : "-";

  const getReceivingDate = (booking: DeliveryRecord) =>
    booking.productLocks?.[0]?.deliveryDate;

  const getReturnDate = (booking: DeliveryRecord) =>
    booking.productLocks?.[0]?.returnDate;
  const exportExcel = () => {
    if (!filteredData.length) return;

    const rows = filteredData.map((b) => ({
      "Receiving Date": formatUI(getReceivingDate(b)),
      "Return Date": formatUI(getReturnDate(b)),
      "Customer Name": b.customerName,
      "Mobile No.": b.phoneNumberPrimary,
      "Advance Payment": b.advancePayment,
      "Security Deposit": b.securityDeposit,
      "Rent": (b.rentAmount || 0) - (b.discount || 0),

      "Refund": b.returnAmount ?? 0,
      "Notes": b.notes || "-",


    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Delivery");

    XLSX.writeFile(
      workbook,
      `delivery_export_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };
  const getRentAfterDiscount = (b: DeliveryRecord) =>
    Math.max(0, (b.rentAmount || 0) - (b.discount || 0));

  const handleStatusToggle = async (booking: DeliveryRecord) => {
    setUpdatingBookingId(booking.id);
    try {
      // Check if all are returned
      const allReturned = booking.productLocks.every(
        (lock) => lock.returnStatus === "returned"
      );
      // If all returned, mark as not_returned, otherwise mark all as returned
      const newStatus = allReturned ? "not_returned" : "returned";

      for (const lock of booking.productLocks) {
        const formData = new FormData();
        formData.append("bookingId", booking.id);
        formData.append("productLockId", lock.id);
        formData.append("returnStatus", newStatus);

        const res = await fetch("/api/booking/update-booking", {
          method: "PUT",
          body: formData,
        });

        if (!res.ok) {
          console.error("Failed to update return status for product", lock.id);
        }
      }

      // Update local state
      setData((prevData) =>
        prevData.map((b) =>
          b.id === booking.id
            ? {
                ...b,
                productLocks: b.productLocks.map((lock) => ({
                  ...lock,
                  returnStatus: newStatus,
                })),
              }
            : b
        )
      );
    } catch (error) {
      console.error("Error updating return status:", error);
    } finally {
      setUpdatingBookingId(null);
    }
  };

  return (
    <div className="orders-container">
      <div className="orders-header">
        <h2 className="orders-title">Delivery</h2>

        <div className="filters">
          <select
            value={filterType}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="date-wrapper"
          >
            <option>All</option>
            <option>Today</option>
            <option>Tomorrow</option>
            <option>Custom Date</option>
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
              placeholder="Search by mobile no/name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {filterType === "Custom Date" && fromDate && toDate && (
            <button className="export-btn" onClick={exportExcel}>
              Export
            </button>
          )}
        </div>

      </div>

      <div className="table-container">
        {loading ? (
          <div className="no-data">Loading...</div>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>Receiving Date</th>
                <th>Return Date</th>
                <th>Customer Name</th>
                <th>Mobile No.</th>
                <th>Advance Payment</th>
                <th>Security Deposit</th>
                <th>Rent </th>
                <th>Refund</th>
                <th>Notes</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {paginatedData.length > 0 ? (
                paginatedData.map((booking) => {
                  const isExpanded = expandedRows.includes(booking.id);

                  const totalAmount = booking.productLocks.reduce(
                    (sum, lock) => sum + lock.product.price,
                    0
                  );

                  const deposit = booking.securityDeposit;
                  const remPayment =
                    totalAmount + deposit - booking.discount - booking.advancePayment;

                  return (
                    <React.Fragment key={booking.id}>
                      {(() => {
                        const allReturned = booking.productLocks.every(
                          (lock) => lock.returnStatus === "returned"
                        );
                        const bgColor = allReturned ? "#28a745" : "transparent";

                        return (
                          <>
                            <tr style={{ backgroundColor: bgColor }}>
                              <td style={{ color: allReturned ? "white" : "inherit" }}>{formatUI(getReceivingDate(booking))}</td>
                              <td style={{ color: allReturned ? "white" : "inherit" }}>{formatUI(getReturnDate(booking))}</td>
                              <td style={{ color: allReturned ? "white" : "inherit" }}>{booking.customerName}</td>
                              <td style={{ color: allReturned ? "white" : "inherit" }}>{booking.phoneNumberPrimary}</td>

                              <td style={{ color: allReturned ? "white" : "inherit" }}>₹{booking.advancePayment.toLocaleString()}</td>
                              <td style={{ color: allReturned ? "white" : "inherit" }}>₹{booking.securityDeposit.toLocaleString()}</td>
                              <td style={{ color: allReturned ? "white" : "inherit" }}>₹{getRentAfterDiscount(booking).toLocaleString()}</td>

<td style={{ color: allReturned ? "white" : "inherit" }}>₹{(booking.returnAmount ?? 0).toLocaleString()}</td>
                                <td style={{ color: allReturned ? "white" : "inherit" }}>{booking.notes || "-"}</td>

                        <td>
                          {(() => {
                            const allReturned = booking.productLocks.every(
                              (lock) => lock.returnStatus === "returned"
                            );
                            const returnedCount = booking.productLocks.filter(
                              (lock) => lock.returnStatus === "returned"
                            ).length;
                            const totalProducts = booking.productLocks.length;

                            return (
                              <button
                                onClick={() => handleStatusToggle(booking)}
                                disabled={updatingBookingId === booking.id}
                                style={{
                                  backgroundColor: allReturned ? "#56d373" : "#dc3545",
                                  color: "white",
                                  border: "none",
                                  padding: "8px 16px",
                                  borderRadius: "4px",
                                  cursor: updatingBookingId === booking.id ? "not-allowed" : "pointer",
                                  fontSize: "13px",
                                  fontWeight: "bold",
                                  width: "100%",
                                  textAlign: "center",
                                  opacity: updatingBookingId === booking.id ? 0.6 : 1,
                                }}
                              >
                                {updatingBookingId === booking.id
                                  ? "Updating..."
                                  : allReturned
                                  ? "✓ All Returned"
                                  : " Not Returned"}
                              </button>
                            );
                          })()}
                        </td>

                        <td className="actions">
                          <Eye
                            className="action-icon view"
                            size={16}
                            onClick={() => router.push(`/orders/${booking.id}`)}
                          />
                          <Edit
                            className="action-icon edit"
                            size={16}
                            onClick={() =>
                              router.push(`/create-booking/${booking.id}/updatebooking`)
                            }
                          />
                          <ChevronDown
                            className="action-icon dropdown"
                            size={16}
                            onClick={() => toggleRow(booking.id)}
                            style={{
                              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                              transition: "transform 0.2s ease",
                            }}
                          />
                        </td>
                      </tr>
                          </>
                        );
                      })()}

                      {isExpanded && (
                        <tr>
                          <td colSpan={10} style={{ padding: 0 }}>
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
                                {booking.productLocks.map((lock) => {
                                  return (
                                    <tr key={lock.id}>
                                      <td>
                                        <img
                                          src={lock.product.images[0] || "/no_image.jpg"}
                                          alt={lock.product.name}
                                          className="product-image"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).src = "/no_image.jpg";
                                          }}
                                        />
                                      </td>
                                      <td>{lock.product.sku}</td>
                                      <td>{lock.product.name}</td>
                                      <td>{new Date(lock.deliveryDate).toLocaleDateString()}</td>
                                      <td>{new Date(lock.returnDate).toLocaleDateString()}</td>
                                      <td>₹{lock.product.price.toLocaleString()}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} className="no-data">
                    No deliveries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
            Prev
          </button>
          {getPaginationButtons()}
          <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
