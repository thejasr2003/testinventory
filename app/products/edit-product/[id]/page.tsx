'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Select from 'react-select';
import styles from './editProduct.module.css';

export default function EditProductPage() {
  const router = useRouter();
  const { id } = useParams();

  const [gender, setGender] = useState('');
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [size, setSize] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [sizeError, setSizeError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<{ index: number; isExisting: boolean; url?: string } | null>(null);


  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const menSizes = ['34', '36', '38', '40', '42', '44', '46'];
  const womenSizes = ['Free Size', 'XS', 'S', 'M', 'L', 'XL', 'XXL'];

  // ✅ Generate size options dynamically
  const getSizeOptions = (gender: string) => {
    if (gender === 'Men') return menSizes.map((s) => ({ value: s, label: s }));
    if (gender === 'Women') return womenSizes.map((s) => ({ value: s, label: s }));
    return [];
  };

  const [sizeOptions, setSizeOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (id) fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    const res = await fetch(`/api/products/${id}`);
    const data = await res.json();
    const p = data.data;

    const productGender = p.gender || '';
    setGender(productGender);

    // Fetch categories + setup size options based on gender
    await handleGenderChange(productGender, true);

    // ✅ After categories are loaded and gender is set
    setName(p.name || '');
    setSku(p.sku || '');
    setCategory(p.category || '');
    setPrice(p.price?.toString() || '');
    setDescription(p.description || '');
    setExistingImages(p.images || []);

    // ✅ Normalize size field
    const sizes = Array.isArray(p.size)
      ? p.size[0]?.split(',') ?? []
      : typeof p.size === 'string'
      ? p.size.split(',')
      : [];
    const trimmedSizes = sizes.map((s: string) => s.trim());
    setSize(trimmedSizes);

    // ✅ Update size options for selected gender
    setSizeOptions(getSizeOptions(productGender));
  };

  const handleGenderChange = async (selectedGender: string, keepCategory = false) => {
    setGender(selectedGender);
    setSizeOptions(getSizeOptions(selectedGender));

    if (!keepCategory) {
      setCategory('');
      setSize([]);
    }

    const parentName = selectedGender === 'Men' ? 'Male' : 'Female';

    try {
      const res = await fetch(`/api/category?parentName=${parentName}`);
      const data = await res.json();

      if (data?.data) {
        const formatted = data.data.map((item: any) => ({
          value: item.name,
          label: item.name,
        }));
        setCategoryOptions(formatted);
      } else {
        setCategoryOptions([]);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setCategoryOptions([]);
    }
  };

  const addImages = (files: FileList | File[]) => {
    const validImages = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (validImages.length > 0) {
      const newImages = [...images, ...validImages];
      setImages(newImages);
      setPreviewUrls(newImages.map((f) => URL.createObjectURL(f)));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addImages(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    addImages(e.dataTransfer.files);
  };

  const handleRemoveImage = (index: number, isExisting: boolean = false) => {
    if (isExisting) {
      setImageToDelete({
        index,
        isExisting,
        url: existingImages[index],
      });
    } else {
      setImageToDelete({ index, isExisting });
    }
    setShowDeleteModal(true);
  };

  const confirmDeleteImage = async () => {
    if (!imageToDelete) return;

    const { index, isExisting, url } = imageToDelete;

    if (isExisting && url) {
      try {
        const res = await fetch(`/api/products/delete-image`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: url, productId: id }),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          const msg = data?.message || 'Failed to delete image';
          throw new Error(msg);
        }

        setExistingImages(existingImages.filter((_, i) => i !== index));
      } catch (err) {
        alert('❌ Error deleting image: ' + String(err));
        console.error(err);
      }
    } else {
      setImages(images.filter((_, i) => i !== index));
      setPreviewUrls(previewUrls.filter((_, i) => i !== index));
    }

    setShowDeleteModal(false);
    setImageToDelete(null);
  };



  const handleSubmit = async () => {
    if (!gender || !name || !sku || !category || !price) {
      alert('Please fill all required fields');
      return;
    }

    if (size.length === 0) {
      setSizeError('Size is Required');
      return;
    } else {
      setSizeError('');
    }

    setLoading(true);
    setSuccessMessage('');

    const formData = new FormData();
    formData.append('name', name);
    formData.append('sku', sku);
    formData.append('category', category);
    formData.append('price', price);
    formData.append('size', size.join(','));
    formData.append('description', description);
    formData.append('gender', gender);
    formData.append('status', 'available');

    images.forEach((img) => formData.append('images', img));
    existingImages.forEach((url) => formData.append('images', url));

    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      body: formData,
    });

    setLoading(false);

    if (res.ok) {
      setSuccessMessage('✅ Product updated successfully!');
      setTimeout(() => router.push('/products'), 1500);
    } else {
      const data = await res.json();
      alert('Error: ' + (data?.message || 'Something went wrong!'));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.breadcrumb}>
        <span className={styles.breadcrumbLink} onClick={() => router.push('/products')}>
          Products
        </span>
        <span className={styles.breadcrumbDivider}>›</span>
        <span className={styles.breadcrumbActive}>Edit Product</span>
      </div>

      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        {/* Gender */}
        <div className={styles.row}>
          <label className={styles.required}>Gender Type:</label>
          <div className={styles.radioGroup}>
            <label>
              <input
                type="radio"
                name="gender"
                value="Men"
                checked={gender === 'Men'}
                onChange={() => handleGenderChange('Men')}
              />
              Men
            </label>
            <label>
              <input
                type="radio"
                name="gender"
                value="Women"
                checked={gender === 'Women'}
                onChange={() => handleGenderChange('Women')}
              />
              Women
            </label>
          </div>
        </div>

        {/* SKU & Name */}
        <div className={styles.row}>
          <div className={styles.formGroup}>
            <label className={styles.required}>SKU</label>
            <input
              className={styles.input}
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="SKU"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.required}>Product Name</label>
            <input
              className={styles.input}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Product Name"
            />
          </div>
        </div>

        {/* Category, Price, Size */}
        <div className={styles.row}>
          <div className={styles.formGroup}>
            <label className={styles.required}>Category</label>
            <Select
              classNamePrefix="react-select"
              options={categoryOptions}
              value={categoryOptions.find((opt) => opt.value === category) || null}
              onChange={(val) => setCategory(val?.value || '')}
              placeholder="Select category"
              isDisabled={!gender}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              styles={{
                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
              }}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.required}>Price (₹)</label>
            <input
              className={styles.input}
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter Price"
              inputMode="numeric"
            />
          </div>

          {/* ✅ SIZE field */}
          <div className={styles.formGroup} style={{ flex: 1 }}>
            <label className={styles.required}>Size</label>
            <Select
              isMulti
              options={sizeOptions}
              value={sizeOptions.filter((opt) => size.includes(opt.value))}
              onChange={(selected) => {
                setSize(selected.map((opt) => opt.value));
                setSizeError('');
              }}
              placeholder="Select size(s)"
              isDisabled={!gender}
            />
            {sizeError && (
              <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{sizeError}</p>
            )}
          </div>
        </div>

        {/* Description & Images */}
        <div className={styles.gridTwo}>
          <div className={styles.gridItem}>
            <label>Description</label>
            <textarea
              className={styles.textarea}
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
            />
            <p style={{ fontSize: '12px', color: '#6b7280' }}>{description.length} / 1000</p>
          </div>

          <div className={styles.gridItem}>
            <label>Upload Images</label>
            <div
              className={`${styles.uploadBox} ${isDragging ? styles.dragOver : ''}`}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
            >
              {existingImages.length > 0 || previewUrls.length > 0 ? (
                <div className={styles.previewContainer}>
                  {[...existingImages, ...previewUrls].map((src, i) => (
                    <div key={i} className={styles.previewWrapper}>
                      <img src={src} alt={`Preview ${i}`} className={styles.previewImage} />
                      <button
                        type="button"
                        className={styles.removeButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage(i, i < existingImages.length);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <span className={styles.addMoreText}>Click or drop more</span>
                </div>
              ) : (
                <p className={styles.uploadText}>
                  Drag & Drop images here or <span className={styles.uploadLink}>Click to select</span>
                  <br />
                  <span className={styles.uploadNote}>Supported: PNG, JPG, JPEG — Max 5MB</span>
                </p>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.button} ${styles.cancelButton}`}
            onClick={() => router.push('/products')}
          >
            Cancel
          </button>

          <button
            type="submit"
            className={`${styles.button} ${styles.submitButton}`}
            disabled={loading}
          >
            {loading ? <span className={styles.loader}></span> : 'Save Changes'}
          </button>
        </div>

        {successMessage && <p className={styles.successMessage}>{successMessage}</p>}
      </form>

      {showDeleteModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px 30px',
              width: '90%',
              maxWidth: '400px',
              textAlign: 'center',
              boxShadow: '0 4px 25px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>
              Are you sure you want to delete this image?
            </h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#e5e7eb',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteImage}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#ef4444',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
