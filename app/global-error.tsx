"use client";

import React, { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error Boundary caught error]:", error);
  }, [error]);

  return (
    <html lang="hi">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif", backgroundColor: "#fafaf9", color: "#1c1917" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ maxWidth: "450px", width: "100%", textAlign: "center", background: "#ffffff", border: "1px solid #e7e5e4", borderRadius: "16px", padding: "32px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ width: "56px", height: "56px", background: "#fef3c7", color: "#b45309", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: "24px" }}>
              ⚠️
            </div>
            <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: "0 0 8px" }}>
              साइट लोड करने में त्रुटि हुई
            </h1>
            <p style={{ fontSize: "14px", color: "#57534e", margin: "0 0 24px", lineHeight: "1.5" }}>
              सर्वर या नेटवर्क में कोई अस्थायी समस्या आई है। कृपया पेज को दोबारा लोड करें।
            </p>
            <button
              onClick={() => reset()}
              style={{
                padding: "10px 24px",
                backgroundColor: "#d97706",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
              }}
            >
              पुनः प्रयास करें (Reload)
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
