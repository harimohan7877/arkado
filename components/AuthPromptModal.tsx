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
    message_limit: isLoggedIn ? "अनलिमिटेड एक्सेस" : "5 सवाल हो गए!",
    study_material: isLoggedIn ? "प्रीमियम अनलॉक करें" : "Study Material देखें",
    save_exam: isLoggedIn ? "प्रीमियम अनलॉक करें" : "Exam Save करें",
  };

  const subtitles: Record<string, string> = {
    message_limit: isLoggedIn
      ? "सभी स्टडी मटेरियल व अनलिमिटेड चैट अनलॉक करें"
      : "Login करें और 5 और FREE सवाल पाएं",
    study_material: isLoggedIn
      ? "सिलेबस और PYQ देखने के लिए प्रीमियम अनलॉक करें"
      : "Login करें और पूरा Study Material पाएं",
    save_exam: isLoggedIn
      ? "भर्तियों को सेव करने के लिए प्रीमियम अनलॉक करें"
      : "Login करें और Exams Save करें",
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
            <h2 className="text-base font-bold font-devanagari">{titles[reason]}</h2>
            <p className="text-xs text-slate-300 font-devanagari mt-0.5">{subtitles[reason]}</p>
          </div>
        </div>

        <div className="p-5">
          <ul className="space-y-2 mb-5">
            {[
              "अनलिमिटेड AI चैट",
              "पूरा विस्तृत Syllabus (पाठ्यक्रम)",
              "Previous Year Papers (PYQs)",
              "सभी भर्तियों के सटीक दिशा-निर्देश",
              "भर्तियों को डैशबोर्ड में सेव करें",
            ].map((item, i) => (
              <li
                key={i}
                className="flex items-center gap-2 text-sm text-slate-700 font-devanagari"
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
              className="btn-outline w-full h-11 mb-2 font-devanagari"
            >
              Login / Sign Up करें
            </button>
          )}

          <button
            onClick={handlePayment}
            className="btn-primary w-full h-11 font-devanagari"
          >
            ₹30 में Premium एक्टिवेट करें
          </button>

          <button
            onClick={onClose}
            className="w-full text-center text-sm text-slate-400 hover:text-slate-600 cursor-pointer mt-3 font-devanagari"
          >
            बाद में
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
