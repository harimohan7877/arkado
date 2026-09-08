"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  const router = useRouter();

  // Mode: "login" | "signup"
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // If already logged in, redirect immediately to dashboard
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        const returnTo = sessionStorage.getItem("returnTo") || "/dashboard";
        router.replace(returnTo);
      }
    });
  }, [router]);

  // Helper to store access token and redirect
  const completeAuth = (session: { access_token?: string }) => {
    if (session?.access_token) {
      document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=604800; SameSite=Lax; secure`;
    }
    const returnTo = sessionStorage.getItem("returnTo") || "/dashboard";
    sessionStorage.removeItem("returnTo");
    window.location.replace(returnTo);
  };

  // 1. Google OAuth
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      console.error("Google sign-in error:", err);
      const msg = err instanceof Error ? err.message : "Google sign in failed";
      setErrorMessage(msg);
      setGoogleLoading(false);
    }
  };

  // 2. Email + Password Login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("ईमेल या पासवर्ड गलत है। यदि आपने Google से अकाउंट बनाया है तो ऊपर Google बटन दबाएँ।");
        } else if (error.message.includes("Email not confirmed")) {
          throw new Error("कृपया अपने ईमेल पर आए कन्फर्मेशन लिंक पर क्लिक करें या Google से लॉगिन करें।");
        }
        throw error;
      }

      if (data?.session) {
        completeAuth(data.session);
      }
    } catch (err: unknown) {
      console.error("Password login error:", err);
      const msg = err instanceof Error ? err.message : "लॉगिन असफल रहा। कृपया पुनः प्रयास करें।";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // 3. Email + Password Sign Up
  const handlePasswordSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (password.length < 6) {
      setErrorMessage("पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: name.trim() || email.split("@")[0],
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          throw new Error("यह ईमेल पहले से रजिस्टर्ड है। कृपया 'Log In' टैब से लॉगिन करें।");
        }
        throw error;
      }

      if (data?.session) {
        completeAuth(data.session);
      } else {
        setSuccessMessage("खाता सफलतापूर्वक बन गया! कृपया लॉगिन करें।");
        setMode("login");
      }
    } catch (err: unknown) {
      console.error("Signup error:", err);
      const msg = err instanceof Error ? err.message : "अकाउंट बनाने में समस्या आई। पुनः प्रयास करें।";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcf9] flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Top Header Navigation */}
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between py-2">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 font-semibold uppercase tracking-wider font-mono transition"
        >
          <span>←</span>
          <span>होमपेज (Home)</span>
        </Link>
        <span className="text-[11px] font-mono text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
          🔒 सुरक्षित छात्र पोर्टल
        </span>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md mx-auto my-6 bg-white border border-stone-200/80 rounded-2xl shadow-xl overflow-hidden animate-slide-up">
        {/* Brand Banner */}
        <div className="bg-gradient-to-b from-amber-50/70 to-white px-8 pt-8 pb-6 text-center border-b border-stone-100">
          <Link href="/" className="inline-block relative h-10 w-36 mb-3">
            <Image
              src="/logo.svg"
              alt="Arkado"
              width={150}
              height={45}
              priority
              unoptimized
              className="object-contain w-full h-full"
            />
          </Link>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">
            {mode === "login" ? "अपने अकाउंट में लॉगिन करें" : "नया Arkado अकाउंट बनाएँ"}
          </h1>
          <p className="text-xs text-stone-500 mt-1.5 font-medium">
            अपने खरीदे गए नोट्स, सिलेबस व PDF डाउनलोड्स एक्सेस करें
          </p>
        </div>

        {/* Tab Switcher (Login vs Sign Up) */}
        <div className="flex border-b border-stone-200 bg-stone-50/60 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mode === "login"
                ? "bg-white text-stone-900 shadow-sm border border-stone-200/60"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            लॉग इन (Log In)
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mode === "signup"
                ? "bg-white text-stone-900 shadow-sm border border-stone-200/60"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            नया खाता (Sign Up)
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {/* Alerts */}
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200/80 rounded-xl text-xs text-red-700 font-medium flex items-start gap-2">
              <span className="text-sm">⚠️</span>
              <span className="flex-1 leading-relaxed">{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs text-emerald-700 font-medium flex items-start gap-2">
              <span className="text-sm">✅</span>
              <span className="flex-1 leading-relaxed">{successMessage}</span>
            </div>
          )}

          {/* 1-Click Google Sign-In */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full h-12 flex items-center justify-center gap-3 bg-white border border-stone-300 rounded-xl hover:bg-stone-50 hover:border-stone-400 transition-all text-xs font-bold text-stone-700 font-mono disabled:opacity-50 cursor-pointer shadow-sm active:scale-[0.99]"
          >
            {googleLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
                <span>Google से कनेक्ट हो रहा है...</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Google से लॉगिन करें (Continue with Google)</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-stone-200" />
            <span className="text-[10px] text-stone-400 font-mono uppercase tracking-wider">
              या ईमेल व पासवर्ड से
            </span>
            <div className="flex-1 h-px bg-stone-200" />
          </div>

          {/* Mode 1: Log In Form */}
          {mode === "login" && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1.5 font-mono">
                  ईमेल एड्रेस (Email)
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 px-3.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-amber-600 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1.5 font-mono">
                  पासवर्ड (Password)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 px-3.5 pr-10 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-amber-600 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-xs text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    {showPassword ? "छिपाएँ" : "देखें"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-stone-900 hover:bg-black text-white text-xs uppercase tracking-wider font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>लॉगिन हो रहा है...</span>
                  </>
                ) : (
                  <span>लॉग इन करें (Log In) →</span>
                )}
              </button>
            </form>
          )}

          {/* Mode 2: Sign Up Form */}
          {mode === "signup" && (
            <form onSubmit={handlePasswordSignUp} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1.5 font-mono">
                  आपका नाम (Full Name)
                </label>
                <input
                  type="text"
                  required
                  placeholder="उदा. राहुल शर्मा"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 px-3.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-amber-600 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1.5 font-mono">
                  ईमेल एड्रेस (Email)
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 px-3.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-amber-600 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1.5 font-mono">
                  पासवर्ड बनाएँ (Password - कम से कम 6 अक्षर)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="कम से कम 6 अक्षर"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 px-3.5 pr-10 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-amber-600 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-xs text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    {showPassword ? "छिपाएँ" : "देखें"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white text-xs uppercase tracking-wider font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>खाता बन रहा है...</span>
                  </>
                ) : (
                  <span>नया खाता बनाएँ (Sign Up) →</span>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Card Footer */}
        <div className="bg-stone-50/80 p-4 border-t border-stone-100 text-center">
          <p className="text-[11px] text-stone-500 font-medium">
            मदद चाहिए? WhatsApp सहायता:{" "}
            <a
              href="https://wa.me/917852004401"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 font-bold hover:underline"
            >
              7852004401
            </a>
          </p>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="max-w-md w-full mx-auto grid grid-cols-3 gap-2 text-center text-stone-500 font-medium text-[10px] py-4">
        <div className="p-2 bg-white rounded-lg border border-stone-200/60 shadow-xs">
          <p className="text-sm mb-1">⚡</p>
          <p>तुरंत PDF एक्सेस</p>
        </div>
        <div className="p-2 bg-white rounded-lg border border-stone-200/60 shadow-xs">
          <p className="text-sm mb-1">📱</p>
          <p>सभी फोन/लैपटॉप पर</p>
        </div>
        <div className="p-2 bg-white rounded-lg border border-stone-200/60 shadow-xs">
          <p className="text-sm mb-1">🔒</p>
          <p>100% सुरक्षित डेटा</p>
        </div>
      </div>
    </div>
  );
}
