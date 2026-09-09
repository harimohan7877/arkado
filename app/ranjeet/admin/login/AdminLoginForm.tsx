"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const redirect = searchParams.get("redirect") || "/ranjeet/admin";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
        document.cookie = `arkado-admin-verified=${data.token}; path=/; max-age=86400; SameSite=Lax${isSecure ? "; Secure" : ""}`;
        sessionStorage.setItem("arkado-admin-verified", data.token);
        localStorage.setItem("arkado-admin-verified", data.token);
        router.push(redirect);
        router.refresh();
      } else {
        setError("अमान्य पासकोड (Invalid Passcode)। कृपया सही एडमिन पासवर्ड दर्ज करें।");
        setLoading(false);
      }
    } catch {
      setError("सर्वर से कनेक्ट करने में समस्या आई। पुनः प्रयास करें।");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-white border border-stone-200 rounded-2xl shadow-sm p-8 text-center">
        {/* Original Arkado Logo */}
        <div className="relative h-12 w-44 mx-auto mb-6 flex items-center justify-center">
          <Image
            src="/logo.svg"
            alt="Arkado"
            width={180}
            height={56}
            priority
            unoptimized
            className="object-contain w-full h-full"
          />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          <div className="relative">
            <input
              type={showPin ? "text" : "password"}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="पासवर्ड दर्ज करें"
              className="w-full pl-4 pr-16 py-3 rounded-xl border border-stone-300 text-stone-900 text-sm focus:outline-none focus:border-stone-800 focus:ring-1 focus:ring-stone-800 transition"
              autoFocus
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-2.5 top-2.5 px-2 py-1 text-xs text-stone-500 hover:text-stone-800 transition cursor-pointer"
            >
              {showPin ? "छिपाएँ" : "देखें"}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !pin}
            className="w-full py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-sm transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? "सत्यापित हो रहा है..." : "लॉगिन करें"}
          </button>
        </form>
      </div>
    </div>
  );
}
