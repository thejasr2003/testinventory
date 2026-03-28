"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import "./category.css";

interface Category {
  id: string;
  name: string;
  parentName: string;
}

export default function CategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [filterParent, setFilterParent] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [parentName, setParentName] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ✅ Use label (UI text) and value (backend save value)
  const parentOptions = [
    { label: "Wedding", value: "Wedding" },
    { label: "Men", value: "Male" },
    { label: "Women", value: "Female" },
  ];

  const fetchCategories = async () => {
    const res = await fetch("/api/category");
    const { data } = await res.json();
    setCategories(data);
    setFilteredCategories(data);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // ✅ Automatically filter categories when filterParent changes
  useEffect(() => {
    if (filterParent === "All") {
      setFilteredCategories(categories);
    } else {
      setFilteredCategories(
        categories.filter((cat) => cat.parentName === filterParent)
      );
    }
  }, [filterParent, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("parentName", parentName);

    const url = editing ? `/api/category/${editing.id}` : "/api/category";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, { method, body: formData });
    if (res.ok) {
      await fetchCategories();
      setShowModal(false);
      setEditing(null);
      setName("");
      setParentName("");
      setErrorMsg("");
    } else {
      const err = await res.json();
      setErrorMsg(err.message || "Something went wrong");
    }
    setLoading(false);
  };

  const handleEdit = (cat: Category) => {
    setEditing(cat);
    setName(cat.name);
    setParentName(cat.parentName);
    setShowModal(true);
  };

  const handleDelete = (cat: Category) => {
    setDeleting(cat);
    setDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);

    const res = await fetch(`/api/category/${deleting.id}`, { method: "DELETE" });
    if (res.ok) {
      await fetchCategories();
      setDeleteModal(false);
      setDeleting(null);
    }

    setDeleteLoading(false);
  };

  return (
    <div className="category-container">
      <div className="category-header">
        <h2 className="category-title">Category Management</h2>

        <div className="header-right">
            <div className="dropdown-wrapper">
              <select
                className="filter-dropdown"
                value={filterParent}
                onChange={(e) => setFilterParent(e.target.value)}
              >
                <option value="All">All</option>
                {parentOptions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <span className="dropdown-arrow"></span> {/* custom arrow */}
            </div>
          <button className="create-btn" onClick={() => setShowModal(true)}>
            + Create Category
          </button>
        </div>
      </div>



      <div className="table-card">
        <table className="category-table">
          <thead>
            <tr>
              <th>Parent</th>
              <th>Name</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredCategories.length > 0 ? (
              filteredCategories.map((cat) => (
                <tr key={cat.id}>
                  <td>{cat.parentName === "Male" ? "Men" : cat.parentName === "Female" ? "Women" : cat.parentName}</td>
                  <td>{cat.name}</td>
                  <td>
                    <div className="action-icons">
                      <button
                        className="icon-btn edit"
                        onClick={() => handleEdit(cat)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-btn delete"
                        onClick={() => handleDelete(cat)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="no-data">
                  No categories found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>{editing ? "Edit Category" : "Create Category"}</h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Parent Name</label>
                <select
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  required
                >
                  <option value="">Select Parent</option>
                  {parentOptions.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Category Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* 🔴 ERROR MESSAGE HERE */}
              {errorMsg && (
                <p style={{ color: "red", marginBottom: "10px", fontSize: "14px" }}>
                  {errorMsg}
                </p>
              )}

              <div className="modal-actions">
                <button type="submit" className="save-btn" disabled={loading}>
                  {loading ? "Saving..." : editing ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal && deleting && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>Delete Category?</h3>
            </div>
            <p className="note">
              Are you sure you want to delete <b>{deleting.name}</b>?
            </p>
            <div className="modal-actions">
              <button
                className="delete-btn"
                onClick={confirmDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
              <button
                className="cancel-btn"
                onClick={() => setDeleteModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
