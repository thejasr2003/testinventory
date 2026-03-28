"use client";

import "./organization.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Organization {
  id: string;
  organizationName: string;
  ownerName: string;
  description: string;
  email: string;
  contactNumber: string;
  address: string;
  logo?: string;
  billingRules: string[];
  activeTill?: string;
  logoFile?: File; 
}

export default function OrganizationDetails() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false); 
  const router = useRouter();

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const res = await fetch("/api/organization/get-organization-info");
        const data = await res.json();

        if (data.success && data.data.length > 0) {
          const org = data.data[0];
          setOrganization(org);
          setNotes(org.billingRules || [""]);
        }
      } catch (err) {
        console.error("Error fetching organization:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganization();
  }, []);

  const addNote = () => setNotes([...notes, ""]);
  const removeNote = (index: number) => setNotes(notes.filter((_, i) => i !== index));
  const updateNote = (index: number, value: string) => {
    const updated = [...notes];
    updated[index] = value;
    setNotes(updated);
  };

  // ✅ Save handler (supports JSON + FormData upload)
  const handleSave = async () => {
    if (!organization) return;

    setSaving(true); // start saving
    try {
      let body: BodyInit;
      let headers: HeadersInit = {};

      if (organization.logoFile) {
        // Multipart FormData if file present
        const formData = new FormData();
        formData.append("id", organization.id);
        formData.append("organizationName", organization.organizationName);
        formData.append("ownerName", organization.ownerName);
        formData.append("description", organization.description);
        formData.append("address", organization.address);
        formData.append("billingRules", JSON.stringify(notes));
        formData.append("logo", organization.logoFile);
        body = formData;
      } else {
        // Fallback to JSON
        headers["Content-Type"] = "application/json";
        body = JSON.stringify({
          ...organization,
          billingRules: notes,
        });
      }

      const res = await fetch("/api/organization/update-organization", {
        method: "PUT",
        headers,
        body,
      });

      const data = await res.json();
      if (data.success) {
        alert("✅ Changes saved successfully!");
        router.refresh();
      } else {
        alert(data.message || "❌ Failed to update organization");
      }
    } catch (err) {
      console.error("Error updating organization:", err);
      alert("❌ Error updating organization");
    } finally {
      setSaving(false); 
    }
  };

  if (loading)
    return <div className="organization-container">Loading...</div>;
  if (!organization)
    return <div className="organization-container">No organization found</div>;

  return (
    <div className="organization-container">
      <div className="breadcrumb">
        <span>Home</span> <span className="arrow">›</span>{" "}
        <span>Organization Details</span>
      </div>

      <div className="form-section">
        <div className="left-image">
          <div className="image-circle">
            <img
              src={organization.logo || "/default-logo.png"}
              alt="Logo"
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />

            {/* 📷 Camera icon triggers hidden file input */}
            <label htmlFor="logoUpload" className="camera-icon">
              📷
            </label>
            <input
              id="logoUpload"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setOrganization({
                    ...organization,
                    logo: URL.createObjectURL(file),
                    logoFile: file,
                  });
                }
              }}
            />
          </div>
        </div>

        <div className="right-form">
          <div className="row">
            <div className="input-group">
              <label>Org.Name</label>
              <input
                type="text"
                value={organization.organizationName}
                onChange={(e) =>
                  setOrganization({
                    ...organization,
                    organizationName: e.target.value,
                  })
                }
              />
            </div>
            <div className="input-group">
              <label>Owner Name</label>
              <input
                type="text"
                value={organization.ownerName}
                onChange={(e) =>
                  setOrganization({
                    ...organization,
                    ownerName: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="row">
            <div className="input-group full">
              <label>Description</label>
              <input
                type="text"
                value={organization.description}
                onChange={(e) =>
                  setOrganization({
                    ...organization,
                    description: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="row">
            <div className="input-group full">
              <label>Address</label>
              <input
                type="text"
                value={organization.address}
                onChange={(e) =>
                  setOrganization({
                    ...organization,
                    address: e.target.value,
                  })
                }
              />
            </div>
          </div>
        </div>
      </div>

      <div className="notes-section">
        <h3>Special Notes</h3>
        {notes.map((note, i) => (
          <div key={i} className="note-row">
            <input
              type="text"
              value={note}
              onChange={(e) => updateNote(i, e.target.value)}
              placeholder="Add note..."
            />
            {notes.length > 1 && (
              <button
                className="delete-btn"
                onClick={() => removeNote(i)}
              >
                🗑️
              </button>
            )}
          </div>
        ))}
        <button className="add-btn" onClick={addNote}>
          + Add More Notes
        </button>
      </div>

      <div className="save-section">
        {/* ✅ Save button now shows “Saving...” while updating */}
        <button
          className="save-btn"
          onClick={handleSave}
          disabled={saving}
          style={{ opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
