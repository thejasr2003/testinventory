"use client";

import { useState } from "react";
import "./ChangePassword.css";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ChangePassword() {
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
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (!user?.id) {
        setMessage("❌ User not found. Please log in again.");
        setIsError(true);
        return;
      }

      setIsLoading(true);

      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      setIsLoading(false);

      if (res.ok) {
        setMessage("✅ Password changed successfully!");
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
      setMessage("❌ Error updating password.");
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
        <span className="breadcrumb-current">Change Password</span>
      </div>

      <div className="change-password-page">
        <div className="change-password-card">
          <h2>Change Password</h2>
          <p>Update your account password securely</p>

          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label>Current Password</label>
              <div className="password-input">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
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
              <label>New Password</label>
              <div className="password-input">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
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
              <label>Confirm Password</label>
              <div className="password-input">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
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
              {isLoading ? "Updating..." : "Update Password"}
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
