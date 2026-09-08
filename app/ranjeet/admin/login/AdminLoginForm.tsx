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
        document.cookie = `arkado-admin-verified=${data.token}; path=/; max-age=86400; SameSite=Lax; secure`;
        sessionStorage.setItem("arkado-admin-verified", data.token);
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
    <div className="min-h-screen bg-[#0d1117] text-stone-100 flex flex-col justify-between p-4 sm:p-6 font-sans relative overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-amber-600/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      {/* Top Bar */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between py-2 relative z-10">
        <Link
          href="/"
          className="text-xs font-mono text-stone-400 hover:text-white transition flex items-center gap-1"
        >
          <span>←</span>
          <span>मुख्य वेबसाइट (Store)</span>
        </Link>
        <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-stone-900 border border-stone-800 text-amber-400">
          🔒 Arkado Executive Security
        </span>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto my-auto relative z-10 bg-stone-900/90 border border-stone-800 backdrop-blur-xl rounded-2xl shadow-2xl p-7 sm:p-9 animate-slide-up">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-3 mb-3 group">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-xl shadow-amber-600/25 group-hover:scale-105 transition-transform duration-200 ring-1 ring-white/10">
              <Image
                src="/icon.png"
                alt="Arkado"
                width={64}
                height={64}
                priority
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-2xl font-black tracking-tight text-white font-sans">
              Arkado
            </span>
          </Link>
          <h1 className="text-lg font-bold tracking-tight text-stone-200 font-sans">
            एडमिनिस्ट्रेशन पोर्टल (Admin Panel)
          </h1>
          <p className="text-xs text-stone-400 mt-1 font-mono">
            Access restricted to authorized personnel only
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3.5 bg-red-950/40 border border-red-500/30 text-red-300 rounded-xl text-xs font-medium flex items-start gap-2">
              <span className="text-sm">⚠️</span>
              <span className="flex-1 leading-relaxed">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-400 mb-2">
              मास्टर एडमिन पासकोड (Passcode / Password)
            </label>
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="एडमिन पासवर्ड या पिन दर्ज करें"
                className="w-full pl-4 pr-16 py-3 rounded-xl border border-stone-700 bg-stone-950/80 text-white text-sm font-mono tracking-wider focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition placeholder:text-stone-600"
                autoFocus
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-2.5 top-2.5 px-2 py-1 text-[11px] font-mono rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white transition cursor-pointer border border-stone-700/60"
              >
                {showPin ? "छिपाएँ" : "देखें"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !pin}
            className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-600/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>सत्यापित हो रहा है...</span>
              </>
            ) : (
              <span>एडमिन पैनल खोलें (Enter Portal) →</span>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-stone-800 text-center">
          <p className="text-[11px] font-mono text-stone-500">
            Passcode configured via <code className="text-stone-400">ADMIN_PASSCODE</code>.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-md w-full mx-auto text-center py-4 relative z-10 text-[11px] font-mono text-stone-600">
        Arkado Management System • Authorized IP Monitoring Active
      </div>
    </div>
  );
}
