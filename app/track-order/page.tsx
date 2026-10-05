"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PackageIcon, CheckCircleIcon } from "@/components/icons";
import {
  phaseOf,
  PHASE_INFO,
  TRACK_STEPS,
  stepIndex,
  type SafeOrder as TrackedOrder,
  type OrderPhase,
} from "@/lib/track-order";

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOrder(null);
    if (!orderId.trim() || phone.replace(/\D/g, "").length < 10) {
      setError("Please enter your Order ID and 10-digit phone number.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/track-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Order not found.");
      setOrder(data.order);
    } catch (err: any) {
      setError(err.message || "Something went wrong — please try again.");
    } finally {
      setLoading(false);
    }
  };

  const phase: OrderPhase | null = order ? phaseOf(order) : null;
  const info = phase ? PHASE_INFO[phase] : null;
  const activeStep = phase ? stepIndex(phase) : -1;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar cartCount={0} onCartClick={() => {}} />

      <main className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 mb-3">
            <PackageIcon size={24} />
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Track Your Order</h1>
          <p className="text-sm text-slate-500 mt-1">
            Enter your Order ID and phone number to check payment and delivery status.
          </p>
        </div>

        <form onSubmit={handleTrack} className="card-base p-5 mt-6 space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-700">Order ID</label>
            <input
              value={orderId}
              onChange={(e) => setOrderId(e.target.value.toUpperCase())}
              placeholder="ARK-2026-XXXXXXXX"
              className="mt-1 w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">You'll find it on the order success screen or in your WhatsApp message.</p>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">Phone Number (used in the order)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98765 43210"
              inputMode="numeric"
              className="mt-1 w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          {error && (
            <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition cursor-pointer"
          >
            {loading ? "Searching..." : "Track Order"}
          </button>
        </form>

        {order && info && (
          <div className="card-base p-5 mt-4 anim-fade-in-up">
            <div className="flex items-start gap-3">
              <span
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  phase === "failed" ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
                }`}
              >
                <CheckCircleIcon size={22} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-mono font-bold text-slate-500">{order.order_id}</p>
                <h2 className="font-black text-slate-900 text-lg leading-tight">{info.title}</h2>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{info.desc}</p>
              </div>
            </div>

            {phase !== "failed" && (
              <div className="mt-5 space-y-0">
                {TRACK_STEPS.map((label, i) => {
                  const done = i <= activeStep;
                  const current = i === activeStep;
                  return (
                    <div key={label} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                            done ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                          }`}
                        >
                          {done ? "✓" : i + 1}
                        </span>
                        {i < TRACK_STEPS.length - 1 && (
                          <span className={`w-0.5 h-5 ${i < activeStep ? "bg-emerald-600" : "bg-slate-200"}`} />
                        )}
                      </div>
                      <p className={`text-xs font-bold pb-4 ${done ? "text-slate-900" : "text-slate-400"} ${current ? "text-emerald-700" : ""}`}>
                        {label}
                        {current && <span className="ml-1.5 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">you are here</span>}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Course:</span>
                <span className="font-bold text-slate-800 text-right max-w-[60%]">{order.course_title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-bold text-slate-800">₹{order.amount}</span>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
