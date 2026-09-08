"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const [status, setStatus] = useState("Completing sign in...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    function saveSessionAndRedirect(session: { access_token?: string; user?: unknown }) {
      if (session.access_token) {
        document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=604800; SameSite=Lax; secure`;
      }
      if (session.user) {
        localStorage.setItem("mock_user_session", JSON.stringify(session.user));
      }
      const returnTo = sessionStorage.getItem("returnTo") || "/dashboard";
      sessionStorage.removeItem("returnTo");
      window.location.replace(returnTo);
    }

    async function handleCallback() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const errorParam = params.get("error_description") || params.get("error");

        if (errorParam) {
          setError(errorParam);
          return;
        }

        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error("Code exchange error:", exchangeError);
            if (!cancelled) setError(exchangeError.message);
            return;
          }

          if (!cancelled && data?.session) {
            saveSessionAndRedirect(data.session);
            return;
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!cancelled && session?.user) {
          saveSessionAndRedirect(session);
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!cancelled && user) {
          saveSessionAndRedirect({ user });
          return;
        }

        // If no code and no active session found
        if (!cancelled) {
          setStatus("No active session found. Redirecting to login...");
          setTimeout(() => window.location.replace("/auth"), 2000);
        }
      } catch (err: unknown) {
        console.error("Auth callback exception:", err);
        const msg = err instanceof Error ? err.message : "Authentication failed. Please try again.";
        if (!cancelled) setError(msg);
      }
    }

    handleCallback();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled || !session?.user) return;
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        saveSessionAndRedirect(session);
      }
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#fbfbf5] flex items-center justify-center p-6 font-sans">
      <div className="text-center max-w-sm w-full bg-white p-8 rounded-xl border border-gray-100 shadow-halo">
        {error ? (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2 font-mono">Sign-in Failed</h2>
            <p className="text-xs text-red-600 font-mono mb-6 leading-relaxed">{error}</p>
            <a
              href="/auth"
              className="inline-block px-5 py-2.5 bg-stone-900 text-white rounded-lg text-xs font-mono font-bold hover:bg-black transition"
            >
              ← Back to Login
            </a>
          </>
        ) : (
          <>
            <div className="w-8 h-8 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-base font-bold text-gray-900 font-mono">{status}</h2>
            <p className="text-xs text-gray-400 mt-2 font-mono">Connecting your Arkado account...</p>
          </>
        )}
      </div>
    </div>
  );
}
