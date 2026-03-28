"use client";

import { useState } from "react";
import "../change-password/ChangePassword.css"; 
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ChangeStatsPassword() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);

    if (newPassword.length < 6) {
      setMessage("❌ New password must be at least 6 characters long.");
      setIsError(true);
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("❌ New password and confirm password do not match.");
      setIsError(true);
      return;
    }

    try {
      setIsLoading(true);

      const res = await fetch("/api/statistics/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      setIsLoading(false);

      if (res.ok && data.success) {
        setMessage("✅ Statistics password changed successfully!");
        setIsError(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        router.push("/home");
      } else {
        setMessage(`❌ ${data.message || "Current password is incorrect."}`);
        setIsError(true);
      }
    } catch (err) {
      console.error(err);
      setIsLoading(false);
      setMessage("❌ Error updating statistics password.");
      setIsError(true);
    }
  };

  return (
    <div className="change-password-container">
      <div className="breadcrumb-container">
        <span className="breadcrumb-home" onClick={() => router.push("/home")}>
          Home
        </span>
        <span className="breadcrumb-separator">›</span>
        <span className="breadcrumb-current">Change Statistics Password</span>
      </div>

      <div className="change-password-page">
        <div className="change-password-card">
          <h2>Change Statistics Password</h2>
          <p>Update the password used for viewing Statistics</p>

          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label>Current Statistics Password</label>
              <div className="password-input">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current statistics password"
                  required
                />
                <span
                  className="toggle-visibility"
                  onClick={() => setShowCurrent((prev) => !prev)}
                >
                  {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label>New Statistics Password</label>
              <div className="password-input">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new statistics password"
                  required
                />
                <span
                  className="toggle-visibility"
                  onClick={() => setShowNew((prev) => !prev)}
                >
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm Statistics Password</label>
              <div className="password-input">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new statistics password"
                  required
                />
                <span
                  className="toggle-visibility"
                  onClick={() => setShowConfirm((prev) => !prev)}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </span>
              </div>
            </div>

            <button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Statistics Password"}
            </button>
          </form>

          {message && (
            <div className={`status ${isError ? "error" : "success"}`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
