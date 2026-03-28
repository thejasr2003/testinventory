'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Edit2, Trash2, ChevronDown, Archive, WashingMachine, CheckCircle } from 'lucide-react';
import styles from './products.module.css';
import Confirmation from '../../components/confirmation';

type Product = {
  id: string;
  sku: string;
  name: string;
  price: number;
  images?: string[];
  status: string;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState('available');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const res = await fetch('/api/products');
    const data = await res.json();
    setProducts(data.data);
  };

  const openDeleteModal = (id: string) => {
    setSelectedProductId(id);
    setModalOpen(true);
  };

  const closeDeleteModal = () => {
    setSelectedProductId(null);
    setModalOpen(false);
  };

  const confirmDelete = async () => {
    if (selectedProductId) {
      try {
        const res = await fetch(`/api/products/${selectedProductId}`, { method: 'DELETE' });
        const data = await res.json();

        if (!res.ok) {
          alert(data.message || 'Failed to delete product');
          closeDeleteModal();
          return;
        }

        setProducts((prev) => prev.filter((p) => p.id !== selectedProductId));
        alert(data.message || 'Product deleted successfully');
        closeDeleteModal();
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Something went wrong while deleting.');
      }
    }
  };

  const handleDropdownToggle = (id: string, event: React.MouseEvent) => {
    if (openDropdownId === id) {
      setOpenDropdownId(null);
      setDropdownPosition(null);
    } else {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX
      });
      setOpenDropdownId(id);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });

    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
    );
    setOpenDropdownId(null);
    setDropdownPosition(null);
  };

  const filteredProducts = products
    .filter((p) => {
      const searchLower = search.trim().toLowerCase();
      return (
        (p.sku.toLowerCase().startsWith(searchLower) ||
          p.name.toLowerCase().startsWith(searchLower)) &&
        p.status.toLowerCase() === filter.toLowerCase()
      );
    })
    .sort((a, b) => {
      if (search.trim() !== "") {
        const skuCompare = a.sku.localeCompare(b.sku);
        return skuCompare !== 0 ? skuCompare : a.name.localeCompare(b.name);
      }
      return 0;
    });

  // pagination logic
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available':
        return styles.statusGreen;
      case 'in laundry':
        return styles.statusBlue;
      case 'archived':
        return styles.statusGray;
      default:
        return '';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available':
        return <CheckCircle size={14} />;
      case 'in laundry':
        return <WashingMachine size={14} />;
      case 'archived':
        return <Archive size={14} />;
      default:
        return null;
    }
  };

  return (
    <>
      <div className={styles.container}>
        <div className={styles.breadcrumb}>Product</div>
        <div className={styles.header}>
          <div className={styles.controls}>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className={styles.select}
            >
              <option value="available">Available</option>
              <option value="in Laundry">In Laundry</option>
              <option value="archived">Archived</option>
            </select>
            <input
              type="text"
              placeholder="Search by SKU or NAME"
              className={styles.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Link href="/products/add-product" className={styles.addBtn}>
              + Add Product
            </Link>
            <Link href="/products/import-product" className={styles.addBtn}>
              Import
            </Link>
          </div>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Image</th>
              <th>SKU</th>
              <th>Product Name</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((product) => (
              <tr key={product.id}>
                <td className={styles.imageCell}>
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className={styles.productImage}
                    />
                  ) : (
                    <div className={styles.noImage}>No Image</div>
                  )}
                </td>
                <td>
                  {Array.isArray(product.size)
                    ? product.size.length > 0
                      ? `${product.sku}-${product.size.join(', ')}`
                      : product.sku
                    : product.size
                      ? `${product.sku}-${product.size}`
                      : product.sku}
                </td>
                <td className={styles.productName}>
                  <Link href={`/products/view/${product.id}`} className={styles.productLink}>
                    {product.name}
                  </Link>
                </td>
                <td>₹{product.price}</td>
                <td>
                  <div
                    className={`${styles.dropdownWrapper} ${getStatusColor(product.status)}`}
                    onClick={(e) => handleDropdownToggle(product.id, e)}
                  >
                    {getStatusIcon(product.status)}
                    <span className={styles.dropdownText}>{product.status}</span>
                    <ChevronDown size={14} />
                  </div>
                </td>
                <td>
                  <Link href={`/products/edit-product/${product.id}`} className={styles.edit}>
                    <Edit2 size={16} />
                  </Link>
                  <button
                    onClick={() => openDeleteModal(product.id)}
                    className={styles.delete}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {currentItems.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.noData}>
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={styles.pageBtn}
            >
              Prev
            </button>

            {(() => {
              const windowSize = 3; // number of visible page buttons
              const windowStart = Math.floor((currentPage - 1) / windowSize) * windowSize + 1;
              const windowEnd = Math.min(windowStart + windowSize - 1, totalPages);

              const visiblePages = [];
              for (let i = windowStart; i <= windowEnd; i++) {
                visiblePages.push(i);
              }

              return visiblePages.map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`${styles.pageBtn} ${currentPage === page ? styles.activePage : ''}`}
                >
                  {page}
                </button>
              ));
            })()}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={styles.pageBtn}
            >
              Next
            </button>
          </div>
        )}



        {/* Dropdown Menu */}
        {openDropdownId && dropdownPosition && (
          <div
            className={styles.dropdownMenu}
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
            }}
          >
            <div
              className={styles.dropdownOption}
              onClick={() => handleStatusChange(openDropdownId, 'available')}
            >
              <CheckCircle size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Available
            </div>
            <div
              className={styles.dropdownOption}
              onClick={() => handleStatusChange(openDropdownId, 'in Laundry')}
            >
              <WashingMachine size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              In Laundry
            </div>
            <div
              className={styles.dropdownOption}
              onClick={() => handleStatusChange(openDropdownId, 'archived')}
            >
              <Archive size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Archived
            </div>
          </div>
        )}

        {openDropdownId && (
          <div
            className={styles.dropdownBackdrop}
            onClick={() => {
              setOpenDropdownId(null);
              setDropdownPosition(null);
            }}
          />
        )}
      </div>

      <Confirmation
        isOpen={modalOpen}
        onConfirm={confirmDelete}
        onCancel={closeDeleteModal}
        title="Confirm Product Deletion?"
        message="Are you sure you want to delete this product? This action cannot be undone."
      />
    </>
  );
}
