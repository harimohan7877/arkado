"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const redirect = searchParams.get("redirect") || "/admin";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      if (res.ok) {
        const data = await res.json();
        document.cookie = `arkado-admin-verified=${data.token}; path=/; max-age=86400; SameSite=Lax`;
        sessionStorage.setItem("arkado-admin-verified", data.token);
        router.push(redirect);
        router.refresh();
      } else {
        setError("Invalid PIN. Access denied.");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-neutral-900 via-neutral-800 to-amber-500 flex items-center justify-center text-white font-black text-2xl mx-auto mb-4">
            A
          </div>
          <h1 className="text-2xl font-bold text-white">Arkado Admin</h1>
          <p className="text-neutral-400 text-sm mt-1">Enter PIN to access admin panel</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-950/30 border border-red-500/30 text-red-400 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Admin PIN
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter 4-digit PIN"
              className="w-full px-4 py-3 rounded-xl border border-neutral-700 bg-neutral-950 text-white text-lg font-mono tracking-widest focus:outline-none focus:border-emerald-500"
              maxLength={4}
              autoFocus
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm transition-all disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Access Admin Panel"}
          </button>
        </form>

        <div className="mt-6 p-4 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-500">
          <p className="font-semibold text-neutral-400">PIN set via <code className="text-white font-mono">ADMIN_PASSCODE</code> environment variable.</p>
        </div>
      </div>
    </div>
  );
}