"use client";

import "./globals.css";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  User,
  Lock,
  LogOut,
  Home,
  Truck,
  RotateCcw,
  Package,
  ShoppingBag,
  BarChart3,
  Menu,
  Tags,
  X,
  Eye,
  EyeOff, // 👈 added for password visibility toggle
} from "lucide-react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<{ id?: string; name?: string } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  // Inside RootLayout

  // Statistics modal states
  const [showStatsPassword, setShowStatsPassword] = useState(false);
  const [statsPassword, setStatsPassword] = useState("");
  const [statsError, setStatsError] = useState("");
  const [showPassword, setShowPassword] = useState(false); // 👈 new state for eye icon

  const handleStatisticsClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setShowStatsPassword(true);
  };

  const verifyStatsPassword = async () => {
    const res = await fetch("/api/statistics/verify-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: statsPassword }),
    });
    const data = await res.json();
    if (data.success) {
      setShowStatsPassword(false);
      setStatsPassword("");
      setStatsError("");
      window.location.href = "/statistics";
    } else {
      setStatsError("Incorrect password");
    }
  };


  const hideLayout = pathname === "/login" || pathname === "/sign-in" || pathname.startsWith("/e-receipt/");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) setUser(JSON.parse(raw));
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (!(e.target instanceof Node)) return;
      if (!dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    document.body.style.overflow = showMobileSidebar ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showMobileSidebar]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("user");
    window.location.href = "/sign-in"; // full reload
  };

  // Mobile sidebar link handler
  const handleMobileLink = (href: string) => {
    setShowMobileSidebar(false);
    window.location.href = href;
  };

  // Dropdown link handler
  const handleDropdownLink = (href: string) => {
    setShowDropdown(false);
    window.location.href = href;
  };

  

  return (
    <html lang="en">
      <head>
        <title>Inventory Management</title>
        <meta name="description" content="Inventory Management PWA" />
        <meta name="theme-color" content="#317EFB" />

        {/* PWA manifest and icons */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Inventory" />
        <meta name="application-name" content="Inventory Management" />
      </head>
      <body>
        {!hideLayout && (
          <>
            {/* Desktop Sidebar */}
            <aside className="sidebar">
              <nav>
                <ul>
                  <li><a href="/home"><Home className="nav-icon" size={18} /> Home</a></li>
                  <li><a href="/delivery"><Truck className="nav-icon" size={18} /> Delivery</a></li>
                  <li><a href="/return"><RotateCcw className="nav-icon" size={18} /> Return</a></li>
                  <li><a href="/products"><Package className="nav-icon" size={18} /> Products</a></li>
                  <li><a href="/orders"><ShoppingBag className="nav-icon" size={18} /> Orders</a></li>
                  <li><a href="/Category"><Tags className="nav-icon" size={18} /> Category</a></li>
                  <li>
                    <a href="/statistics" onClick={handleStatisticsClick}>
                      <BarChart3 className="nav-icon" size={18} /> Statistics
                    </a>
                  </li>

                </ul>
              </nav>
            </aside>

            {/* Mobile Sidebar Overlay */}
            {showMobileSidebar && (
              <>
                <div className="mobile-sidebar-backdrop" onClick={() => setShowMobileSidebar(false)} />
                <aside className="mobile-sidebar">
                  <div className="mobile-sidebar-header">
                    <h3>Menu</h3>
                    <button className="close-mobile-sidebar" onClick={() => setShowMobileSidebar(false)}>
                      <X size={24} />
                    </button>
                  </div>
                  <nav>
                    <ul>
                      <li>
                        <a href="/home" onClick={(e) => { e.preventDefault(); handleMobileLink("/home"); }}>
                          <Home className="nav-icon" size={18} /> Home
                        </a>
                      </li>
                      <li>
                        <a href="/delivery" onClick={(e) => { e.preventDefault(); handleMobileLink("/delivery"); }}>
                          <Truck className="nav-icon" size={18} /> Delivery
                        </a>
                      </li>
                      <li>
                        <a href="/return" onClick={(e) => { e.preventDefault(); handleMobileLink("/return"); }}>
                          <RotateCcw className="nav-icon" size={18} /> Return
                        </a>
                      </li>
                      <li>
                        <a href="/products" onClick={(e) => { e.preventDefault(); handleMobileLink("/products"); }}>
                          <Package className="nav-icon" size={18} /> Products
                        </a>
                      </li>
                      <li>
                        <a href="/orders" onClick={(e) => { e.preventDefault(); handleMobileLink("/orders"); }}>
                          <ShoppingBag className="nav-icon" size={18} /> Orders
                        </a>
                      </li>
                      <li>
                        <a href="/Category" onClick={(e) => { e.preventDefault(); handleMobileLink("/Category"); }}>
                          <Tags className="nav-icon" size={18} /> Category
                        </a>
                      </li>
                      <li>
                        <a href="/statistics" onClick={(e) => { e.preventDefault(); handleStatisticsClick(e); }}>
                          <BarChart3 className="nav-icon" size={18} /> Statistics
                        </a>
                      </li>

                    </ul>
                  </nav>
                </aside>
              </>
            )}

            {/* Header */}
            <header className="top-bar">
              <div className="top-left">
                <button className="hamburger-menu" onClick={() => setShowMobileSidebar(true)}>
                  <Menu size={24} />
                </button>
                <img src="/icons/icon-512x512.png" alt="Logo" className="header-logo" />
              </div>

              <div className="user-profile" ref={dropdownRef} style={{ position: "relative", cursor: "pointer" }}>
                <div onClick={() => setShowDropdown((s) => !s)}>
                  Hi, {user?.name ?? "User"} <span style={{ marginLeft: 6 }}>▼</span>
                </div>

                {showDropdown && (
                  <div className="user-dropdown">
                    <button onClick={() => handleDropdownLink("/profile")} className="dropdown-item">
                      <User className="icon" size={16} /> Profile
                    </button>
                    <button onClick={() => handleDropdownLink("/change-password")} className="dropdown-item">
                      <Lock className="icon" size={16} /> Change Password
                    </button>
                    <button onClick={() => handleDropdownLink("/change-stats-password")} className="dropdown-item">
                      <BarChart3 className="icon" size={16} /> Change Statistics Password
                    </button>
                    <button onClick={handleLogout} className="dropdown-item logout">
                      <LogOut className="icon" size={16} /> Logout
                    </button>
                  </div>
                )}
              </div>
            </header>

          </>
        )}

        <main className={`main-content ${!hideLayout ? "with-layout" : ""}`}>
          {children}
        </main>

        {/* Password Modal with Eye Icon */}
        {showStatsPassword && (
          <div className="modal-backdrop">
            <div className="modal">
              <h3>Enter Statistics Password</h3>

              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  value={statsPassword}
                  onChange={(e) => setStatsPassword(e.target.value)}
                  placeholder="Password"
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowPassword((p) => !p)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {statsError && <p className="error">{statsError}</p>}

              <div className="modal-actions">
                <button onClick={verifyStatsPassword}>Submit</button>
                <button onClick={() => setShowStatsPassword(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        
      </body>
    </html>
  );
}
