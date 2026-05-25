"use client";

import { useState, useEffect } from "react";
import Select from "react-select";
import { useRouter, useParams } from "next/navigation";
import Modal from "./Modal";
import "./update.css";

interface ProductOption {
  value: string;
  label: string;
  price: number;
  image: string;
  size?: string[];
}

interface ProductCard {
  id: number;
  product: ProductOption | null;
  size: string;
  amount: string;
  finalPrice: string;
  deliveryDate: string;
  returnDate: string;
  productLockId?: string;
}

export default function UpdateBooking() {
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id;

  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productCards, setProductCards] = useState<ProductCard[]>([
    { id: 1, product: null, size: "", amount: "", finalPrice: "", deliveryDate: "", returnDate: "" },
  ]);
  const [securityDeposit, setSecurityDeposit] = useState<number>(0);
  const [advance, setAdvance] = useState<number>(0);
  const [additionalCharges, setAdditionalCharges] = useState<number>(0);
  const [sameDate, setSameDate] = useState<boolean>(false);
  const [globalDeliveryDate, setGlobalDeliveryDate] = useState<string>("");
  const [globalReturnDate, setGlobalReturnDate] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [rentAmount, setRentAmount] = useState<number>(0);
  const [totalDeposit, setTotalDeposit] = useState<number>(0);
  const [returnAmount, setReturnAmount] = useState<number>(0);

  const [selectedBookingType, setSelectedBookingType] = useState<string>("");
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [phoneNumberPrimary, setPhoneNumberPrimary] = useState("");
  const [phoneNumberSecondary, setPhoneNumberSecondary] = useState("");
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState<any>({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"success" | "error">("success");
  const [redirectAfterModal, setRedirectAfterModal] = useState<string | null>(null);
  const [bookingTypeOptions, setBookingTypeOptions] = useState<{ value: string; label: string }[]>([]);


  const showModal = (
    msg: string,
    type: "error" | "success" = "error",
    redirectUrl?: string
  ) => {
    setModalMessage(msg);
    setModalType(type);
    setRedirectAfterModal(redirectUrl || null);
    setIsModalOpen(true);
  };

  const safeNumber = (val: string) => (isNaN(parseFloat(val)) ? 0 : parseFloat(val));
  const isValidPhoneNumber = (num: string) => /^[0-9]{10}$/.test(num);
  const isAlpha = (val: string) => /^[A-Za-z\s]+$/.test(val);
  const handleNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = e.target.value.replace(/[^A-Za-z\s]/g, "");
  };
  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
  };

  const addDays = (dateStr: string, days: number) => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
  };

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("/api/products");
        if (!res.ok) {
          if (res.status === 401) {
            console.warn("Session expired, redirecting to login");
            router.push("/sign-in");
            return;
          }
          console.error("Failed to fetch products:", res.statusText);
          return;
        }
        const data = await res.json();
        
        if (!data?.data || !Array.isArray(data.data)) {
          console.error("Invalid products response structure:", data);
          return;
        }
        
        const formatted = data.data.map((p: any) => ({
          value: p.id,
          label: `${p.sku || p.id}${p.size?.length ? "-" + p.size.join(",") : ""} : ${p.name}`,
          price: p.price,
          image: p.images?.[0] || "",
          size: p.size?.length ? p.size : [],
        }));
        setProducts(formatted);
      } catch (err) {
        console.error("Error fetching products:", err);
      }
    };
    fetchProducts();
  }, [router]);

  useEffect(() => {
  const fetchBookingTypes = async () => {
    try {
      const res = await fetch("/api/category?parentName=Wedding");
      const data = await res.json();

      if (data?.data) {
        const formatted = data.data.map((item: any) => ({
          value: item.id,
          label: item.name,
        }));
        setBookingTypeOptions(formatted);
      }
    } catch (err) {
      console.error("Failed to fetch booking types:", err);
    }
  };

  fetchBookingTypes();
}, []);


  // Fetch booking details
  useEffect(() => {
    const fetchBooking = async () => {
      const res = await fetch(`/api/booking/${bookingId}`);
      const data = await res.json();
      const booking = data.data;

      setAdvance(booking.advancePayment || 0);
      setSecurityDeposit((booking.totalDeposit || 0) - (booking.advancePayment || 0));
      setRentAmount(booking.rentAmount || 0);
      setTotalDeposit(booking.totalDeposit || 0);
      setReturnAmount(booking.returnAmount || 0);
      setAdditionalCharges(booking.additionalCharges || 0);

      setSelectedBookingType(booking.rentalType || "");
      setSelectedPaymentMode(booking.advancePaymentMethod || "");
      setCustomerName(booking.customerName || "");
      setPhoneNumberPrimary(booking.phoneNumberPrimary || "");
      setPhoneNumberSecondary(booking.phoneNumberSecondary || "");
      setNotes(booking.notes || "");

      if (booking.productLocks && booking.productLocks.length) {
        const cards: ProductCard[] = booking.productLocks.map((lock: any, idx: number) => ({
          id: idx + 1,
          productLockId: lock.id,
          product: lock.product
            ? {
                value: lock.product.id,
                label: lock.product.name,
                price: lock.product.price,
                image: lock.product.images?.[0] || "",
                size: lock.product.size?.length ? lock.product.size : [],
              }
            : null,
          size: lock.product?.size?.[0] || "",
          amount: String(lock.product?.price || 0),
          finalPrice: String(Math.max(0, (lock.product?.price || 0) - Math.max(0, Number(lock.discount ?? 0)))),
          deliveryDate: lock.deliveryDate.split("T")[0],
          returnDate: lock.returnDate.split("T")[0],
        }));
        setProductCards(cards);

        const firstDelivery = cards[0].deliveryDate;
        const firstReturn = cards[0].returnDate;
        const allSame = cards.every(c => c.deliveryDate === firstDelivery && c.returnDate === firstReturn);
        if (allSame) {
          setSameDate(true);
          setGlobalDeliveryDate(firstDelivery);
          setGlobalReturnDate(firstReturn);
        }
      }
    };
    fetchBooking();
  }, [bookingId]);

  const getAvailableProducts = (currentId: number) => {
    const selectedIds = productCards.filter(p => p.product && p.id !== currentId).map(p => p.product?.value);
    return products.filter(p => !selectedIds.includes(p.value));
  };

  const handleChange = (id: number, field: keyof ProductCard, value: any) => {
    setProductCards(prev =>
      prev.map(card => {
        if (card.id === id) {
          if (field === "deliveryDate") {
            let updatedReturn = card.returnDate;
            if (!card.returnDate || new Date(card.returnDate) <= new Date(value)) {
              updatedReturn = addDays(value, 2);
            }
            return { ...card, deliveryDate: value, returnDate: updatedReturn };
          }
          if (field === "returnDate") {
            if (card.deliveryDate && new Date(value) < new Date(card.deliveryDate)) {
              showModal("⚠️ Return date cannot be before delivery date.", "error");
              return card;
            }
            return { ...card, returnDate: value };
          }
          if (field === "product" && value) {
            return {
              ...card,
              product: value,
              size: value.size && value.size.length === 1 ? value.size[0] : "",
              amount: String(value.price || ""),
              finalPrice: String(value.price || ""),
            };
          }
          return { ...card, [field]: value };
        }
        return card;
      })
    );
    setErrorMessage("");
  };

  const handleAddItem = () => {
    const lastCard = productCards[productCards.length - 1];
    if (!lastCard.product || !lastCard.finalPrice || (!sameDate && (!lastCard.deliveryDate || !lastCard.returnDate))) {
      setErrorMessage("⚠️ Please fill all product details before adding another item.");
      return;
    }
    setProductCards(prev => [
      ...prev,
      { id: Date.now(), product: null, size: "", amount: "", finalPrice: "", deliveryDate: "", returnDate: "" },
    ]);
    setErrorMessage("");
  };

  const handleRemoveItem = async (cardId: number) => {
    const card = productCards.find(c => c.id === cardId);
    if (!card) return;

    if (card.productLockId) {
      try {
        const res = await fetch(`/api/product-lock/${card.productLockId}`, { method: "DELETE" });
        if (!res.ok) console.error("Failed to delete product lock");
      } catch (err) {
        console.error("Error deleting product lock:", err);
      }
    }
    setProductCards(prev => prev.filter(c => c.id !== cardId));
  };

  useEffect(() => {
    if (sameDate) {
      setProductCards(prev =>
        prev.map(card => ({ ...card, deliveryDate: globalDeliveryDate, returnDate: globalReturnDate }))
      );
    }
  }, [sameDate, globalDeliveryDate, globalReturnDate]);

  useEffect(() => {
    const totalProductAmount = productCards.reduce((sum, card) => sum + (parseFloat(card.finalPrice) || 0), 0);

    const extras = Number(additionalCharges) || 0;
    const totalDep = (Number(advance) || 0) + (Number(securityDeposit) || 0);
    const rentWithExtras = Math.max(totalProductAmount + extras, 0);

    setRentAmount(rentWithExtras);
    setTotalDeposit(totalDep);
    setReturnAmount(Math.max(0, totalDep - rentWithExtras));
  }, [productCards, securityDeposit, advance, additionalCharges]);

  const handleBooking = async () => {
    let newErrors: any = {};

    if (!customerName.trim()) newErrors.customerName = "Customer Name is required.";
    else if (!isAlpha(customerName)) newErrors.customerName = "Customer Name can only contain letters and spaces.";

    if (phoneNumberPrimary && !isValidPhoneNumber(phoneNumberPrimary)) {
      newErrors.phoneNumber = "Mobile No. must be 10 digits.";
    }

    if (phoneNumberSecondary && !isValidPhoneNumber(phoneNumberSecondary))
      newErrors.phoneNumberSecondary = "Alternate No. must be 10 digits and contain only numbers.";

    if (!selectedBookingType) newErrors.bookingType = "Booking Type is required.";

    productCards.forEach(card => {
      if (!card.product) newErrors[`product_${card.id}`] = "Please select a product.";
      if (!sameDate && !card.deliveryDate) newErrors[`deliveryDate_${card.id}`] = "Delivery date is required.";
      if (!sameDate && !card.returnDate) newErrors[`returnDate_${card.id}`] = "Return date is required.";
    });

    if (!selectedPaymentMode) newErrors.paymentMode = "Payment mode is required.";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const productsData = productCards.map(card => ({
      productId: card.product?.value,
      deliveryDate: sameDate ? globalDeliveryDate : card.deliveryDate,
      returnDate: sameDate ? globalReturnDate : card.returnDate,
      discount: String(Math.max(0, (parseFloat(card.amount) || 0) - (parseFloat(card.finalPrice) || 0))),
    }));

    const totalProductDiscounts = productCards.reduce((sum, card) => {
      const originalPrice = parseFloat(card.amount) || 0;
      const finalPrice = parseFloat(card.finalPrice) || 0;
      return sum + Math.max(0, originalPrice - finalPrice);
    }, 0);

    const formData = new FormData();
    formData.append("id", String(bookingId));
    formData.append("customerName", customerName);
    formData.append("phoneNumberPrimary", phoneNumberPrimary);
    formData.append("phoneNumberSecondary", phoneNumberSecondary);
    formData.append("notes", notes);
    formData.append("rentAmount", String(rentAmount));
    formData.append("totalDeposit", String(totalDeposit));
    formData.append("returnAmount", String(returnAmount));
    formData.append("advancePayment", String(advance));
    formData.append("discount", String(totalProductDiscounts));
    formData.append("discountType", "flat");
    formData.append("rentalType", selectedBookingType);
    formData.append("advancePaymentMethod", selectedPaymentMode);
    formData.append("products", JSON.stringify(productsData));
    formData.append("securityDeposit", String(securityDeposit));
    formData.append("bookingId", String(bookingId));
    formData.append("additionalCharges", String(additionalCharges));

    try {
      const res = await fetch("/api/booking/update-booking", { method: "PUT", body: formData });
      const data = await res.json();
      if (!res.ok) return showModal(data.message || "⚠️ Failed to update booking.", "error");

      showModal("✅ Booking updated successfully!", "success", `/orders/${bookingId}`);
    } catch (err) {
      console.error(err);
      showModal("⚠️ Something went wrong. Please try again.", "error");
    }
  };

  return (
    <div className="booking-page">
      <div className="breadcrumb">Home › <span>Update Booking</span></div>
      <div className="booking-container">
        {/* Left Side */}
        <div className="booking-left">
          <div className="card">
            <div className="form-row">
              <div className="form-group">
                <label className="required">Customer Name</label>
                <input type="text" placeholder="Enter customer name" onInput={handleNameInput}  value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                {errors.customerName && <span className="error-text">{errors.customerName}</span>}
              </div>
              <div className="form-group">
                <label>Mobile No.</label>
                <input type="text" placeholder="Enter mobile number"  onInput={handlePhoneInput }  value={phoneNumberPrimary} onChange={(e) => setPhoneNumberPrimary(e.target.value)} />
                {errors.phoneNumber && <span className="error-text">{errors.phoneNumber}</span>}
              </div>
              <div className="form-group">
                <label>Alternate No.</label>
                <input type="text" placeholder="Enter alternate number"  onInput={handlePhoneInput }  value={phoneNumberSecondary} onChange={(e) => setPhoneNumberSecondary(e.target.value)} />
                {errors.phoneNumberSecondary && <span className="error-text">{errors.phoneNumberSecondary}</span>}
              </div>
            </div>

           <div className="form-row align-center">
            <div className="form-group booking-type">
              <label className="required">Booking Type</label>
              <Select
                className="booking-type-select"
                classNamePrefix="react-select"
                placeholder="Select Booking Type"
                options={bookingTypeOptions}
                value={
                  bookingTypeOptions.find((option) => option.label === selectedBookingType) || null
                }
                onChange={(val) => setSelectedBookingType(val?.label || "")}
                menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                instanceId="booking-type-select"
                styles={{
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                }}
              />

              {errors.bookingType && <span className="error-text">{errors.bookingType}</span>}
            </div>


              
              <div className="checkbox-right">
                <label className="checkbox-label">
                  <input type="checkbox" checked={sameDate} onChange={(e) => setSameDate(e.target.checked)} /> Same Delivery/Return Date for All
                </label>
              </div>
            </div>

            {sameDate && (
              <div className="form-row date-row">
                <div className="form-group date-input">
                  <label>Delivery Date</label>
                  <input type="date" value={globalDeliveryDate} onChange={(e) => setGlobalDeliveryDate(e.target.value)} />
                </div>
                <div className="form-group date-input">
                  <label>Return Date</label>
                  <input type="date" value={globalReturnDate} onChange={(e) => setGlobalReturnDate(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {productCards.map(card => (
            <div className="card product-card" key={card.id}>
              {productCards.length > 1 && <button className="remove-btn" onClick={() => handleRemoveItem(card.id)}>×</button>}
              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="required">Product Name</label>
                  <Select options={getAvailableProducts(card.id)} value={card.product} onChange={(val) => handleChange(card.id, "product", val)} placeholder="Select a product" isSearchable instanceId={`product-select-${card.id}`} />
                  {errors[`product_${card.id}`] && <span className="error-text">{errors[`product_${card.id}`]}</span>}
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="required">Amount</label>
                  <input type="number" placeholder="Amount" value={card.amount === "0" ? "" : card.amount} onChange={(e) => handleChange(card.id, "amount", e.target.value)} readOnly />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Final Price (₹)</label>
                  <input
                    type="number"
                    placeholder="Final Price"
                    value={card.finalPrice === "0" || card.finalPrice === "" ? "" : card.finalPrice}
                    onChange={(e) => handleChange(card.id, "finalPrice", e.target.value)}
                  />
                  {card.product && card.finalPrice !== "" && (
                    <span className="discount-text">
                      Discount: ₹{Math.max(0, (parseFloat(card.amount) || 0) - (parseFloat(card.finalPrice) || 0)).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {!sameDate && (
                <div className="form-row date-row">
                  <div className="form-group date-input">
                    <label className="required">Delivery Date</label>
                    <input type="date" value={card.deliveryDate} onChange={(e) => handleChange(card.id, "deliveryDate", e.target.value)} />
                    {errors[`deliveryDate_${card.id}`] && <span className="error-text">{errors[`deliveryDate_${card.id}`]}</span>}
                  </div>
                  <div className="form-group date-input">
                    <label className="required">Return Date</label>
                    <input type="date" value={card.returnDate} onChange={(e) => handleChange(card.id, "returnDate", e.target.value)} />
                    {errors[`returnDate_${card.id}`] && <span className="error-text">{errors[`returnDate_${card.id}`]}</span>}
                  </div>
                </div>
              )}
            </div>
          ))}

          {errorMessage && <div className="error-message">{errorMessage}</div>}

          <div className="add-item-row">
            <button className="add-item-btn" onClick={handleAddItem}>＋ Add Item</button>
          </div>
        </div>

        {/* Right Side */}
        <div className="booking-right">
          <div className="card">

            <div className="form-group">
              <label>(a) Adv. Payment (₹)</label>
              <input type="number" placeholder="Adv. Payment" value={advance === 0 ? "" : advance} onChange={(e) => setAdvance(safeNumber(e.target.value))} />
            </div>

            <div className="form-group">
              <label>(b) Security Deposit (₹)</label>
              <input type="number" placeholder="Deposit" value={securityDeposit === 0 ? "" : securityDeposit} onChange={(e) => setSecurityDeposit(safeNumber(e.target.value))} />
            </div>

            <div className="form-group">
              <label className="required">Payment Mode</label>
              <select value={selectedPaymentMode} onChange={(e) => setSelectedPaymentMode(e.target.value)}>
                <option value="">Select Payment Mode</option>
                <option value="Cash">Cash</option>
                <option value="Bank">Bank</option>
              </select>
              {errors.paymentMode && <span className="error-text">{errors.paymentMode}</span>}
            </div>

            <div className="form-group">
              <label>(c) Additional Charges (₹)</label>
              <input type="number" placeholder="Additional Charges" value={additionalCharges === 0 ? "" : additionalCharges} onChange={(e) => setAdditionalCharges(safeNumber(e.target.value))} />
            </div>

            <div className="form-group">
              <label>(d) Total Product Amount(₹)</label>
              <input
                type="number"
                readOnly
                value={Number(productCards.reduce((sum, card) => sum + (parseFloat(card.finalPrice) || 0), 0).toFixed(2))}
              />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea placeholder="Notes" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
              <div className="notes-count">{notes.length} / 500</div>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-row"><span>A. Total Deposit (a+b)</span><span>₹ {totalDeposit.toFixed(2)}</span></div>
            <div className="summary-row"><span>B. Rent Amount (d)</span><span>₹ {rentAmount.toFixed(2)}</span></div>
            <div className="summary-row discount-row"><span>C. Total Discount</span><span className="negative">- ₹{productCards.reduce((sum, card) => {
              const originalPrice = parseFloat(card.amount) || 0;
              const finalPrice = parseFloat(card.finalPrice) || 0;
              return sum + Math.max(0, originalPrice - finalPrice);
            }, 0).toFixed(2)}</span></div>
            <div className="summary-row"><span>D. Return Amount(A-B)</span><span>₹ {returnAmount.toFixed(2)}</span></div>
          </div>

          <div className="action-buttons">
            <button className="cancel-btn" onClick={() => router.back()}>Cancel</button>
            <button className="save-btn" onClick={handleBooking}>Update Booking</button>
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} message={modalMessage} type={modalType} onClose={() => {
        setIsModalOpen(false);
        if (redirectAfterModal) router.push(redirectAfterModal);
      }} />
    </div>
  );
}
