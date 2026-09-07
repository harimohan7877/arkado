"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CourseBundle } from "@/lib/courses";
import { getExamLabel } from "@/lib/exam-labels";
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
  const [name, setName] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<"whatsapp" | "gmail">("whatsapp");
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
    utr: string;
    drive_url: string;
  } | null>(null);

  const upiId = "7852004401@ybl";
  const merchantName = "Arkado";
  const whatsappSupportNumber = "917852004401";

  const subtotal = cartItems.reduce((sum, item) => sum + item.price, 0);
  const totalOriginal = cartItems.reduce((sum, item) => sum + item.original_price, 0);
  const savings = totalOriginal - subtotal;
  const primaryCourse = cartItems[0];

  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
    merchantName
  )}&am=${subtotal}&cu=INR&tn=${encodeURIComponent(
    primaryCourse?.title?.slice(0, 20) || "Arkado Course"
  )}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    upiUrl
  )}`;

  const handleCheckoutClick = () => {
    if (cartItems.length === 0) return;
    setErrorMsg("");
    setStep("pay");
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("कृपया अपना पूरा नाम भरें।");
      return;
    }
    if (deliveryMode === "whatsapp" && !phone.trim()) {
      setErrorMsg("कृपया अपना WhatsApp मोबाइल नंबर दर्ज करें।");
      return;
    }
    if (deliveryMode === "gmail" && !email.trim()) {
      setErrorMsg("कृपया अपना Gmail एड्रेस दर्ज करें।");
      return;
    }
    if (!utr.trim() || utr.trim().length < 6) {
      setErrorMsg("कृपया 12 अंकों का वैध UTR / Transaction No. दर्ज करें।");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          delivery_mode: deliveryMode,
          phone: phone.trim(),
          email: email.trim(),
          utr: utr.trim(),
          course_id: primaryCourse?.id || "bundle",
          course_title: cartItems.map((c) => c.title).join(", "),
          amount: subtotal,
          drive_url: primaryCourse?.drive_url || "https://drive.google.com",
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Order submit nahi ho paya");

      setCreatedOrder(data.order);
      setStep("success");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error submitting order");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const stepIndex = step === "cart" ? 0 : step === "pay" ? 1 : 2;
  const stepLabels = ["Cart", "Payment", "Done"];

  return (
    <>
      <div className="overlay-blur anim-fade-in-up" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 w-full sm:max-w-md bg-white z-[55] shadow-2xl flex flex-col overflow-hidden anim-slide-down">
        {/* Header with progress */}
        <div className="border-b border-slate-200 bg-white shrink-0">
          <div className="p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-md bg-amber-700 text-white flex items-center justify-center">
                  <CartIcon size={14} />
                </span>
                <h2 className="font-extrabold text-slate-900 text-base">
                  {step === "cart" && "आपकी कार्ट"}
                  {step === "pay" && "UPI Payment"}
                  {step === "success" && "ऑर्डर सफल!"}
                </h2>
              </div>
              {step !== "success" && (
                <p className="text-[11px] text-slate-500 mt-1 font-devanagari">
                  {cartItems.length} कोर्स • कुल: ₹{subtotal}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
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
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {errorMsg && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 font-semibold flex items-start gap-2">
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
                  <h3 className="font-bold text-slate-800">कार्ट खाली है</h3>
                  <p className="text-xs text-slate-500 mt-1 font-devanagari">
                    अपनी पसंद का कोर्स बंडल चुनें।
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
                        <span className="text-[10px] font-bold uppercase bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                          {getExamLabel(item.exam_id)}
                        </span>
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
                      <span className="font-devanagari">आपकी कुल छूट:</span>
                      <span className="font-black">₹{savings}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {step === "pay" && (
            <div className="space-y-3">
              <div className="p-4 bg-slate-900 text-white rounded-lg text-center space-y-3">
                <span className="inline-block text-[10px] font-bold bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full uppercase">
                  0% Extra Charge • Direct Payment
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
                  <p className="text-xs text-slate-300 font-devanagari">
                    PhonePe / Paytm / GPay से स्कैन करें
                  </p>
                  <p className="text-xl font-black text-amber-400 mt-0.5">
                    ₹{subtotal}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono mt-1">
                    UPI: <span className="text-white font-bold">{upiId}</span>
                  </p>
                </div>

                <div className="pt-1 flex flex-wrap justify-center gap-2">
                  <a
                    href={`phonepe://pay?pa=${upiId}&pn=${encodeURIComponent(
                      merchantName
                    )}&am=${subtotal}&cu=INR`}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold rounded transition"
                  >
                    PhonePe
                  </a>
                  <a
                    href={`paytmmp://pay?pa=${upiId}&pn=${encodeURIComponent(
                      merchantName
                    )}&am=${subtotal}&cu=INR`}
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

              <form id="upi-order-form" onSubmit={handleOrderSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 font-devanagari">
                    आपका पूरा नाम *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="राहुल शर्मा"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-md border border-slate-300 text-sm focus:outline-none focus:border-amber-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 font-devanagari">
                    डिलीवरी मोड *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryMode("whatsapp")}
                      className={`p-2.5 rounded-md border text-left transition cursor-pointer ${
                        deliveryMode === "whatsapp"
                          ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <WhatsappIcon size={16} />
                        <span className="text-xs font-bold">WhatsApp</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Instant message link
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryMode("gmail")}
                      className={`p-2.5 rounded-md border text-left transition cursor-pointer ${
                        deliveryMode === "gmail"
                          ? "border-amber-600 bg-amber-50 text-amber-950 font-bold"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">✉️</span>
                        <span className="text-xs font-bold">Email</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Without mobile number
                      </div>
                    </button>
                  </div>
                </div>

                {deliveryMode === "whatsapp" ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1 font-devanagari">
                      WhatsApp नंबर *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-md border border-slate-300 text-sm focus:outline-none focus:border-amber-700"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1 font-devanagari">
                      Gmail *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="you@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-md border border-slate-300 text-sm focus:outline-none focus:border-amber-700"
                    />
                  </div>
                )}

                <div className="p-3 bg-amber-50/70 rounded-md border border-amber-200 space-y-1.5">
                  <label className="block text-xs font-extrabold text-amber-900 font-devanagari">
                    12 अंकों का UTR / Transaction No. *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="423984729384"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-amber-300 text-sm bg-white font-mono uppercase tracking-wider focus:outline-none focus:border-amber-600"
                  />
                  <p className="text-[10px] text-amber-800 font-devanagari">
                    💡 PhonePe/Paytm में पेमेंट सफल होने के बाद 12 अंकों का UTR मिलेगा।
                  </p>
                </div>
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
                <h3 className="text-lg font-black text-slate-900 mt-2 font-devanagari">
                  धन्यवाद {createdOrder.name}!
                </h3>
                <p className="text-xs text-slate-600 font-devanagari">
                  आपका ऑर्डर सफलतापूर्वक दर्ज हो गया।
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">कोर्स:</span>
                  <span className="font-bold text-slate-800 line-clamp-1 text-right ml-2">
                    {createdOrder.course_title}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">राशि:</span>
                  <span className="font-bold text-slate-900">₹{createdOrder.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">UTR:</span>
                  <span className="font-mono font-bold text-slate-700">
                    {createdOrder.utr}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">डिलीवरी:</span>
                  <span className="font-bold text-emerald-700 uppercase text-[11px]">
                    {createdOrder.delivery_mode}
                  </span>
                </div>
              </div>

              {createdOrder.delivery_mode === "whatsapp" && (
                <a
                  href={`https://wa.me/${whatsappSupportNumber}?text=${encodeURIComponent(
                    `नमस्ते! मैंने Arkado से ${createdOrder.course_title} के लिए ₹${createdOrder.amount} पेमेंट किया है।\nOrder: ${createdOrder.order_id}\nUTR: ${createdOrder.utr}\nName: ${createdOrder.name}\nकृपया Drive नोट्स की लिंक भेजें।`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-pill-success w-full"
                >
                  <WhatsappIcon size={14} />
                  <span>WhatsApp पर तुरंत लिंक मंगाएं</span>
                </a>
              )}

              <button
                onClick={() => router.push("/download")}
                className="btn-primary w-full"
              >
                <DownloadIcon size={14} />
                <span>Download Notes Page →</span>
              </button>

              <button
                onClick={onClose}
                className="w-full py-2 rounded-md border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
              >
                विंडो बंद करें
              </button>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {cartItems.length > 0 && step !== "success" && (
          <div className="p-4 border-t border-slate-200 bg-white shrink-0">
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-sm text-slate-600 font-medium font-devanagari">
                कुल राशि:
              </span>
              <span className="text-2xl font-black text-slate-900">₹{subtotal}</span>
            </div>

            {step === "cart" ? (
              <button onClick={handleCheckoutClick} className="btn-primary w-full">
                <ShoppingBagIcon size={14} />
                <span>PhonePe / Paytm से भुगतान करें</span>
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("cart")}
                  className="w-1/3 py-3 rounded-md border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer flex items-center justify-center gap-1"
                >
                  <ChevronLeftIcon size={12} />
                  Back
                </button>
                <button
                  type="submit"
                  form="upi-order-form"
                  disabled={isSubmitting}
                  className="btn-pill-success flex-1 disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Confirm Order"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
