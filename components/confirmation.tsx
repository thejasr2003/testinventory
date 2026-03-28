'use client';

import styles from './confirmation.module.css';

type ConfirmationProps = {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
};

export default function Confirmation({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Confirm Deletion',
  message = 'Are you sure you want to delete this?',
}: ConfirmationProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.close} onClick={onCancel}>
          &times;
        </button>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button className={styles.cancel} onClick={onCancel}>
            Cancel
          </button>
          <button className={styles.confirm} onClick={onConfirm}>
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
}
