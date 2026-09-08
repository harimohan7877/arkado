"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        const returnTo = sessionStorage.getItem("returnTo") || "/dashboard";
        router.replace(returnTo);
      }
    });
  }, [router]);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setErrorMessage(null);
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
      console.error("Google login error:", err);
      const msg = err instanceof Error ? err.message : "Google sign in failed";
      setErrorMessage(msg);
      setGoogleLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      setStep("otp");
      setSuccessMessage(`Login code has been sent to ${email}. Please check your inbox or spam folder.`);
    } catch (err: unknown) {
      console.error("OTP send error:", err);
      const msg = err instanceof Error ? err.message : "Failed to send code. Please try again.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !email) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: "email",
      });

      if (error) throw error;

      if (data?.session) {
        document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=604800; SameSite=Lax; secure`;
        const returnTo = sessionStorage.getItem("returnTo") || "/dashboard";
        sessionStorage.removeItem("returnTo");
        window.location.replace(returnTo);
      }
    } catch (err: unknown) {
      console.error("OTP verify error:", err);
      const msg = err instanceof Error ? err.message : "Invalid code. Please check and enter the 6-digit code again.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfbf5] flex flex-col items-center justify-center p-6 font-sans relative">
      <button
        onClick={() => router.push("/")}
        className="absolute top-6 left-6 text-xs text-gray-500 hover:text-black font-semibold uppercase tracking-wider font-mono flex items-center gap-1 cursor-pointer"
      >
        ← Home
      </button>

      <div className="w-full max-w-md bg-white border border-gray-100 p-8 md:p-10 rounded-xl shadow-halo animate-slide-up">
        <div className="text-center mb-8">
          <span className="text-xs text-amber-600 font-bold uppercase tracking-[0.2em] font-mono block mb-2">
            ARKADO
          </span>
          <h1 className="text-3xl font-light text-black tracking-tight font-sans">
            {step === "email" ? "Log in" : "Enter Code"}
          </h1>
          <p className="text-xs text-gray-500 mt-2 font-mono">
            {step === "email"
              ? "Sign in to access your study materials & dashboard"
              : `6-digit verification code sent to ${email}`}
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium leading-relaxed">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 font-medium leading-relaxed">
            ✉️ {successMessage}
          </div>
        )}

        {step === "email" ? (
          <>
            {/* Google Sign-In Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full h-11 flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all text-xs font-bold text-gray-700 font-mono disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {googleLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  Connecting to Google...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">or sign in with email</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Email Form */}
            <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5 font-mono">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="example@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 px-4 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-amber-600 outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-stone-900 hover:bg-black text-white text-xs uppercase tracking-wider font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  "Continue with Email"
                )}
              </button>
            </form>
          </>
        ) : (
          /* Step 2: OTP Verification */
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5 font-mono">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                autoFocus
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="w-full h-12 text-center tracking-[0.5em] text-lg font-mono font-bold bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-amber-600 outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white text-xs uppercase tracking-wider font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Verifying Code...
                </>
              ) : (
                "Verify & Continue →"
              )}
            </button>

            <div className="flex items-center justify-between text-xs text-gray-500 font-mono mt-2">
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="hover:text-black underline cursor-pointer"
              >
                ← Change Email
              </button>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading}
                className="hover:text-amber-700 underline cursor-pointer"
              >
                Resend Code
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-[10px] text-gray-400 font-mono">
            Secure passwordless login • Powered by Supabase
          </p>
        </div>
      </div>
    </div>
  );
}
