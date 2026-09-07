"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);

    setTimeout(() => {
      const mockUser = {
        id: "00000000-0000-0000-0000-000000000000",
        email: email,
        name: name || email.split("@")[0],
        created_at: new Date().toISOString(),
      };
      localStorage.setItem("mock_user_session", JSON.stringify(mockUser));
      
      const returnTo = sessionStorage.getItem("returnTo") || "/";
      router.push(returnTo);
      setLoading(false);
    }, 1000);
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
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
      // Note: Session URL se code automatically exchange ho jayega callback page par
      if (error) throw error;
    } catch (err) {
      console.error("Google login error:", err);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfbf5] flex flex-col items-center justify-center p-6 font-sans">
      <button
        onClick={() => router.push("/")}
        className="absolute top-6 left-6 text-xs text-gray-500 hover:text-black font-semibold uppercase tracking-wider font-mono flex items-center gap-1"
      >
        ← Home
      </button>

      <div className="w-full max-w-md bg-white border border-gray-100 p-8 md:p-10 rounded-sm shadow-halo animate-slide-up">
        <div className="text-center mb-8">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em] font-mono block mb-2">
            ARKADO
          </span>
          <h1 className="text-3xl font-light text-black tracking-tight font-sans">
            Log in
          </h1>
          <p className="text-xs text-gray-500 mt-2 font-mono">
            Sign in to access your study materials
          </p>
        </div>

        {/* Google Sign-In Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full h-11 flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-sm hover:bg-gray-50 hover:border-gray-300 transition-all text-xs font-bold text-gray-700 font-mono disabled:opacity-50 cursor-pointer"
        >
          {googleLoading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              Connecting...
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
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {/* Email Login Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5 font-mono">
              Your Name (Optional)
            </label>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-4 text-xs bg-gray-50/50 border border-gray-200 rounded-sm focus:bg-white focus:border-black outline-none transition-colors"
            />
          </div>

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
              className="w-full h-11 px-4 text-xs bg-gray-50/50 border border-gray-200 rounded-sm focus:bg-white focus:border-black outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="button-primary-pill w-full h-11 text-xs uppercase tracking-wider font-bold mt-4 shadow-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Logging in...
              </>
            ) : (
              "Continue with Email"
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-[10px] text-gray-400 font-mono">
            Secure login. No password required.
          </p>
        </div>
      </div>
    </div>
  );
}
