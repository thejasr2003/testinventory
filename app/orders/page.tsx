"use client";

import { useState, useEffect } from "react";
import { Eye, Edit, Trash2, Search, Calendar, X } from "lucide-react";
import { useRouter } from "next/navigation";
import "./orders.css";

interface ProductLock {
  id: string;
  productId: string;
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

interface Order {
  id: string;
  customerName: string;
  phoneNumberPrimary: string;
  phoneNumberSecondary: string;
  securityDeposit: number;
  invoiceNumber: number;
  createdAt: string;
  productLocks: ProductLock[];
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      const res = await fetch("/api/booking/list-booking/orders");
      const data = await res.json();
      if (data?.data) {
        setOrders(data.data);
        setFilteredOrders(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    }
  }

  useEffect(() => {
    let result = orders.filter(
      (o) =>
        o.phoneNumberPrimary.toLowerCase().includes(search.toLowerCase()) ||
        o.phoneNumberSecondary.toLowerCase().includes(search.toLowerCase())
    );

    if (fromDate || toDate) {
      const from = fromDate ? new Date(fromDate + "T00:00:00") : null;
      const to = toDate ? new Date(toDate + "T23:59:59") : null;

      result = result.filter((o) => {
        const created = new Date(o.createdAt);
        if (from && created < from) return false;
        if (to && created > to) return false;
        return true;
      });
    }

    setFilteredOrders(result);
    setCurrentPage(1);
  }, [search, fromDate, toDate, orders]);

  async function handleDelete() {
    if (!deleteId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/booking/${deleteId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete order");
      await fetchOrders();
      setDeleteId(null);
    } catch (err) {
      console.error(err);
      alert("Error deleting order");
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    try {
      const url = `/api/booking/export?from_date=${fromDate || ""}&to_date=${toDate || ""}`;
      const response = await fetch(url, { method: "GET", credentials: "include" });

      if (!response.ok) {
        alert("Failed to export file");
        return;
      }

      let fileName = "bookings.xlsx";
      const contentDisposition = response.headers.get("Content-Disposition");
      if (contentDisposition && contentDisposition.includes("filename=")) {
        fileName = contentDisposition.split("filename=")[1].replace(/"/g, "");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error(err);
      alert("Export failed. Check console for details.");
    }
  }

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  }

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

  return (
    <div className="orders-container">
      <div className="orders-header">
        <h2 className="orders-title">Orders</h2>

        <div className="filters">
          <div className="search-wrapper">
            <Search className="icon" size={16} />
            <input
              type="text"
              placeholder="Search by mobile no"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-box"
            />
          </div>

          <div className="date-wrapper">
            <Calendar className="icon" size={16} />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="date-input"
            />
          </div>

          <div className="date-wrapper">
            <Calendar className="icon" size={16} />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="date-input"
            />
          </div>

          <button className="export-btn" onClick={handleExport}>
            Export
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Invoice No.</th>
              <th>Booking Date</th>
              <th>Customer Name</th>
              <th>Mobile No.</th>
              <th>Alternate No.</th>
              <th>Amount</th>
              <th>Deposit</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.length > 0 ? (
              paginatedOrders.map((o) => {
                const productAmount = o.productLocks.reduce(
                  (sum, lock) => sum + lock.product.price,
                  0
                );

                // Determine if booking is ongoing or future
                const now = new Date();
                const isEditable = o.productLocks.some((lock) => {
                  const returnDate = new Date(lock.returnDate);
                  return now <= returnDate; // ongoing or future
                });

                return (
                  <tr key={o.id}>
                    <td>{o.invoiceNumber}</td>
                    <td>{new Date(o.createdAt).toLocaleDateString("en-GB")}</td>
                    <td>{o.customerName}</td>
                    <td>{o.phoneNumberPrimary}</td>
                    <td>{o.phoneNumberSecondary}</td>
                    <td>₹{productAmount}</td>
                    <td>₹{o.securityDeposit}</td>
                    <td className="actions">
                      <Eye
                        className="action-icon view"
                        size={16}
                        title="View"
                        onClick={() => router.push(`/orders/${o.id}`)}
                      />
                      {isEditable && (
                        <>
                          <Edit
                            className="action-icon edit"
                            size={16}
                            title="Edit"
                            onClick={() =>
                              router.push(`/create-booking/${o.id}/updatebooking`)
                            }
                          />
                          <Trash2
                            className="action-icon delete"
                            size={16}
                            title="Delete"
                            onClick={() => setDeleteId(o.id)}
                          />
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="no-data">
                  No orders found
                </td>
              </tr>
            )}
          </tbody>
        </table>
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

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>Confirm Order Deletion?</h3>
              <X size={18} className="close-icon" onClick={() => setDeleteId(null)} />
            </div>
            <p>Are you sure you want to delete this order?</p>
            <p className="note">This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setDeleteId(null)} disabled={loading}>
                Cancel
              </button>
              <button className="delete-btn" onClick={handleDelete} disabled={loading}>
                {loading ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>

      )}
    </div>
  );
}
