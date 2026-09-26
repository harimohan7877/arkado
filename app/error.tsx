"use client";

import React, { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App Error Boundary caught error]:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center bg-stone-50 border border-stone-200 rounded-2xl p-8 shadow-sm">
        <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-stone-900 mb-2">
          कुछ तकनीकी गड़बड़ी हुई है
        </h2>
        <p className="text-sm text-stone-600 mb-6">
          पेज लोड करने में समस्या आई है। कृपया पुनः प्रयास करें या होमपेज पर वापस जाएं।
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
          >
            पुनः प्रयास करें (Try Again)
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 text-sm font-medium rounded-xl transition-all"
          >
            होमपेज (Home)
          </Link>
        </div>

        {process.env.NODE_ENV !== "production" && error?.message && (
          <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-lg text-left text-xs text-red-700 font-mono overflow-auto max-h-32">
            <strong>Dev Info:</strong> {error.message}
          </div>
        )}
      </div>
    </div>
  );
}
