"use client";

import { useState, useEffect } from "react";
import Select from "react-select";
import { useRouter } from "next/navigation";
import "./home.css";

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [products, setProducts] = useState<{ value: string; label: string }[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    const today = new Date();
    setMonth(today.getMonth());
    setYear(today.getFullYear());
    setMounted(true);

    const fetchProducts = async () => {
      try {
        const res = await fetch("/api/products");
        const json = await res.json();
          const formatted = json.data.map((p: any) => {
            const sizes = Array.isArray(p.size) ? p.size.join(",") : p.size;
            return {
              value: p.id,
              label: `${p.sku}-${sizes} : ${p.name}`,
            };
          });
        setProducts(formatted);
      } catch (err) {
        console.error("❌ Failed to fetch products:", err);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    const fetchBookings = async () => {
      if (!selectedProduct || month === null || year === null) {
        setBookings([]);
        return;
      }

      try {
        const res = await fetch(`/api/product-lock/${selectedProduct.value}`);
        const json = await res.json();
        setBookings(json.data || []);
      } catch (err) {
        console.error("❌ Failed to fetch bookings:", err);
        setBookings([]);
      }
    };

    fetchBookings();
  }, [selectedProduct, month, year]);

  if (!mounted || month === null || year === null) return null;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const getDaysInMonth = (year: number, month: number) =>
    new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year! - 1);
    } else {
      setMonth(month! - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year! + 1);
    } else {
      setMonth(month! + 1);
    }
  };

  const normalizeDate = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const monthBookings = bookings.filter((b) => {
    const delivery = normalizeDate(new Date(b.deliveryDate));
    const ret = normalizeDate(new Date(b.returnDate));
    const startOfMonth = new Date(year!, month!, 1);
    const endOfMonth = new Date(year!, month! + 1, 0);
    return delivery <= endOfMonth && ret >= startOfMonth;
  });

  const getDayBooking = (day: number) => {
    if (!monthBookings.length) return null;
    const dayDate = normalizeDate(new Date(year!, month!, day));

    for (const booking of monthBookings) {
      const delivery = normalizeDate(new Date(booking.deliveryDate));
      const ret = normalizeDate(new Date(booking.returnDate));

      if (dayDate >= delivery && dayDate <= ret) {
        return {
          booking,
          isDeliveryStart: dayDate.getTime() === delivery.getTime(),
        };
      }
    }
    return null;
  };

  const firstDay = new Date(year!, month!, 1).getDay();
  const daysInMonth = getDaysInMonth(year!, month!);

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const weeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <div className="home-container">
  <div className="calendar-toolbar">
    <div className="toolbar-left">Home</div>
    <div className="toolbar-right">
      <div className="product-filter-box">
        <Select
          options={products}
          value={selectedProduct}
          onChange={setSelectedProduct}
          placeholder="Select a product"
          isSearchable
          styles={{
            control: (base) => ({
              ...base,
              borderRadius: "8px",
              borderColor: "#d1d5db",
              boxShadow: "none",
              "&:hover": { borderColor: "#2563eb" },
            }),
            menu: (base) => ({
              ...base,
              zIndex: 9999,
              width: "100%", 
            }),
            menuList: (base) => ({
              ...base,
              maxHeight: products.length > 5 ? "180px" : "auto",
              overflowY: products.length > 5 ? "auto" : "visible",
              paddingRight: "6px",
              scrollbarWidth: "thin",
              "&::-webkit-scrollbar": {
                width: "6px",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "#cbd5e1",
                borderRadius: "4px",
              },
            }),
          }}
        />
      </div>
          <button
            className="create-btn"
            onClick={() => router.push("/create-booking")}
          >
            + Create Booking
          </button>
        </div>
      </div>

      <div className="calendar">
        <div className="calendar-header">
          <button onClick={prevMonth}>‹</button>
          <h2>
            {monthNames[month!]} {year}
          </h2>
          <button onClick={nextMonth}>›</button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Sunday</th>
              <th>Monday</th>
              <th>Tuesday</th>
              <th>Wednesday</th>
              <th>Thursday</th>
              <th>Friday</th>
              <th>Saturday</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, i) => (
              <tr key={i}>
                {week.map((day, j) => {
                  if (!day) return <td key={j} className="empty"></td>;

                  const dayData = getDayBooking(day);
                  const booking = dayData?.booking;
                  const isDeliveryStart = dayData?.isDeliveryStart;

                  return (
                    <td
                      key={j}
                      className={`day ${booking ? "booked" : ""}`}
                      title={
                        booking
                          ? `Booking ID: ${booking.bookingId}\nProduct: ${selectedProduct?.label || ""}`
                          : undefined
                      }
                    >
                      <div className="date-num">{day}</div>
                      {isDeliveryStart && selectedProduct && (
                        <div className="product-name">{selectedProduct.label}</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
