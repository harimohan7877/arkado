"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!passcode) return;
    setLoading(true);
    setError("");

    try {
      // Test passcode by making a request to the settings endpoint
      const res = await fetch("/api/admin/settings", {
        headers: {
          Authorization: passcode,
        },
      });

      if (res.ok) {
        // Set verification cookie
        document.cookie = `arkado-admin-verified=true; path=/; max-age=86400; SameSite=Strict`;
        document.cookie = `sarkari-saathi-admin-verified=true; path=/; max-age=86400; SameSite=Strict`;
        // Save to session storage for API requests
        sessionStorage.setItem("arkado-admin-verified", passcode);
        sessionStorage.setItem("sarkari-saathi-admin-verified", passcode);
        
        router.push("/secret-admin-portal");
      } else {
        setError("गलत एडमिन पासकोड! दोबारा प्रयास करें।");
      }
    } catch (err) {
      console.error(err);
      setError("नेटवर्क एरर। दोबारा प्रयास करें।");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4 text-[#e8e8e8]">
      {/* Dynamic background glow */}
      <div className="absolute w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl -top-12 -left-12 pointer-events-none" />
      <div className="absolute w-96 h-96 rounded-full bg-blue-500/10 blur-3xl -bottom-12 -right-12 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <span className="text-5xl inline-block mb-3 animate-pulse">🔒</span>
            <h1 className="text-2xl font-bold text-white">Arkado</h1>
            <p className="text-gray-400 text-sm mt-1">Admin Portal Access Control</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Admin Passcode (एडमिन पासकोड)
              </label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 bg-[#0f1117] border border-[#2a2d3a] rounded-xl px-4 text-white text-lg tracking-widest text-center focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/25 transition-all outline-none"
                required
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-950/50 border border-red-500/30 text-red-400 text-sm p-3.5 rounded-xl text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-bold rounded-xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-950/50"
            >
              {loading ? "सत्यापित हो रहा है..." : "प्रवेश करें (Verify) 🔓"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6">
            यह एक सुरक्षित प्रशासनिक पोर्टल है। अनधिकृत प्रवेश प्रतिबंधित है।
          </p>
        </div>
      </div>
    </div>
  );
}
