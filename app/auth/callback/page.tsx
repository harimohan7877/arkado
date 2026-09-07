"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const [status, setStatus] = useState("Completing sign in...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error("Code exchange error:", exchangeError);
            setError(exchangeError.message);
          }

          if (!cancelled && data?.session?.user) {
            localStorage.setItem("mock_user_session", JSON.stringify(data.session.user));
            const returnTo = sessionStorage.getItem("returnTo") || "/";
            sessionStorage.removeItem("returnTo");
            window.location.replace(returnTo);
            return;
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!cancelled && session?.user) {
          localStorage.setItem("mock_user_session", JSON.stringify(session.user));
          const returnTo = sessionStorage.getItem("returnTo") || "/";
          sessionStorage.removeItem("returnTo");
          window.location.replace(returnTo);
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!cancelled && user) {
          localStorage.setItem("mock_user_session", JSON.stringify(user));
          const returnTo = sessionStorage.getItem("returnTo") || "/";
          sessionStorage.removeItem("returnTo");
          window.location.replace(returnTo);
          return;
        }
      } catch (err) {
        console.error("Auth callback exception:", err);
        if (!cancelled) setError("Authentication failed. Please try again.");
      }

      if (!cancelled) {
        setStatus("Redirecting to login...");
        setTimeout(() => window.location.replace("/auth"), 1500);
      }
    }

    handleCallback();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled || event !== "SIGNED_IN" || !session?.user) return;
      localStorage.setItem("mock_user_session", JSON.stringify(session.user));
      const returnTo = sessionStorage.getItem("returnTo") || "/";
      sessionStorage.removeItem("returnTo");
      window.location.replace(returnTo);
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#fbfbf5] flex items-center justify-center p-6 font-sans">
      <div className="text-center">
        {error ? (
          <>
            <div className="text-4xl mb-4">❌</div>
            <p className="text-sm text-red-600 font-mono mb-4">{error}</p>
            <a href="/auth" className="text-xs text-stone-600 hover:underline font-mono">
              ← Back to login
            </a>
          </>
        ) : (
          <>
            <div className="w-8 h-8 border-2 border-black/20 border-t-black rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-600 font-mono">{status}</p>
          </>
        )}
      </div>
    </div>
  );
}
