"use client";

import React from "react";

interface ModalProps {
  isOpen: boolean;
  message: string;
  onClose: () => void;
  type?: "error" | "success"; 
}

export default function Modal({ isOpen, message, onClose, type = "error" }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className={`modal-content ${type}`}>
        <p>{message}</p>
        <button onClick={onClose}>OK</button>
      </div>
    </div>
  );
}
