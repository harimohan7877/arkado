"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { SparklesIcon, CheckIcon, CloseIcon } from "@/components/icons";

interface AuthPromptModalProps {
  onClose: () => void;
  reason: "message_limit" | "study_material" | "save_exam";
}

export default function AuthPromptModal({ onClose, reason }: AuthPromptModalProps) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setIsLoggedIn(true);
    });
  }, []);

  const titles: Record<string, string> = {
    message_limit: isLoggedIn ? "Unlimited Access" : "Daily Limit Reached!",
    study_material: isLoggedIn ? "Unlock Premium" : "View Study Material",
    save_exam: isLoggedIn ? "Unlock Premium" : "Save Exam",
  };

  const subtitles: Record<string, string> = {
    message_limit: isLoggedIn
      ? "Unlock all study materials & unlimited AI queries"
      : "Log in to get more free questions",
    study_material: isLoggedIn
      ? "Unlock premium to access complete syllabus & PYQs"
      : "Log in to view full study materials",
    save_exam: isLoggedIn
      ? "Unlock premium to save exams to your dashboard"
      : "Log in to bookmark & save exams",
  };

  function handleLogin() {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("returnTo", window.location.pathname);
    }
    router.push("/auth");
  }

  function handlePayment() {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("returnTo", window.location.pathname);
    }
    router.push("/payment");
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm anim-fade-in-up"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden anim-fade-in-up border border-slate-200">
        <div className="bg-slate-900 px-5 py-4 text-white flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-700 flex items-center justify-center shrink-0">
            <SparklesIcon size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold">{titles[reason]}</h2>
            <p className="text-xs text-slate-300 mt-0.5">{subtitles[reason]}</p>
          </div>
        </div>

        <div className="p-5">
          <ul className="space-y-2 mb-5">
            {[
              "Unlimited AI Queries",
              "Comprehensive Syllabus Coverage",
              "Previous Year Papers (PYQs)",
              "Official Exam & Notification Alerts",
              "Save & Track Exams in Dashboard",
            ].map((item, i) => (
              <li
                key={i}
                className="flex items-center gap-2 text-sm text-slate-700"
              >
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckIcon size={12} />
                </span>
                {item}
              </li>
            ))}
          </ul>

          {!isLoggedIn && (
            <button
              onClick={handleLogin}
              className="btn-outline w-full h-11 mb-2 font-bold text-xs uppercase tracking-wider"
            >
              Log In / Sign Up
            </button>
          )}

          <button
            onClick={handlePayment}
            className="btn-primary w-full h-11 font-bold text-xs uppercase tracking-wider"
          >
            Activate Premium at ₹30
          </button>

          <button
            onClick={onClose}
            className="w-full text-center text-sm text-slate-400 hover:text-slate-600 cursor-pointer mt-3"
          >
            Maybe Later
          </button>
        </div>

        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          aria-label="Close"
        >
          <CloseIcon size={14} />
        </button>
      </div>
    </div>
  );
}
