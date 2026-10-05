"use client";

import { useState } from "react";

interface CategoryExportButtonProps {
  getAuthHeaders: () => Record<string, string>;
}

/**
 * Standalone "Export categories" button for the admin header.
 * Fetches the full category tree + kits itself (admin cookie auth),
 * flattens to an Excel-compatible CSV (UTF-8 BOM for Hindi text)
 * and triggers a download. Kept separate from CategoriesTab so the
 * 2900-line tab file never needs to be touched for this feature.
 */
export default function CategoryExportButton({ getAuthHeaders }: CategoryExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const headers = getAuthHeaders();
      const [catsRes, coursesRes] = await Promise.all([
        fetch(`/api/admin/categories?t=${Date.now()}`, { headers, cache: "no-store" }),
        fetch(`/api/admin/courses?t=${Date.now()}`, { headers, cache: "no-store" }),
      ]);
      if (!catsRes.ok || !coursesRes.ok) throw new Error("load failed");
      const categories = await catsRes.json();
      const courses = await coursesRes.json();
      if (!Array.isArray(categories) || categories.length === 0) {
        alert("डाउनलोड के लिए कोई श्रेणी मौजूद नहीं है।");
        return;
      }

      const esc = (v: any): string => {
        const s = v === null || v === undefined ? "" : String(v);
        return `"${s.replace(/"/g, '""')}"`;
      };
      const status = (on: any) => (on ? "ON" : "OFF");
      const kitsForExam = (examId: string) =>
        (Array.isArray(courses) ? courses : []).filter(
          (c: any) => c.exam_id === examId || c.id === examId || c.id === `exam-${examId}`
        );

      const csvHeaders = [
        "Category",
        "Category Status",
        "Board",
        "Board Status",
        "Exam",
        "Exam Status",
        "Exam Priority",
        "Kit / Book Title",
        "Kit Status",
        "Price (INR)",
        "MRP (INR)",
        "Subjects",
      ];

      const rows: string[] = [];
      for (const cat of categories) {
        const boards = Array.isArray(cat.boards) ? cat.boards : [];
        if (boards.length === 0) {
          rows.push(
            [cat.name, status(cat.is_active), "", "", "", "", "", "", "", "", "", ""].map(esc).join(",")
          );
          continue;
        }
        for (const board of boards) {
          const exams = Array.isArray(board.exams) ? board.exams : [];
          if (exams.length === 0) {
            rows.push(
              [
                cat.name,
                status(cat.is_active),
                board.short_name || board.name,
                status(board.is_active),
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
              ].map(esc).join(",")
            );
            continue;
          }
          for (const exam of exams) {
            const kits = kitsForExam(exam.id);
            const base = [
              cat.name,
              status(cat.is_active),
              board.short_name || board.name,
              status(board.is_active),
              exam.name,
              status(exam.is_active),
              exam.priority ?? "",
            ];
            if (kits.length === 0) {
              rows.push([...base, "", "", "", "", ""].map(esc).join(","));
            } else {
              for (const kit of kits) {
                rows.push(
                  [
                    ...base,
                    kit.title || "",
                    status(kit.is_active),
                    kit.price ?? "",
                    kit.original_price ?? "",
                    Array.isArray(kit.subjects) ? kit.subjects.join(" | ") : "",
                  ].map(esc).join(",")
                );
              }
            }
          }
        }
      }

      const csvContent = "\uFEFF" + [csvHeaders.map(esc).join(","), ...rows].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Arkado_categories_export_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      alert("एक्सपोर्ट में समस्या आई। दोबारा कोशिश करें।");
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={exporting}
      className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-60"
      title="सारी श्रेणियाँ, बोर्ड, परीक्षाएं, किट्स व उनकी ON/OFF स्थिति Excel (CSV) में डाउनलोड करें"
    >
      <span>📥</span>
      <span>{exporting ? "तैयार हो रहा..." : "एक्सपोर्ट"}</span>
    </button>
  );
}
