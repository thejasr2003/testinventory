'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styles from './view.module.css';

type ProductDetail = {
  id: string;
  name: string;
  price: number;
  sku: string;
  category: string;
  size: string | string[];  
  gender: string;
  images?: string[];
};

export default function ViewProductPage() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetail | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      const res = await fetch(`/api/products/${id}`);
      const data = await res.json();
      setProduct(data.data);
    };
    fetchProduct();
  }, [id]);

  if (!product) return <div className={styles.loading}>Loading...</div>;

  const sizeDisplay = Array.isArray(product.size)
    ? product.size.join(', ')
    : product.size;

  return (
    <div className={styles.container}>
      <div className={styles.breadcrumb}>
        <span
          className={styles.breadcrumbLink}
          onClick={() => router.push('/products')}
        >
          Products
        </span>{' '}
        &gt; <span>View</span>
      </div>

      <div className={styles.detailsCard}>
        <div className={styles.infoSection}>
          <h2 className={styles.title}>{product.name}</h2>
          <p className={styles.price}>₹{product.price}</p>
          <p className={styles.sku}>{product.sku}</p>

          <div className={styles.tags}>
            <span className={styles.tag}>{product.gender}</span>
            <span className={styles.tag}>{product.category}</span>
            <span className={styles.tag}>{sizeDisplay}</span>
            <span className={styles.tag}>{product.sku}</span>
          </div>
        </div>

        <div className={styles.imageSection}>
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className={styles.image}
            />
          ) : (
            <div className={styles.noImage}>No image</div>
          )}
        </div>
      </div>
    </div>
  );
}
