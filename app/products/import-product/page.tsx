'use client';

import styles from './import.module.css';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaCloudUploadAlt } from 'react-icons/fa'; 

export default function ImportProductPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [gender, setGender] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([]); // ✅ same structure
  const [isImporting, setIsImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [skippedProducts, setSkippedProducts] = useState<Array<{ sku: string, reason: string }>>([]);

  // ✅ EXACT same logic as AddProductPage
  const handleGenderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedGender = e.target.value;
    setGender(selectedGender);
    setCategory('');
    setFile(null);
    setSkippedProducts([]);
    setErrorMessage(null);

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

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategory(e.target.value);
    setFile(null);
    setSkippedProducts([]);
    setErrorMessage(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    setErrorMessage(null);
    setSkippedProducts([]);

    if (!file || !gender || !category) {
      setErrorMessage(' Please select gender, category, and a CSV file.');
      return;
    }

    const formData = new FormData();
    formData.append('csv', file);
    formData.append('gender', gender);
    formData.append('category', category);

    setIsImporting(true);

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message || ' Failed to import products.');
        return;
      }

      if (data.imported > 0) {
        alert(`✅ ${data.imported} product(s) imported.`);

        if (data.skipped && data.skipped.length > 0) {
          setSkippedProducts(data.skipped);
        }

        router.push('/products');
      } else if (data.skipped && data.skipped.length > 0) {
        setSkippedProducts(data.skipped);
        setErrorMessage(' No products were imported.');
      } else {
        setErrorMessage(' Import failed. No products processed.');
      }

    } catch (error) {
      console.error('Import error:', error);
      setErrorMessage(' Something went wrong. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const isFileInputEnabled = gender !== '' && category !== '';
  const isImportEnabled = isFileInputEnabled && file !== null;

  const sampleCSV = `name,description,price,sku,size
MEN BLAZER FORMAL,Premium formal blazer for men,499,BLAZER00345,34
WOMEN DENIM JACKET,Trendy denim jacket for women,699,DENIM00245,"36,38,40,42"
UNISEX T-SHIRT,Cotton t-shirt with relaxed fit,299,TSHIRT00145,"34,38"
SPORTS SHOES,High-grip lightweight running shoes,1299,KRRNJ445,"38,40,42"
KIDS HOODIE,Warm hoodie for kids with cartoon print,399,HOODIE001565,"36,38"
`;

  const handleDownloadCSV = () => {
    const blob = new Blob([sampleCSV], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'sample-products.csv';
    link.click();
  };

  return (
    <div className={styles.importContainer}>
      <nav className={styles.breadcrumb}>
        <Link href="/products">Products</Link> &gt; <span>Import Products</span>
      </nav>

      <div className={styles.importCard}>
        <h2>Import Product CSV</h2>

        <div className={styles.radioGroup}>
          <label>
            <input
              type="radio"
              name="gender"
              value="Men"
              checked={gender === 'Men'}
              onChange={handleGenderChange}
            /> Men
          </label>
          <label>
            <input
              type="radio"
              name="gender"
              value="Women"
              checked={gender === 'Women'}
              onChange={handleGenderChange}
            /> Women
          </label>
        </div>

        {/* ✅ Same dynamic category dropdown like AddProductPage */}
        <select
          className={styles.select}
          value={category}
          onChange={handleCategoryChange}
          disabled={gender === ''}
        >
          <option value="">Select category</option>
          {categoryOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Drag and Drop File Upload */}
        <div
          className={`${styles.fileDrop} ${!isFileInputEnabled ? styles.disabledLabel : ''}`}
        >
          <label
            htmlFor="csvFileInput"
            className={styles.fileLabel}
          >
            <FaCloudUploadAlt size={50} color="#111827" />
            <p>Select a CSV file to import <br />or drag and drop it here (Max: 1MB)</p>
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            id="csvFileInput"
            style={{ display: 'none' }}
            disabled={!isFileInputEnabled}
          />
        </div>

        {file && (
          <p className={styles.fileName}>
            📄 {file.name}
          </p>
        )}

        <div className={styles.actions}>
          <button
            className={styles.sampleCSVBtn}
            onClick={handleDownloadCSV}
          >
            Download Sample CSV
          </button>
        </div>

        {errorMessage && (
          <div className={styles.errorMessage}>
            {errorMessage}
          </div>
        )}

        {skippedProducts.length > 0 && (
          <div className={styles.skippedBox}>
            <h4> Skipped Products:</h4>
            <ul>
              {skippedProducts.map((item, index) => (
                <li key={index}>
                  <strong>{item.sku}</strong>: {item.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.actions}>
          <button
            className={styles.discardBtn}
            onClick={() => {
              setGender('');
              setCategory('');
              setCategoryOptions([]);
              setFile(null);
              setSkippedProducts([]);
              setErrorMessage(null);
            }}
          >
            Discard
          </button>
          <button
            className={`${styles.importBtn} ${!isImportEnabled || isImporting ? styles.disabledBtn : ''}`}
            onClick={handleImport}
            disabled={!isImportEnabled || isImporting}
          >
            {isImporting ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
