"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const [status, setStatus] = useState("Verifying your login...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let redirected = false;

    function saveSessionAndRedirect(session: { access_token?: string; user?: unknown }) {
      if (redirected) return;
      redirected = true;

      try {
        if (session.access_token) {
          document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=604800; SameSite=Lax; secure`;
        }
        if (session.user) {
          localStorage.setItem("mock_user_session", JSON.stringify(session.user));
        }
      } catch (e) {
        console.error("Storage error:", e);
      }

      const returnTo = sessionStorage.getItem("returnTo") || "/dashboard";
      sessionStorage.removeItem("returnTo");
      window.location.replace(returnTo);
    }

    async function handleCallback() {
      try {
        // 1. Check for error in query or hash
        const searchParams = new URLSearchParams(window.location.search);
        const hashStr = window.location.hash ? window.location.hash.substring(1) : "";
        const hashParams = new URLSearchParams(hashStr);

        const errorParam =
          searchParams.get("error_description") ||
          searchParams.get("error") ||
          hashParams.get("error_description") ||
          hashParams.get("error");

        if (errorParam) {
          if (!cancelled) setError(errorParam);
          return;
        }

        // 2. Check for implicit tokens in URL hash (#access_token=...)
        const hashAccessToken = hashParams.get("access_token");
        const hashRefreshToken = hashParams.get("refresh_token") || "";

        if (hashAccessToken) {
          const { data, error: setSessionError } = await supabase.auth.setSession({
            access_token: hashAccessToken,
            refresh_token: hashRefreshToken,
          });

          if (data?.session && !cancelled) {
            saveSessionAndRedirect(data.session);
            return;
          }
          if (setSessionError) {
            console.error("Hash token set error:", setSessionError);
          }
        }

        // 3. Check for PKCE code in search (?code=...)
        const code = searchParams.get("code");
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (data?.session && !cancelled) {
            saveSessionAndRedirect(data.session);
            return;
          }
          if (exchangeError) {
            console.warn("Code exchange warning:", exchangeError.message);
          }
        }

        // 4. Check active Supabase session
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user && !cancelled) {
          saveSessionAndRedirect(sessionData.session);
          return;
        }

        // 5. Check active Supabase user
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user && !cancelled) {
          saveSessionAndRedirect({ user: userData.user });
          return;
        }

        // Wait up to 4 seconds for authStateChange listener before showing error
        setTimeout(() => {
          if (!cancelled && !redirected) {
            setError("Could not complete authentication. Please click below to try signing in again.");
          }
        }, 4000);

      } catch (err: unknown) {
        console.error("Auth callback exception:", err);
        const msg = err instanceof Error ? err.message : "Authentication failed.";
        if (!cancelled) setError(msg);
      }
    }

    handleCallback();

    // Listen to Supabase auth state change events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled || !session?.user) return;
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
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
      <div className="text-center max-w-sm w-full bg-white p-8 rounded-2xl border border-stone-200 shadow-xl">
        {error ? (
          <>
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-lg font-bold text-stone-900 mb-2 font-mono">Sign-in Notice</h2>
            <p className="text-xs text-stone-600 font-sans mb-6 leading-relaxed">{error}</p>
            <a
              href="/auth"
              className="inline-block w-full py-3 bg-stone-900 text-white rounded-xl text-xs font-mono font-bold hover:bg-black transition shadow-sm"
            >
              ← Back to Login
            </a>
          </>
        ) : (
          <>
            <div className="w-10 h-10 border-3 border-amber-600/30 border-t-amber-600 rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-base font-bold text-stone-900 font-mono">{status}</h2>
            <p className="text-xs text-stone-500 mt-2 font-mono">Securing your session...</p>
          </>
        )}
      </div>
    </div>
  );
}
