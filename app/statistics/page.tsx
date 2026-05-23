"use client";
import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import "./statistics.css";

interface BookingData {
  week: string; // weekly range e.g., "31 Aug - 06 Sept"
  revenue: number;
  bookings: number;
}

interface TotalData {
  totalRevenue: number;
  totalBookingCount: number;
  revenue: {
    revenueInCash: number;
    revenueInBank: number;
  };
}

// Generate all week ranges between fromDate and toDate
function getWeeksBetween(startDate: Date, endDate: Date): string[] {
  const weeks: string[] = [];
  const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  let current = new Date(startDate);

  while (current <= endDate) {
    const day = current.getDay();
    const diffToMon = (day + 6) % 7;
    const weekStart = new Date(current);
    weekStart.setDate(current.getDate() - diffToMon);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const startStr = weekStart.toLocaleDateString("en-US", options);
    const endStr = weekEnd.toLocaleDateString("en-US", options);
    weeks.push(`${startStr} - ${endStr}`);

    current = new Date(weekEnd);
    current.setDate(current.getDate() + 1);
  }

  return weeks;
}

export default function Statistics() {
  const [filter, setFilter] = useState<string>("Last Month");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [chartData, setChartData] = useState<BookingData[]>([]);
  const [totalData, setTotalData] = useState<TotalData>({
    totalRevenue: 0,
    totalBookingCount: 0,
    revenue: { revenueInCash: 0, revenueInBank: 0 },
  });
  const [backupLoading, setBackupLoading] = useState(false);

  const handleDatabaseBackup = async () => {
    try {
      setBackupLoading(true);
      const res = await fetch("/api/backup");
      
      if (!res.ok) {
        throw new Error("Failed to create backup");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup-${new Date().toISOString().split("T")[0]}.sql`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Backup failed", err);
      alert("Failed to create database backup");
    } finally {
      setBackupLoading(false);
    }
  };

  const fetchStats = async (from: string, to: string) => {
    try {
      const res = await fetch(`/api/booking/stats?from=${from}&to=${to}`);
      const data = await res.json();

      // Generate all weeks between from and to
      const weeks = getWeeksBetween(new Date(from), new Date(to));

      // Map API data to week for easy lookup
      const apiMap: Record<string, { revenue: number; bookings: number }> = {};
      data.weeklyStats?.forEach((w: any) => {
        apiMap[w.week] = { revenue: w.revenue, bookings: w.bookings };
      });

      // Fill chart data for all weeks
      const fullData: BookingData[] = weeks.map((week) => ({
        week,
        revenue: apiMap[week]?.revenue || 0,
        bookings: apiMap[week]?.bookings || 0,
      }));

      setChartData(fullData);

      if (data.total) {
        setTotalData({
          totalRevenue: data.total.totalRevenue,
          totalBookingCount: data.total.totalBookingCount,
          revenue: {
            revenueInCash: data.total.revenue.revenueInCash,
            revenueInBank: data.total.revenue.revenueInBank,
          },
        });
      }
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  useEffect(() => {
    const today = new Date();
    let from: string;
    let to: string;

    if (filter === "Today") {
      from = today.toISOString().split("T")[0];
      to = from;
    } else if (filter === "Last Week") {
      const lastWeekStart = new Date(today);
      lastWeekStart.setDate(today.getDate() - 7);
      from = lastWeekStart.toISOString().split("T")[0];
      to = today.toISOString().split("T")[0];
    } else if (filter === "Last Month") {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      from = lastMonth.toISOString().split("T")[0];
      to = lastMonthEnd.toISOString().split("T")[0];
    } else if (filter === "Current Month") {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      from = start.toLocaleDateString("en-CA"); 
      to = now.toLocaleDateString("en-CA");
    } else if (filter === "Custom Date" && fromDate && toDate) {
      from = fromDate;
      to = toDate;
    } else {
      from = today.toISOString().split("T")[0];
      to = from;
    }

    setFromDate(from);
    setToDate(to);
    fetchStats(from, to);
  }, [filter, fromDate, toDate]);

  return (
    <div className="page-container">
      <div className="header-bar">
        <h2 className="page-title">Statistics</h2>
        <div className="filter-bar">
          <button 
            onClick={handleDatabaseBackup} 
            disabled={backupLoading}
            style={{
              padding: "8px 16px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: backupLoading ? "not-allowed" : "pointer",
              opacity: backupLoading ? 0.6 : 1,
              marginRight: "10px"
            }}
          >
            {backupLoading ? "Backing up..." : "Database Backup"}
          </button>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option>Today</option>
            <option>Current Month</option>
            <option>Last Week</option>
            <option>Last Month</option>
            <option>Custom Date</option>
          </select>
          {filter === "Custom Date" && (
            <>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </>
          )}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Booking</h3>
          <p>{totalData.totalBookingCount}</p>
        </div>
        <div className="stat-card">
          <h3>Total Revenue</h3>
          <p>{totalData.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="stat-card">
          <h3>Revenue In Cash</h3>
          <p>{totalData.revenue.revenueInCash.toFixed(2)}</p>
        </div>
        <div className="stat-card">
          <h3>Revenue In Bank</h3>
          <p>{totalData.revenue.revenueInBank.toFixed(2)}</p>
        </div>
      </div>

      <div className="chart-grid">
        {/* Revenue Chart */}
        <div className="chart-card">
          <h3>Revenue Overview</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#8884d8"
                fill="url(#revGradient)"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Booking Chart */}
        <div className="chart-card">
          <h3>Booking Overview</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <CartesianGrid strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="bookings"
                stroke="#82ca9d"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
