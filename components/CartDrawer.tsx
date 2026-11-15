"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { CourseBundle } from "@/lib/courses";
import { getExamLabel } from "@/lib/exam-labels";
import { DEFAULT_SETTINGS, getCleanWhatsAppNumber } from "@/lib/default-settings";
import { fetchWithCache, useSettings } from "@/lib/store-hooks";
import { trackEvent, getVisitorId, getSessionId, getUtmSource } from "@/components/PageViewTracker";
import { finalItemPrice, isPreDiscountedItem, useSiteSale, fillTemplate } from "@/lib/sale-pricing";
import { getFestivalOffer } from "@/lib/default-settings";
import { supabase } from "@/lib/supabase";
import {
  CloseIcon,
  CartIcon,
  CheckIcon,
  AlertCircleIcon,
  ShoppingBagIcon,
  WhatsappIcon,
  ChevronLeftIcon,
} from "@/components/icons";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CourseBundle[];
  onRemoveItem: (id: string) => void;
}

type Step = "cart" | "pay";
/** Inside the pay step: sign-in gate first (logged-out only), then details. */
type CheckoutView = "signin" | "details";

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onRemoveItem,
}: CartDrawerProps) {
  const { pct: salePct, isLive: saleLive } = useSiteSale();
  const { settings: saleSettings } = useSettings();
  const saleLabel = fillTemplate(getFestivalOffer(saleSettings).cart_sale_label, { pct: salePct });
  const [step, setStep] = useState<Step>("cart");
  const [checkoutView, setCheckoutView] = useState<CheckoutView>("details");
  const contentScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTop = 0;
    }
  }, [step, checkoutView]);

  // Analytics (Phase 2, fail-silent): funnel steps only, no PII, no order data.
  // Phase D: on drawer open, one cart_item event per cart LINE ("cart kholne par
  // cart me tha" — not a true "add" event; drawer re-opens re-count).
  // cartItems intentionally NOT in deps: this is an open-time snapshot.
  useEffect(() => {
    if (isOpen) {
      trackEvent({ event_type: "cart_open" });
      cartItems.forEach((item) => {
        trackEvent({ event_type: "cart_item", product_id: item.id });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  useEffect(() => {
    if (step === "pay") trackEvent({ event_type: "checkout_step", element: "pay" });
  }, [step]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // --- Sign-in gate (optional) ---
  // Logged-in customers skip the panel entirely and their orders link to
  // their account (dashboard re-download). Guests continue without signing
  // in — the order is tied to their email instead.
  const [authUser, setAuthUser] = useState<{ id: string; email?: string; user_metadata?: Record<string, unknown> } | null>(null);
  const [guestMode, setGuestMode] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");

  const [support, setSupport] = useState<{
    whatsapp_support: string;
    support_email: string;
  }>({
    whatsapp_support: DEFAULT_SETTINGS.whatsapp_support_number,
    support_email: DEFAULT_SETTINGS.contact.email,
  });

  const whatsappSupportNumber = support.whatsapp_support;
  const supportEmail = support.support_email || DEFAULT_SETTINGS.contact.email;

  const handleDrawerClose = () => {
    setErrorMsg("");
    setAuthError("");
    setAuthNotice("");
    // Reset to the cart step — otherwise reopening the drawer after
    // closing from checkout shows the payment form instead of the cart.
    setStep("cart");
    setCheckoutView("details");
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setErrorMsg("");
      setAuthError("");
      setAuthNotice("");
      // Who is signed in? Prefill the form from the account when logged in.
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setAuthUser(user as typeof authUser);
          const metaName =
            (user.user_metadata?.full_name as string) ||
            (user.user_metadata?.name as string) ||
            "";
          if (metaName && !name) setName(metaName);
          if (user.email) setEmail(user.email);
          setGuestMode(false);
          setCheckoutView("details");
        } else {
          setAuthUser(null);
          setCheckoutView(guestMode ? "details" : "signin");
        }
      }).catch(() => {});
      fetchWithCache<any>("/api/settings")
        .then((data) => {
          if (data && !data.error) {
            setSupport({
              whatsapp_support: data.contact?.whatsapp_number || data.whatsapp_support_number || DEFAULT_SETTINGS.whatsapp_support_number,
              support_email: data.contact?.email || data.gmail_support_email || DEFAULT_SETTINGS.contact.email,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Totals: site-wide sale auto-applies to every item (bundle-* items already include it)
  const subtotal = cartItems.reduce((sum, item) => sum + finalItemPrice(item, salePct), 0);
  const preSaleSubtotal = cartItems.reduce((sum, item) => sum + item.price, 0);
  const saleSavings = preSaleSubtotal - subtotal;
  const totalOriginal = cartItems.reduce((sum, item) => sum + item.original_price, 0);
  const savings = totalOriginal - subtotal;
  const primaryCourse = cartItems[0];

  const handleCheckoutClick = () => {
    if (cartItems.length === 0) return;
    setErrorMsg("");
    setAuthError("");
    setAuthNotice("");
    setCheckoutView(authUser || guestMode ? "details" : "signin");
    setStep("pay");
  };

  /** Email sign-in / sign-up (Supabase Auth). Google sign-in comes later. */
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthNotice("");
    const cleanAuthEmail = authEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanAuthEmail)) {
      setAuthError("Please enter a valid email address.");
      return;
    }
    if (authPassword.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }
    setAuthBusy(true);
    try {
      if (authMode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanAuthEmail,
          password: authPassword,
        });
        if (error) throw error;
        if (data.user) {
          setAuthUser(data.user as typeof authUser);
          if (data.user.email) setEmail(data.user.email);
          const metaName =
            (data.user.user_metadata?.full_name as string) ||
            (data.user.user_metadata?.name as string) ||
            "";
          if (metaName) setName(metaName);
          setCheckoutView("details");
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: cleanAuthEmail,
          password: authPassword,
        });
        if (error) throw error;
        if (data.user) {
          setAuthUser(data.user as typeof authUser);
          setEmail(cleanAuthEmail);
          setCheckoutView("details");
        } else {
          // Email confirmation is still ON in Supabase — the account was
          // created but no session yet. Guest checkout stays available.
          setAuthNotice(
            "Account created! Please confirm it from the link sent to your email, then continue. Or continue as a guest below."
          );
        }
      }
    } catch (err: any) {
      setAuthError(err?.message || "Could not sign in. Please try again.");
    } finally {
      setAuthBusy(false);
    }
  };

  /** Shared form validation for checkout. Null = valid. */
  const validateCheckoutForm = (): string | null => {
    if (!name.trim()) {
      return "Please enter your full name.";
    }
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      return "Please enter a valid 10-digit Indian mobile number.";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      return "Please enter a valid email address.";
    }
    if (!termsAccepted) {
      return "Please accept the Terms of Service to continue.";
    }
    return null;
  };

  /** PhonePe checkout: server creates the order (prices re-verified
   * server-side), then the customer pays on PhonePe's hosted page.
   * The browser navigates there client-side (PhonePe validates the
   * referrer header — a server redirect can fail). Payment completion
   * and delivery happen server-side (webhook + status check), so the
   * order completes even if the customer closes the browser. */
  const handlePhonePePay = async () => {
    setErrorMsg("");
    const formError = validateCheckoutForm();
    if (formError) {
      setErrorMsg(formError);
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);

    setIsSubmitting(true);
    try {
      // Attach the session token when logged in so the order links to
      // the account (dashboard re-download). Guests send no token.
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authUser) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }
      }

      const res = await fetch("/api/payment/phonepe/create-order", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: cleanPhone,
          items: cartItems.map((item: any) => ({
            id: item.id,
            title: item.title,
            price: finalItemPrice(item, salePct),
            quantity: 1,
            bundle_items: Array.isArray(item.bundle_items) ? item.bundle_items : undefined,
          })),
          totalAmount: subtotal,
          terms_accepted: termsAccepted,
          // Analytics attribution (Phase E): anonymous session keys ONLY —
          // never name/phone/email. Server stores them in nullable columns
          // (or drops them if the migration hasn't run); order flow unaffected.
          visitor_id: getVisitorId(),
          session_id: getSessionId(),
          utm_source: getUtmSource() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error || !data.redirectUrl) {
        throw new Error(data.error || "Could not start the payment. Please try again.");
      }

      // Analytics (Phase 2): order placed — product only, never PII.
      trackEvent({ event_type: "order_placed", product_id: primaryCourse?.id });

      // Clear the cart before leaving so a back-button return doesn't re-buy.
      cartItems.forEach((item) => onRemoveItem(item.id));
      handleDrawerClose();
      window.location.href = data.redirectUrl;
    } catch (err: any) {
      console.error("PhonePe checkout error:", err);
      setErrorMsg(err.message || "Something went wrong. Please contact us on WhatsApp.");
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handlePhonePePay();
  };

  if (!isOpen) return null;

  const stepIndex = step === "cart" ? 0 : 1;
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
                  {step === "pay" && checkoutView === "signin" && "Sign In"}
                  {step === "pay" && checkoutView === "details" && "Payment / Checkout"}
                </h2>
              </div>
              {step !== "pay" && (
                <p className="text-[11px] text-slate-500 mt-1">
                  {cartItems.length} {cartItems.length === 1 ? "Course" : "Courses"} • Total: ₹{subtotal}
                </p>
              )}
              {step === "pay" && checkoutView === "details" && (
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

          {/* Progress steps — hidden on the cart step when the cart is empty (nothing to progress through yet) */}
          {!(step === "cart" && cartItems.length === 0) && (
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
          )}
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
                  <button
                    onClick={handleDrawerClose}
                    className="btn-primary mt-5"
                  >
                    <ShoppingBagIcon size={14} />
                    <span>Continue Shopping</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {cartItems.map((item) => {
                    const itemFinal = finalItemPrice(item, salePct);
                    const itemPre = isPreDiscountedItem(item);
                    const itemWas = saleLive && !itemPre ? item.price : item.original_price;
                    const itemBadge = saleLive && !itemPre ? `${salePct}% OFF` : `${item.discount_percent}% OFF`;
                    return (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start justify-between gap-3"
                    >
                      <div className="relative w-12 h-14 rounded overflow-hidden bg-white border border-slate-200 shrink-0">
                        <Image
                          unoptimized
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
                            ₹{itemFinal}
                          </span>
                          <span className="text-[11px] text-slate-400 line-through">
                            ₹{itemWas}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {itemBadge}
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
                    );
                  })}

                  {saleLive && saleSavings > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 font-semibold flex items-center justify-between">
                      <span className="font-medium">{saleLabel}</span>
                      <span className="font-black">− ₹{saleSavings}</span>
                    </div>
                  )}
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

          {step === "pay" && checkoutView === "signin" && (
            <div className="space-y-3">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <h3 className="font-bold text-slate-900 text-sm">Save your purchase to your dashboard</h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  Sign in to find all your notes and download links in one place later — on any device. Signing up is optional.
                </p>
              </div>

              {authNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 font-semibold">
                  {authNotice}
                </div>
              )}
              {authError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-800 font-semibold flex items-start gap-2">
                  <AlertCircleIcon size={14} className="shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="you@gmail.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value.trim().toLowerCase())}
                    className="w-full px-3 py-2.5 rounded-md border border-slate-300 text-sm focus:outline-none focus:border-amber-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-md border border-slate-300 text-sm focus:outline-none focus:border-amber-700"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authBusy}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 hover:from-amber-800 hover:to-amber-950 text-white font-extrabold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  {authBusy ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Please wait...</span>
                    </>
                  ) : (
                    <span>{authMode === "login" ? "Sign In & Continue" : "Create Account & Continue"}</span>
                  )}
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === "login" ? "signup" : "login");
                  setAuthError("");
                  setAuthNotice("");
                }}
                className="w-full text-xs font-bold text-amber-800 hover:underline cursor-pointer"
              >
                {authMode === "login"
                  ? "New here? Create an account"
                  : "Already have an account? Sign in"}
              </button>

              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[11px] font-bold text-slate-400">OR</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <button
                type="button"
                onClick={() => {
                  setGuestMode(true);
                  setCheckoutView("details");
                }}
                className="w-full py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition cursor-pointer"
              >
                Continue without sign-in
              </button>
              <p className="text-[11px] text-slate-500 text-center">
                You can still get your links by email and WhatsApp. Your order is linked to your email.
              </p>
            </div>
          )}

          {step === "pay" && checkoutView === "details" && (
            <div className="space-y-3">
              {/* Order summary */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between gap-2">
                    <span className="text-slate-600 line-clamp-1">{item.title}</span>
                    <span className="font-bold text-slate-900 shrink-0">₹{finalItemPrice(item, salePct)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="font-bold text-slate-800">Total</span>
                  <span className="font-black text-slate-900 text-sm">₹{subtotal}</span>
                </div>
              </div>

              {authUser && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 font-semibold">
                  Signed in as {authUser.email} — this order will appear in your dashboard.
                </div>
              )}

              {/* Order Form */}
              <form id="checkout-form" onSubmit={handleFormSubmit} className="space-y-3">
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
                      <WhatsappIcon size={14} className="text-emerald-600 inline" /> WhatsApp / Mobile Number *
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">10 digits</span>
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={16}
                    placeholder="e.g. 9876543210"
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
                    <span>Email Address *</span>
                    <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                      Notes will be sent here
                    </span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. rahul@gmail.com"
                    value={email}
                    disabled={Boolean(authUser)}
                    onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
                    className="w-full px-3 py-2.5 rounded-md border border-slate-300 text-sm focus:outline-none focus:border-amber-700 disabled:bg-slate-50 disabled:text-slate-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Your Google Drive notes and test access links will be sent to this email.
                  </p>
                </div>

                {/* Terms & Conditions acceptance (mandatory) */}
                <div className="pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-amber-700 cursor-pointer"
                    />
                    <span className="text-[11px] leading-relaxed text-slate-600">
                      I agree to the{" "}
                      <a
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-amber-800 font-bold hover:underline"
                      >
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a
                        href="/refund"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-amber-800 font-bold hover:underline"
                      >
                        Refund Policy
                      </a>{" "}
                      and{" "}
                      <a
                        href="/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-amber-800 font-bold hover:underline"
                      >
                        Privacy Policy
                      </a>
                      . *
                    </span>
                  </label>
                </div>

                {/* Pay button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 hover:from-amber-800 hover:to-amber-950 text-white font-extrabold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md cursor-pointer mt-4"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Opening secure payment...</span>
                    </>
                  ) : (
                    <>
                      <CheckIcon size={16} />
                      <span>Pay ₹{subtotal} Securely</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-slate-500 text-center pt-1">
                  Secure payment via PhonePe — UPI, card or netbanking. Your download links appear right after payment.
                </p>
                <p className="text-[11px] text-slate-500 text-center">
                  Having trouble paying?{" "}
                  <a
                    href={`https://wa.me/${getCleanWhatsAppNumber({ whatsapp_support_number: whatsappSupportNumber } as any)}?text=${encodeURIComponent(
                      `Hello Arkado! I need help buying "${primaryCourse?.title || "a course"}" (₹${subtotal}).`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <WhatsappIcon size={13} className="inline text-emerald-600" /> WhatsApp Support
                  </a>
                </p>
              </form>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {cartItems.length > 0 && step === "cart" && (
          <div className="p-4 border-t border-slate-200 bg-white shrink-0">
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-sm text-slate-600 font-medium">
                Total Amount:
              </span>
              <span className="text-2xl font-black text-slate-900">₹{subtotal}</span>
            </div>

            <button onClick={handleCheckoutClick} className="btn-primary w-full">
              <ShoppingBagIcon size={14} />
              <span>Proceed to Checkout</span>
            </button>
          </div>
        )}

        {cartItems.length > 0 && step === "pay" && checkoutView === "details" && (
          <div className="p-4 border-t border-slate-200 bg-white shrink-0">
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-sm text-slate-600 font-medium">
                Total Amount:
              </span>
              <span className="text-2xl font-black text-slate-900">₹{subtotal}</span>
            </div>

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
                form="checkout-form"
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 hover:from-amber-800 hover:to-amber-950 text-white font-extrabold text-xs sm:text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Opening secure payment...</span>
                  </>
                ) : (
                  <>
                    <CheckIcon size={16} />
                    <span>Pay ₹{subtotal} Securely</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step === "pay" && checkoutView === "signin" && (
          <div className="p-4 border-t border-slate-200 bg-white shrink-0">
            <button
              type="button"
              onClick={() => setStep("cart")}
              className="w-full py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer flex items-center justify-center gap-1"
            >
              <ChevronLeftIcon size={14} />
              <span>Back to Cart</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
