"use client";

import { useState, useEffect } from "react";
import Select from "react-select";
import { useRouter } from "next/navigation";
import "./createBooking.css";
import Modal from "./Modal";


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
  discount: string;
  deliveryDate: string;
  returnDate: string;
}

export default function CreateBooking() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productCards, setProductCards] = useState<ProductCard[]>([
    { id: 1, product: null, size: "", amount: "", discount: "", deliveryDate: "", returnDate: "" },
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"error" | "success">("error");
  const [redirectAfterModal, setRedirectAfterModal] = useState<string | null>(null);
  const [selectedBookingType, setSelectedBookingType] = useState<{ value: string; label: string } | null>(null);
  const [bookingTypeOptions, setBookingTypeOptions] = useState<{ value: string; label: string }[]>([]);





  const [errors, setErrors] = useState({
    customerName: "",
    phoneNumber: "",
    bookingType: "",
    product: "",
    deliveryDate: "",
    returnDate: "",
    securityDeposit: "",
    advance: "",
    paymentMode: "",
  });

  const showModal = (
    msg: string,
    type: "error" | "success" = "error",
    productName?: string,
    redirectUrl?: string
  ) => {
    setModalMessage(productName ? `${msg}: ${productName}` : msg);
    setModalType(type);
    setRedirectAfterModal(redirectUrl || null);
    setIsModalOpen(true);
  };



  // ✅ Helper to add days
  const addDays = (dateStr: string, days: number) => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
  };

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

  const getAvailableProducts = (currentId: number) => {
    const selectedIds = productCards
      .filter((p) => p.product && p.id !== currentId)
      .map((p) => p.product?.value);
    return products.filter((p) => !selectedIds.includes(p.value));
  };

  const handleChange = (id: number, field: keyof ProductCard, value: any) => {
    setProductCards((prev) =>
      prev.map((card) => {
        if (card.id === id) {
          // ✅ When Delivery Date changes
          if (field === "deliveryDate") {
            const delivery = value;
            let updatedReturn = card.returnDate;

            // Auto set return = delivery + 2 days if not set or earlier
            if (!card.returnDate || new Date(card.returnDate) <= new Date(delivery)) {
              updatedReturn = addDays(delivery, 2);
            }

            return { ...card, deliveryDate: delivery, returnDate: updatedReturn };
          }

          // ✅ When Return Date changes
          if (field === "returnDate") {
            const delivery = card.deliveryDate;
            if (delivery && new Date(value) < new Date(delivery)) {
              showModal("⚠️ Return date cannot be before delivery date.", "error");
              return card;
            }
            return { ...card, returnDate: value };
          }

          // ✅ When Product changes
          if (field === "product" && value) {
            return {
              ...card,
              product: value,
              size: value.size && value.size.length === 1 ? value.size[0] : "",
              amount: String(value.price || ""),
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
    if (!lastCard.product || !lastCard.amount || (!sameDate && (!lastCard.deliveryDate || !lastCard.returnDate))) {
      setErrorMessage("⚠️ Please fill all product details before adding another item.");
      return;
    }
    setProductCards((prev) => [
      ...prev,
      { id: Date.now(), product: null, size: "", amount: "", discount: "", deliveryDate: "", returnDate: "" },
    ]);
    setErrorMessage("");
  };

  const handleRemoveItem = (id: number) => {
    setProductCards((prev) => prev.filter((card) => card.id !== id));
  };

  // ✅ Same-date mode auto return = +2 days
  useEffect(() => {
    if (sameDate) {
      let autoReturn = globalReturnDate;

      if (globalDeliveryDate && (!globalReturnDate || new Date(globalReturnDate) <= new Date(globalDeliveryDate))) {
        autoReturn = addDays(globalDeliveryDate, 2);
        setGlobalReturnDate(autoReturn);
      }

      setProductCards((prev) =>
        prev.map((card) => ({
          ...card,
          deliveryDate: globalDeliveryDate,
          returnDate: autoReturn,
        }))
      );
    }
  }, [sameDate, globalDeliveryDate, globalReturnDate]);

  useEffect(() => {
    const totalDiscounts = productCards.reduce((sum, card) => sum + (parseFloat(card.discount) || 0), 0);
    const totalProductAmount = productCards.reduce((sum, card) => sum + (parseFloat(card.amount) || 0), 0);
    const extras = additionalCharges || 0;
    const baseRent = Math.max(totalProductAmount - totalDiscounts, 0);
    const rentWithExtras = baseRent + extras;
    const totalDep = (advance || 0) + (securityDeposit || 0);
    const totalDiscount = totalDiscounts || 0;
    const retAmt = ((totalDep + totalDiscount) - rentWithExtras);

    setRentAmount(rentWithExtras);
    setTotalDeposit(totalDep);
    setReturnAmount(retAmt);
  }, [productCards, securityDeposit, advance, additionalCharges]);

  
  const positiveNumber = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) return 0;
    return num;
  };

  const isValidPhoneNumber = (num: string) => /^[0-9]{10}$/.test(num);
  const isAlpha = (val: string) => /^[A-Za-z\s]+$/.test(val);
  const handleNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = e.target.value.replace(/[^A-Za-z\s]/g, "");
  };
  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ""); 
    if (value.length > 0 && !/^[6-9]/.test(value)) {
      value = value.slice(1); 
    }

    e.target.value = value.slice(0, 10);
  };

  const handleBooking = async () => {
    const customerName = (document.querySelector<HTMLInputElement>('input[placeholder="Enter customer name"]')?.value || "").trim();
    const phoneNumber = (document.querySelector<HTMLInputElement>('input[placeholder="Enter mobile number"]')?.value || "").trim();
    const phoneNumberSecondary = (document.querySelector<HTMLInputElement>('input[placeholder="Enter alternate number"]')?.value || "").trim();
    const bookingType = selectedBookingType?.value || "";

    const paymentMode = (document.querySelector<HTMLSelectElement>('select.payment-mode')?.value || "").trim();

    let newErrors: any = {};

    if (!customerName) {
      newErrors.customerName = "Customer Name is required.";
    } else if (!isAlpha(customerName)) {
      newErrors.customerName = "Customer Name can only contain letters and spaces.";
    }
    if (phoneNumber && !isValidPhoneNumber(phoneNumber)) {
      newErrors.phoneNumber = "Mobile No. must be 10 digits.";
    }


    if (phoneNumberSecondary && !isValidPhoneNumber(phoneNumberSecondary)) {
      newErrors.phoneNumberSecondary = "Alternate No. must be 10 digits and contain only numbers.";
    }

    if (!bookingType || bookingType === "Select Booking Type")
      newErrors.bookingType = "Booking Type is required.";


    const firstProduct = productCards[0];
    if (!firstProduct.product) newErrors.product = "Please select a product.";

    if (sameDate) {
      if (!globalDeliveryDate || !globalReturnDate) {
        newErrors.deliveryDate = "Global Delivery and Return dates are required.";
      }
    } else {
      if (!firstProduct.deliveryDate) newErrors.deliveryDate = "Delivery date is required.";
      if (!firstProduct.returnDate) newErrors.returnDate = "Return date is required.";
    }

    if (!paymentMode || paymentMode === "Select Payment Mode") newErrors.paymentMode = "Payment mode is required.";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const productsData = productCards.map((card) => ({
      productId: card.product?.value,
      deliveryDate: sameDate ? globalDeliveryDate : card.deliveryDate,
      returnDate: sameDate ? globalReturnDate : card.returnDate,
      discount: card.discount || "0",
    }));

    const notes = (document.querySelector<HTMLTextAreaElement>('textarea[placeholder="Notes"]')?.value || "").trim();

    const formData = new FormData();
    formData.append("customerName", customerName);
    formData.append("phoneNumberPrimary", phoneNumber);
    formData.append("phoneNumberSecondary", phoneNumberSecondary);
    formData.append("notes", notes);
    formData.append("rentAmount", String(rentAmount));
    formData.append("totalDeposit", String(totalDeposit));
    formData.append("returnAmount", String(returnAmount));
    formData.append("advancePayment", String(advance));
    formData.append("securityDeposit", String(securityDeposit));
    const totalProductDiscounts = productCards.reduce((sum, card) => sum + (parseFloat(card.discount) || 0), 0);
    formData.append("discount", String(totalProductDiscounts));
    formData.append("discountType", "flat");
    formData.append("rentalType", selectedBookingType?.label || "");

    formData.append("advancePaymentMethod", paymentMode);
    formData.append("products", JSON.stringify(productsData));
    formData.append("additionalCharges", String(additionalCharges));
    

    try {
      const res = await fetch("/api/booking/create-booking", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        showModal(
          "✅ Booking created successfully!",
          "success",
          undefined,
          `/orders/${data.data.id}` 
        );
      } else {
        const bookedProducts = data.bookedProducts || [];
        const productNames = bookedProducts.join(", ");
        showModal(
          data.message || "⚠️ Failed to create booking",
          "error",
          productNames
        );
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("⚠️ Something went wrong. Please try again.");
    }
  };

  return (
    <div className="booking-page">
      <div className="breadcrumb">Home › <span>Create Booking</span></div>
      <div className="booking-container">
        <div className="booking-left">
          <div className="card">
            <div className="form-row">
              <div className="form-group">
                <label className="required">Customer Name</label>
                <input type="text" placeholder="Enter customer name" onInput={handleNameInput} />
                {errors.customerName && <span className="error-text">{errors.customerName}</span>}
              </div>
              <div className="form-group">
                <label>Mobile No.</label>
                <input type="text" placeholder="Enter mobile number" onInput={handlePhoneInput } />
                {errors.phoneNumber && <span className="error-text">{errors.phoneNumber}</span>}
              </div>
              <div className="form-group">
                <label>Alternate No.</label>
                <input type="text" placeholder="Enter alternate number" onInput={handlePhoneInput } />
                {errors.phoneNumberSecondary && <span className="error-text">{errors.phoneNumberSecondary}</span>}
              </div>
            </div>
            <div className="form-row align-center">
              <div className="form-group booking-type">
                <label className="required">Booking Type</label>
                  <Select
                    className="booking-type-select"
                    options={bookingTypeOptions}
                    placeholder="Select Booking Type"
                    value={selectedBookingType}
                    onChange={(val) => setSelectedBookingType(val)}
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
                  <input
                    type="checkbox"
                    checked={sameDate}
                    onChange={(e) => setSameDate(e.target.checked)}
                  />
                  <span>Same Delivery/Return Date for All</span>
                </label>


              </div>
            </div>

            {sameDate && (
              <div className="form-row date-row">
                <div className="form-group date-input">
                  <label className="required">Delivery Date</label>
                  <input type="date" value={globalDeliveryDate} onChange={(e) => setGlobalDeliveryDate(e.target.value)} />
                </div>
                <div className="form-group date-input">
                  <label className="required">Return Date</label>
                  <input
                    type="date"
                    value={globalReturnDate}
                    min={globalDeliveryDate}
                    onChange={(e) => {
                      if (new Date(e.target.value) < new Date(globalDeliveryDate)) {
                        alert("⚠️ Return date cannot be before delivery date.");
                        return;
                      }
                      setGlobalReturnDate(e.target.value);
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {productCards.map((card) => (
            <div className="card product-card" key={card.id}>
              {productCards.length > 1 && <button className="remove-btn" onClick={() => handleRemoveItem(card.id)}>×</button>}
              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="required">Product Name</label>
                  <Select options={getAvailableProducts(card.id)} value={card.product} onChange={(val) => handleChange(card.id, "product", val)} placeholder="Select a product" isSearchable instanceId={`product-select-${card.id}`} />
                  {errors.product && <span className="error-text">{errors.product}</span>}
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="required">Amount</label>
                  <input 
                    type="number"
                    placeholder="Amount"
                    value={card.amount}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, "");
                      if (parseInt(v) <= 0) v = "";
                      handleChange(card.id, "amount", v);
                    }}
                    readOnly
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Discount (₹)</label>
                  <input 
                    type="number"
                    placeholder="Discount"
                    value={card.discount === "0" || card.discount === "" ? "" : card.discount}
                    onChange={(e) => handleChange(card.id, "discount", e.target.value)}
                  />
                </div>
              </div>

              {!sameDate && (
                <div className="form-row date-row">
                  <div className="form-group date-input">
                    <label className="required">Delivery Date</label>
                    <input type="date" value={card.deliveryDate} onChange={(e) => handleChange(card.id, "deliveryDate", e.target.value)} />
                    {errors.deliveryDate && <span className="error-text">{errors.deliveryDate}</span>}
                  </div>
                  <div className="form-group date-input">
                    <label className="required">Return Date</label>
                    <input
                      type="date"
                      value={card.returnDate}
                      min={card.deliveryDate}
                      onChange={(e) => handleChange(card.id, "returnDate", e.target.value)}
                    />
                    {errors.returnDate && <span className="error-text">{errors.returnDate}</span>}
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

        <div className="booking-right">
          <div className="card">
            <div className="form-group">
              <label>(a) Adv. Payment (₹)</label>
              <input type="number" placeholder="Adv. Payment" value={advance === 0 ? "" : advance} onChange={(e) => setAdvance(positiveNumber(e.target.value))}
 />
            </div>

            <div className="form-group">
              <label>(b) Security Deposit (₹)</label>
              <input
                type="number"
                placeholder="Deposit"
                value={securityDeposit === 0 ? "" : securityDeposit}
                onChange={(e) => setSecurityDeposit(positiveNumber(e.target.value))}

              />
            </div>

            <div className="form-group">
              <label className="required">Payment Mode</label>
              <select className="payment-mode">
                <option>Select Payment Mode</option>
                <option>Cash</option>
                <option>Bank</option>
              </select>
              {errors.paymentMode && <span className="error-text">{errors.paymentMode}</span>}
            </div>

            <div className="form-group">
              <label>(c) Additional Charges (₹)</label>
              <input type="number" placeholder="Additional Charges" value={additionalCharges === 0 ? "" : additionalCharges}onChange={(e) => setAdditionalCharges(Math.max(0, parseFloat(e.target.value) || 0)) } />
            </div>

            <div className="form-group">
              <label>(d) Total Product Amount(₹)</label>
              <input
                type="number"
                readOnly
                value={Number(
                  productCards.reduce((sum, card) => sum + (parseFloat(card.amount) || 0), 0).toFixed(2)
                )}
              />
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea placeholder="Notes" maxLength={500}></textarea>
              <div className="notes-count">0 / 500</div>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-row"><span>A. Total Deposit (a+b)</span><span>₹ {totalDeposit.toFixed(2)}</span></div>
            <div className="summary-row"><span>B. Rent Amount (d)</span><span>₹ {rentAmount.toFixed(2)}</span></div>
            <div className="summary-row discount-row"><span>C. Total Discount</span><span className="negative">- ₹{productCards.reduce((sum, card) => sum + (parseFloat(card.discount) || 0), 0).toFixed(2)}</span></div>
            <div className="summary-row"><span>D. Return Amount(A+C-B)</span><span>₹ {returnAmount.toFixed(2)}</span></div>
          </div>

          <div className="action-buttons">
            <button className="cancel-btn" onClick={() => router.push("/")}>
              Cancel
            </button>

            <button className="book-btn" onClick={handleBooking}>Book Now</button>
          </div>
        </div>
      </div>
      <Modal
        isOpen={isModalOpen}
        message={modalMessage}
        type={modalType}
        onClose={() => {
          setIsModalOpen(false);
          if (modalType === "success" && redirectAfterModal) {
            router.push(redirectAfterModal);
          }
        }}
      />

    </div>
  );
}
