"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { Settings } from "@/lib/store-types";
import { DEFAULT_SETTINGS } from "@/lib/default-settings";

interface DeliveredItem {
  productId: string;
  title: string;
  drive_url: string;
}

/**
 * Purchase-access route (legacy /download URL kept useful).
 *
 * This page NEVER claims a payment succeeded on its own: it shows a
 * confirmation only after the server verifies the order through the
 * PhonePe Order Status API (the same route the payment success page
 * and track-order use). Without an orderId it is a neutral access
 * page — sign in for the dashboard, or track an order by ID.
 *
 * No fake fallback order id, no query-driven success messaging.
 */
type OrderState =
  | "idle"
  | "checking"
  | "completed"
  | "pending"
  | "failed"
  | "not-found"
  | "error";

function DownloadContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || searchParams.get("order_id") || "";

  const [settings, setSettings] = useState<Settings | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [orderState, setOrderState] = useState<OrderState>(orderId ? "checking" : "idle");
  const [pendingLink, setPendingLink] = useState(false);
  const [deliveredItems, setDeliveredItems] = useState<DeliveredItem[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {});
    supabase.auth
      .getUser()
      .then(({ data }) => setSignedIn(Boolean(data?.user)))
      .catch(() => setSignedIn(false));
  }, []);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `/api/payment/phonepe/status?orderId=${encodeURIComponent(orderId)}`
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.success) {
          if (res.status === 404) {
            setOrderState("not-found");
          } else {
            setOrderState("error");
            setErrorMsg(
              data.error || "We could not check this order right now."
            );
          }
          return;
        }
        if (data.state === "COMPLETED") {
          setPendingLink(Boolean(data.pendingLink));
          setDeliveredItems(
            Array.isArray(data.deliveredItems) ? data.deliveredItems : []
          );
          setOrderState("completed");
        } else if (data.state === "FAILED") {
          setOrderState("failed");
        } else {
          setOrderState("pending");
        }
      } catch {
        if (!cancelled) {
          setOrderState("error");
          setErrorMsg(
            "We could not check this order right now. Please try again in a moment."
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const supportNumber =
    settings?.contact?.whatsapp_number ||
    settings?.whatsapp_support_number ||
    DEFAULT_SETTINGS.whatsapp_support_number;
  const displayPhone = settings?.contact?.phone || DEFAULT_SETTINGS.contact.phone;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16 text-center space-y-6">
      {/* No order id: neutral purchase-access page */}
      {orderState === "idle" && (
        <>
          <div className="space-y-2">
            <div className="w-20 h-20 bg-amber-100 text-amber-700 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-xs">
              📚
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              My Purchases
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Your purchased notes and download links live in your account.
              After payment, the same links are also sent to your email.
            </p>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-xs text-left space-y-4">
            {signedIn ? (
              <div className="space-y-3">
                <p className="text-sm font-bold text-stone-900">
                  You are signed in — your purchases are ready in your dashboard.
                </p>
                <Link
                  href="/dashboard"
                  className="w-full py-4 px-6 bg-amber-700 hover:bg-amber-800 text-white font-extrabold text-sm rounded-2xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  Go to My Dashboard →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-bold text-stone-900">
                  Sign in to see your purchases and download links.
                </p>
                <Link
                  href="/auth"
                  className="w-full py-4 px-6 bg-amber-700 hover:bg-amber-800 text-white font-extrabold text-sm rounded-2xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  Sign In →
                </Link>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Bought as a guest? Your download links were sent to your
                  email after payment. You can also look up any order with
                  its Order ID.
                </p>
              </div>
            )}
            <Link
              href="/track-order"
              className="w-full py-4 px-6 bg-white hover:bg-stone-50 text-stone-900 font-extrabold text-sm rounded-2xl transition border border-stone-300 flex items-center justify-center gap-2 cursor-pointer"
            >
              📦 Track an Order
            </Link>
          </div>
        </>
      )}

      {/* Verifying a supplied order id against the server */}
      {orderState === "checking" && (
        <div className="py-10 space-y-4">
          <div className="w-10 h-10 border-3 border-amber-600/30 border-t-amber-600 rounded-full animate-spin mx-auto" />
          <h1 className="text-lg font-bold text-stone-900">Checking your order...</h1>
          <p className="text-sm text-stone-500">Please wait — do not close this page.</p>
        </div>
      )}

      {/* Server-verified paid order, links ready */}
      {orderState === "completed" && !pendingLink && (
        <>
          <div className="space-y-2">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-xs">
              ✓
            </div>
            <span className="inline-block text-xs font-mono font-bold bg-stone-100 text-stone-700 px-3 py-1 rounded-full border border-stone-200">
              Order ID: {orderId}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Payment Confirmed
            </h1>
            <p className="text-xs sm:text-sm text-stone-600">
              Your study material is ready — download it below. The same links
              have also been sent to your email.
            </p>
          </div>
          <div className="space-y-2 text-left">
            {deliveredItems.map((k) => (
              <a
                key={k.productId}
                href={k.drive_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-bold text-emerald-800 hover:bg-emerald-100 transition"
              >
                📥 {k.title}
              </a>
            ))}
          </div>
          <p className="text-xs text-stone-500">
            Saved to your account too — find it anytime in your{" "}
            <Link href="/dashboard" className="text-amber-800 font-bold hover:underline">
              dashboard
            </Link>
            .
          </p>
        </>
      )}

      {/* Server-verified paid order, links not ready yet */}
      {orderState === "completed" && pendingLink && (
        <>
          <div className="space-y-2">
            <div className="w-20 h-20 bg-amber-100 text-amber-700 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-xs">
              ⏳
            </div>
            <span className="inline-block text-xs font-mono font-bold bg-stone-100 text-stone-700 px-3 py-1 rounded-full border border-stone-200">
              Order ID: {orderId}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Payment Confirmed
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Your download links will be sent <strong>within 1 hour</strong> on
              your email and WhatsApp. No further action is needed from you.
            </p>
          </div>
          <Link
            href="/track-order"
            className="inline-block px-5 py-2.5 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl transition"
          >
            Track Your Order →
          </Link>
        </>
      )}

      {/* Payment still being confirmed by the gateway */}
      {orderState === "pending" && (
        <div className="py-6 space-y-4">
          <div className="w-20 h-20 bg-amber-100 text-amber-700 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-xs">
            ⏳
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            Payment is still being confirmed
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Your payment is still being confirmed. Your order ID is{" "}
            <strong className="font-mono">{orderId}</strong> — check its status
            here in a few minutes, or on the track-order page.
          </p>
          <Link
            href="/track-order"
            className="inline-block px-5 py-2.5 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl transition"
          >
            Track Your Order →
          </Link>
        </div>
      )}

      {/* Server-verified failed payment */}
      {orderState === "failed" && (
        <div className="py-6 space-y-4">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-xs">
            ✕
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            Payment Failed
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Your payment did not go through — no money was charged for order{" "}
            <strong className="font-mono">{orderId}</strong>. Please try again.
          </p>
          <Link
            href="/exams"
            className="inline-block px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-xl transition"
          >
            Try Again →
          </Link>
        </div>
      )}

      {/* Unknown order id — never claim a purchase */}
      {orderState === "not-found" && (
        <div className="py-6 space-y-4">
          <div className="w-20 h-20 bg-stone-100 text-stone-500 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-xs">
            ?
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            We couldn&apos;t find this order
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            No order matches ID <strong className="font-mono">{orderId}</strong>.
            Please check the Order ID from your payment confirmation email, or
            sign in to see your purchases.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/track-order"
              className="px-5 py-2.5 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl transition"
            >
              Track an Order →
            </Link>
            <Link
              href="/auth"
              className="px-5 py-2.5 bg-white hover:bg-stone-50 text-stone-900 text-xs font-bold rounded-xl transition border border-stone-300"
            >
              Sign In →
            </Link>
          </div>
        </div>
      )}

      {/* Status check itself failed */}
      {orderState === "error" && (
        <div className="py-6 space-y-4">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-xs">
            !
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            Could Not Check This Order
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">{errorMsg}</p>
          <p className="text-xs text-stone-500">
            If money was deducted, it will be confirmed automatically — check
            your order status with your order ID.
          </p>
          <Link
            href="/track-order"
            className="inline-block px-5 py-2.5 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl transition"
          >
            Track Your Order →
          </Link>
        </div>
      )}

      <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          href="/"
          className="w-full sm:w-auto px-6 py-3 rounded-full border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-100 transition"
        >
          ← Back to Home
        </Link>
        <a
          href={`https://wa.me/${supportNumber.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto px-6 py-3 rounded-full bg-stone-900 text-white font-bold text-xs hover:bg-stone-800 transition"
        >
          Helpline Support ({displayPhone})
        </a>
        <Link
          href="/track-order"
          className="w-full sm:w-auto px-6 py-3 rounded-full border border-amber-300 bg-amber-50 text-amber-800 font-bold text-xs hover:bg-amber-100 transition"
        >
          📦 Track Order Status
        </Link>
      </div>
    </div>
  );
}

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-between font-sans">
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<div className="text-center py-20">Loading...</div>}>
          <DownloadContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
