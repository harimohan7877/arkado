"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface DeliveredItem {
  productId: string;
  title: string;
  drive_url: string;
}

type StatusState = "checking" | "completed" | "pending" | "failed" | "error";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || "";
  const [state, setState] = useState<StatusState>("checking");
  const [pendingLink, setPendingLink] = useState(false);
  const [deliveredItems, setDeliveredItems] = useState<DeliveredItem[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (!orderId) {
      setState("error");
      setErrorMsg("No order ID was provided.");
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = async () => {
      attemptsRef.current += 1;
      try {
        const res = await fetch(
          `/api/payment/phonepe/status?orderId=${encodeURIComponent(orderId)}`
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.success) {
          if (attemptsRef.current < 10) {
            timer = setTimeout(check, 3000);
            return;
          }
          setState("error");
          setErrorMsg(
            data.error || "We could not confirm your payment yet. Please check your order status in a moment."
          );
          return;
        }
        if (data.state === "COMPLETED") {
          setPendingLink(Boolean(data.pendingLink));
          setDeliveredItems(
            Array.isArray(data.deliveredItems) ? data.deliveredItems : []
          );
          setState("completed");
        } else if (data.state === "FAILED") {
          setState("failed");
        } else if (attemptsRef.current < 10) {
          // PENDING — PhonePe may still be confirming; poll a few times.
          timer = setTimeout(check, 3000);
        } else {
          setState("pending");
        }
      } catch {
        if (cancelled) return;
        if (attemptsRef.current < 10) {
          timer = setTimeout(check, 3000);
        } else {
          setState("error");
          setErrorMsg(
            "We could not confirm your payment yet. Please check your order status in a moment."
          );
        }
      }
    };

    void check();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderId]);

  return (
    <div className="min-h-screen bg-[#fcfcf9] font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 text-center">
          <div className="text-2xl font-extrabold tracking-[8px] text-amber-700">ARKADO</div>
          <p className="text-[10px] tracking-[3px] text-stone-400 mt-1">DEEP-LEVEL EXAM ANALYSIS</p>

          {state === "checking" && (
            <div className="py-10">
              <div className="w-10 h-10 border-3 border-amber-600/30 border-t-amber-600 rounded-full animate-spin mx-auto mb-4" />
              <h1 className="text-lg font-bold text-stone-900">Confirming your payment...</h1>
              <p className="text-sm text-stone-500 mt-1">Please wait — do not close this page.</p>
            </div>
          )}

          {state === "completed" && !pendingLink && (
            <div className="py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center text-3xl">✓</div>
              <div>
                <span className="text-[11px] font-mono font-bold bg-stone-100 text-stone-700 px-2.5 py-1 rounded-full">
                  Order ID: {orderId}
                </span>
                <h1 className="text-xl font-black text-stone-900 mt-3">Payment Successful!</h1>
                <p className="text-sm text-stone-600 mt-1">
                  Your study material is ready — download it below. The same links have also been sent to your email.
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
                <Link href="/dashboard" className="text-amber-800 font-bold hover:underline">dashboard</Link>.
              </p>
            </div>
          )}

          {state === "completed" && pendingLink && (
            <div className="py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center text-3xl">⏳</div>
              <div>
                <span className="text-[11px] font-mono font-bold bg-stone-100 text-stone-700 px-2.5 py-1 rounded-full">
                  Order ID: {orderId}
                </span>
                <h1 className="text-xl font-black text-stone-900 mt-3">Payment Successful!</h1>
                <p className="text-sm text-stone-600 mt-1 leading-relaxed">
                  Your download links will be sent <strong>within 1 hour</strong> on your email and WhatsApp.
                </p>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-left">
                <p className="text-xs text-amber-800 leading-relaxed">
                  This study material is being prepared. You will receive the links on your email and WhatsApp within 1 hour — no further action is needed from you.
                </p>
              </div>
              <Link
                href="/track-order"
                className="inline-block px-5 py-2.5 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl transition"
              >
                Track Your Order →
              </Link>
            </div>
          )}

          {state === "pending" && (
            <div className="py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center text-3xl">⏳</div>
              <h1 className="text-xl font-black text-stone-900">Payment is still being confirmed</h1>
              <p className="text-sm text-stone-600 leading-relaxed">
                PhonePe is still confirming your payment. Your order ID is{" "}
                <strong className="font-mono">{orderId}</strong> — check its status here in a few minutes, or on the track-order page.
              </p>
              <Link
                href="/track-order"
                className="inline-block px-5 py-2.5 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl transition"
              >
                Track Your Order →
              </Link>
            </div>
          )}

          {state === "failed" && (
            <div className="py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center text-3xl">✕</div>
              <h1 className="text-xl font-black text-stone-900">Payment Failed</h1>
              <p className="text-sm text-stone-600 leading-relaxed">
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

          {state === "error" && (
            <div className="py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center text-3xl">!</div>
              <h1 className="text-xl font-black text-stone-900">Could Not Confirm Payment</h1>
              <p className="text-sm text-stone-600 leading-relaxed">{errorMsg}</p>
              <p className="text-xs text-stone-500">
                If money was deducted, it will be confirmed automatically — check your order status with your order ID{orderId ? ` (${orderId})` : ""}.
              </p>
              <Link
                href="/track-order"
                className="inline-block px-5 py-2.5 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl transition"
              >
                Track Your Order →
              </Link>
            </div>
          )}

          <div className="pt-4 border-t border-stone-100 mt-6">
            <p className="text-[11px] text-stone-400">
              Need help? WhatsApp us at{" "}
              <a href="https://wa.me/917852004401" className="text-emerald-700 font-bold hover:underline">+91 78520 04401</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fcfcf9] flex items-center justify-center p-6">
          <div className="w-10 h-10 border-3 border-amber-600/30 border-t-amber-600 rounded-full animate-spin" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
