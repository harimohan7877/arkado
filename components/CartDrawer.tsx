"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CourseBundle } from "@/lib/courses";
import { getExamLabel } from "@/lib/exam-labels";
import { DEFAULT_SETTINGS, getCleanWhatsAppNumber } from "@/lib/default-settings";
import { fetchWithCache } from "@/lib/store-hooks";
import {
  CloseIcon,
  CartIcon,
  CheckIcon,
  AlertCircleIcon,
  ShoppingBagIcon,
  WhatsappIcon,
  DownloadIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
} from "@/components/icons";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CourseBundle[];
  onRemoveItem: (id: string) => void;
}

type Step = "cart" | "pay" | "success";

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onRemoveItem,
}: CartDrawerProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("cart");
  const contentScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTop = 0;
    }
  }, [step]);
  const [name, setName] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<"whatsapp" | "gmail" | "both">("both");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [utr, setUtr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [createdOrder, setCreatedOrder] = useState<{
    order_id: string;
    name: string;
    delivery_mode: string;
    course_title: string;
    amount: number;
    phone: string;
    email: string;
    drive_url: string;
  } | null>(null);

  const [upiSettings, setUpiSettings] = useState<{
    upi_id: string;
    merchant_name: string;
    whatsapp_support: string;
    support_email: string;
    custom_qr_url: string;
    order_messages?: {
      whatsapp_order_template?: string;
      whatsapp_after_payment_template?: string;
      gmail_subject?: string;
      gmail_body?: string;
    };
  }>({
    upi_id: DEFAULT_SETTINGS.upi_id,
    merchant_name: DEFAULT_SETTINGS.merchant_name,
    whatsapp_support: DEFAULT_SETTINGS.whatsapp_support_number,
    support_email: DEFAULT_SETTINGS.contact.email,
    custom_qr_url: "",
  });

  const upiId = upiSettings.upi_id;
  const merchantName = upiSettings.merchant_name;
  const whatsappSupportNumber = upiSettings.whatsapp_support;
  const supportEmail = upiSettings.support_email || DEFAULT_SETTINGS.contact.email;
  const orderMessages = upiSettings.order_messages;

  const handleDrawerClose = () => {
    if (step === "success") {
      setStep("cart");
      setCreatedOrder(null);
      setUtr("");
    }
    setErrorMsg("");
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      if (step === "success") {
        setStep("cart");
        setCreatedOrder(null);
      }
      setErrorMsg("");
      fetchWithCache<any>("/api/settings")
        .then((data) => {
          if (data && !data.error) {
            setUpiSettings({
              upi_id: data.upi_id || DEFAULT_SETTINGS.upi_id,
              merchant_name: data.merchant_name || DEFAULT_SETTINGS.merchant_name,
              whatsapp_support: data.contact?.whatsapp_number || data.whatsapp_support_number || DEFAULT_SETTINGS.whatsapp_support_number,
              support_email: data.contact?.email || data.gmail_support_email || DEFAULT_SETTINGS.contact.email,
              custom_qr_url: data.custom_qr_url || "",
              order_messages: data.order_messages,
            });
          }
        })
        .catch(() => {});
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price, 0);
  const totalOriginal = cartItems.reduce((sum, item) => sum + item.original_price, 0);
  const savings = totalOriginal - subtotal;
  const primaryCourse = cartItems[0];

  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${subtotal}&cu=INR&tn=${encodeURIComponent(primaryCourse?.title?.slice(0, 20) || "Arkado Course")}`;
  const qrCodeUrl =
    upiSettings.custom_qr_url && upiSettings.custom_qr_url.trim().length > 5
      ? upiSettings.custom_qr_url.trim()
      : `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUrl)}`;

  const handleCheckoutClick = () => {
    if (cartItems.length === 0) return;
    setErrorMsg("");
    setStep("pay");
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("कृपया अपना पूरा नाम दर्ज करें (Please enter your name).");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMsg("कृपया 10 अंकों का मान्य भारतीय मोबाइल नंबर दर्ज करें (Valid 10-digit mobile required).");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setErrorMsg("कृपया सही ईमेल पता दर्ज करें (Valid email address required).");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          delivery_mode: "both",
          phone: cleanPhone,
          email: email.trim().toLowerCase(),
          utr: utr.trim(),
          course_id: primaryCourse?.id,
          course_title: primaryCourse?.title,
          amount: subtotal,
          status: "pending_verification",
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "ऑर्डर सबमिट नहीं हो सका, कृपया पुनः प्रयास करें।");
      }

      const orderId = data.order?.order_id || data.order_id || `ARK-${Date.now().toString().slice(-6)}`;
      const orderObj = {
        order_id: orderId,
        name: name.trim(),
        delivery_mode: "both",
        course_title: primaryCourse?.title || "Course",
        amount: subtotal,
        phone: cleanPhone,
        email: email.trim().toLowerCase(),
        drive_url: "",
      };

      setCreatedOrder(orderObj);
      setStep("success");
      // Clear cart items in parent so user doesn't re-buy the same items accidentally
      cartItems.forEach((item) => onRemoveItem(item.id));
    } catch (err: any) {
      console.error("Order error:", err);
      setErrorMsg(err.message || "कुछ गड़बड़ हुई, कृपया WhatsApp पर संपर्क करें।");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const stepIndex = step === "cart" ? 0 : step === "pay" ? 1 : 2;
  const stepLabels = ["Cart", "Payment", "Done"];

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-[70] anim-fade-in-up"
        onClick={handleDrawerClose}
        aria-hidden="true"
      />

      {/* Cart Drawer sliding window - z-[80] ensures it is clearly above the backdrop overlay */}
      <div className="fixed right-0 top-0 bottom-0 w-full sm:max-w-md bg-white z-[80] shadow-2xl flex flex-col overflow-hidden anim-slide-down">
        {/* Header with progress */}
        <div className="border-b border-slate-200 bg-white shrink-0">
          <div className="p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-md bg-amber-700 text-white flex items-center justify-center">
                  <CartIcon size={14} />
                </span>
                <h2 className="font-extrabold text-slate-900 text-base">
                  {step === "cart" && "Your Cart"}
                  {step === "pay" && "Payment / Checkout"}
                  {step === "success" && "Order Confirmed!"}
                </h2>
              </div>
              {step !== "success" && (
                <p className="text-[11px] text-slate-500 mt-1">
                  {cartItems.length} {cartItems.length === 1 ? "Course" : "Courses"} • Total: ₹{subtotal}
                </p>
              )}
            </div>
            <button
              onClick={handleDrawerClose}
              className="w-8 h-8 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer"
              aria-label="Close"
            >
              <CloseIcon size={14} />
            </button>
          </div>

          {/* Progress steps */}
          <div className="px-4 pb-3 flex items-center gap-1.5">
            {stepLabels.map((label, idx) => (
              <React.Fragment key={label}>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center transition ${
                      idx <= stepIndex
                        ? "bg-amber-700 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {idx < stepIndex ? <CheckIcon size={10} /> : idx + 1}
                  </span>
                  <span
                    className={`text-[11px] font-bold transition ${
                      idx <= stepIndex ? "text-slate-900" : "text-slate-400"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {idx < stepLabels.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 rounded transition ${
                      idx < stepIndex ? "bg-amber-700" : "bg-slate-200"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div ref={contentScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-800 font-semibold flex items-start gap-2">
              <AlertCircleIcon size={14} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === "cart" && (
            <>
              {cartItems.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                    <CartIcon size={22} />
                  </div>
                  <h3 className="font-bold text-slate-800">Your cart is empty</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Choose your preferred course bundle to continue.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start justify-between gap-3"
                    >
                      <div className="relative w-12 h-14 rounded overflow-hidden bg-white border border-slate-200 shrink-0">
                        <Image
                          src={item.cover_image}
                          alt={item.title}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        {getExamLabel(item.exam_id) ? (
                          <span className="text-[10px] font-bold uppercase bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                            {getExamLabel(item.exam_id)}
                          </span>
                        ) : null}
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 mt-1 leading-snug line-clamp-2">
                          {item.title}
                        </h4>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-sm font-black text-slate-900">
                            ₹{item.price}
                          </span>
                          <span className="text-[11px] text-slate-400 line-through">
                            ₹{item.original_price}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {item.discount_percent}% OFF
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="text-slate-400 hover:text-amber-700 p-1 cursor-pointer transition"
                        aria-label="Remove"
                      >
                        <CloseIcon size={14} />
                      </button>
                    </div>
                  ))}

                  {savings > 0 && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 font-semibold flex items-center justify-between">
                      <span className="font-medium">Total Savings:</span>
                      <span className="font-black">₹{savings}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {step === "pay" && (
            <div className="space-y-3">
              {/* QR Code Section */}
              <div className="p-4 bg-slate-900 text-white rounded-lg text-center space-y-3">
                <span className="inline-block text-[10px] font-bold bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full uppercase">
                  PhonePe / Paytm / GPay
                </span>

                <div className="relative w-44 h-44 mx-auto bg-white p-2 rounded-md border-2 border-amber-400">
                  <Image
                    src={qrCodeUrl}
                    alt="Scan to pay"
                    fill
                    className="object-contain p-1"
                    unoptimized
                  />
                </div>

                <div>
                  <p className="text-xl font-black text-amber-400">₹{subtotal}</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-1">
                    UPI: <span className="text-white font-bold">{upiId}</span>
                  </p>
                </div>

                <div className="pt-1 flex flex-wrap justify-center gap-2">
                  <a
                    href={`phonepe://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${subtotal}&cu=INR`}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold rounded transition"
                  >
                    PhonePe
                  </a>
                  <a
                    href={`paytmmp://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${subtotal}&cu=INR`}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded transition"
                  >
                    Paytm
                  </a>
                  <a
                    href={upiUrl}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold rounded transition"
                  >
                    Other UPI
                  </a>
                </div>
              </div>

              {/* Order Form */}
              <form id="upi-order-form" onSubmit={handleOrderSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-md border border-slate-300 text-sm focus:outline-none focus:border-amber-700"
                  />
                </div>

                {/* 2. WhatsApp / Mobile Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <WhatsappIcon size={14} className="text-emerald-600 inline" /> WhatsApp / मोबाइल नंबर *
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">10 अंक</span>
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={16}
                    placeholder="उदा. 9876543210"
                    value={phone}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, "");
                      if (val.length === 12 && val.startsWith("91")) {
                        val = val.slice(2);
                      } else if (val.length === 11 && val.startsWith("0")) {
                        val = val.slice(1);
                      }
                      setPhone(val.slice(0, 10));
                    }}
                    className="w-full px-3 py-2.5 rounded-md border border-slate-300 text-sm font-mono focus:outline-none focus:border-amber-700"
                  />
                </div>

                {/* 3. Email Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span>ईमेल पता (Email / Gmail) *</span>
                    <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                      नोट्स यहाँ भेजे जाएंगे
                    </span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="उदा. rahul@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
                    className="w-full px-3 py-2.5 rounded-md border border-slate-300 text-sm focus:outline-none focus:border-amber-700"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Google Drive नोट्स व टेस्ट का एक्सेस लिंक इसी ईमेल पर भेजा जाएगा।
                  </p>
                </div>

                {/* 4. UPI Ref / UTR No. (Optional) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-800">
                      UPI Ref / UTR No.
                    </label>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                      (वैकल्पिक / Optional)
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="12-digit UTR या Ref No. (यदि उपलब्ध हो)"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-md border border-slate-300 text-sm font-mono focus:outline-none focus:border-amber-700"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    यदि UTR नहीं मिल रहा तो इसे खाली छोड़ सकते हैं। भुगतान के बाद नीचे सबमिट करें।
                  </p>
                </div>

                {/* I've Paid button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 hover:from-amber-800 hover:to-amber-950 text-white font-extrabold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md cursor-pointer mt-4"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>ऑर्डर दर्ज हो रहा है...</span>
                    </>
                  ) : (
                    <>
                      <CheckIcon size={16} />
                      <span>मैंने भुगतान कर दिया है (Submit Order)</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-slate-500 text-center pt-1">
                  भुगतान करने में कोई समस्या है?{" "}
                  <a
                    href={`https://wa.me/${getCleanWhatsAppNumber(upiSettings)}?text=${encodeURIComponent(
                      `नमस्ते Arkado! मुझे "${primaryCourse?.title || "कोर्स"}" (₹${subtotal}) खरीदने में सहायता चाहिए।`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <WhatsappIcon size={13} className="inline text-emerald-600" /> WhatsApp सहायता
                  </a>
                </p>
              </form>
            </div>
          )}

          {step === "success" && createdOrder && (
            <div className="text-center py-4 space-y-4 anim-fade-in-up">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircleIcon size={32} />
              </div>

              <div>
                <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
                  Order ID: {createdOrder.order_id}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-2">
                  Thank You, {createdOrder.name}!
                </h3>
                <p className="text-xs text-slate-600">
                  Your order has been recorded successfully.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">कोर्स (Course):</span>
                  <span className="font-bold text-slate-800 line-clamp-1 text-right ml-2">
                    {createdOrder.course_title}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">कुल भुगतान (Amount):</span>
                  <span className="font-bold text-slate-900">₹{createdOrder.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">WhatsApp / मोबाइल:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {createdOrder.phone}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ईमेल (Email):</span>
                  <span className="font-bold text-slate-800 font-mono line-clamp-1 text-right ml-2">
                    {createdOrder.email}
                  </span>
                </div>
              </div>

              {/* Admin verification notice */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-left">
                <h4 className="font-bold text-amber-900 text-sm mb-1 flex items-center gap-1.5">
                  <span>⏳</span> सत्यापन प्रक्रिया जारी (Verification in Progress)
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  आपका ऑर्डर सफलतापूर्वक दर्ज हो गया है! टीम द्वारा पेमेंट चेक करके <strong>5-10 मिनट</strong> के भीतर Google Drive नोट्स का डाउनलोड लिंक सीधे आपकी ईमेल (<strong>{createdOrder.email}</strong>) पर भेज दिया जाएगा।
                </p>
              </div>

              {/* Instant WhatsApp Send Button */}
              <a
                href={`https://wa.me/${getCleanWhatsAppNumber(upiSettings)}?text=${encodeURIComponent(
                  `🛒 *नया ऑर्डर भुगतान विवरण — Arkado*\n\n` +
                  `🆔 *Order ID:* ${createdOrder.order_id}\n` +
                  `👤 *नाम:* ${createdOrder.name}\n` +
                  `📱 *मोबाइल:* ${createdOrder.phone}\n` +
                  `✉️ *ईमेल:* ${createdOrder.email}\n` +
                  `📚 *कोर्स:* ${createdOrder.course_title}\n` +
                  `💰 *राशि:* ₹${createdOrder.amount}\n` +
                  (utr.trim() ? `🔢 *UTR/Ref No:* ${utr.trim()}\n` : "") +
                  `\nमैंने पेमेंट कर दिया है, कृपया वेरिफाई करके नोट्स का लिंक भेजें।`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm transition-all shadow-md flex items-center justify-center gap-2"
              >
                <WhatsappIcon size={18} />
                <span>WhatsApp पर विवरण भेजें (वैकल्पिक)</span>
              </a>

              <button
                onClick={() => {
                  handleDrawerClose();
                  router.push("/download");
                }}
                className="btn-primary w-full"
              >
                <DownloadIcon size={14} />
                <span>View Download Page →</span>
              </button>

              <button
                onClick={handleDrawerClose}
                className="w-full py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
              >
                Close Window
              </button>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {cartItems.length > 0 && step !== "success" && (
          <div className="p-4 border-t border-slate-200 bg-white shrink-0">
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-sm text-slate-600 font-medium">
                Total Amount:
              </span>
              <span className="text-2xl font-black text-slate-900">₹{subtotal}</span>
            </div>

            {step === "cart" ? (
              <button onClick={handleCheckoutClick} className="btn-primary w-full">
                <ShoppingBagIcon size={14} />
                <span>Proceed to Checkout</span>
              </button>
            ) : (
              <div className="flex gap-2 w-full">
                <button
                  type="button"
                  onClick={() => setStep("cart")}
                  className="w-1/3 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer flex items-center justify-center gap-1"
                >
                  <ChevronLeftIcon size={14} />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  form="upi-order-form"
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 hover:from-amber-800 hover:to-amber-950 text-white font-extrabold text-xs sm:text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>सबमिट हो रहा है...</span>
                    </>
                  ) : (
                    <>
                      <CheckIcon size={16} />
                      <span>मैंने भुगतान कर दिया है</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
