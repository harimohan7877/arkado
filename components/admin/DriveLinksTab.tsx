"use client";

import { useEffect, useMemo, useState } from "react";
import { Course } from "@/lib/store-types";

/**
 * Admin → Drive Links tab.
 * Kit-level readiness report: original Drive link, demo PDF link, HTML MCQ demo.
 * - "Missing" = empty OR the default https://drive.google.com placeholder.
 * - "Ready" = original drive link is filled (computed live, nothing stored).
 * - Inline editing: paste the original link right here → kit moves to Ready instantly.
 */

const PLACEHOLDER_LINKS = new Set([
  "https://drive.google.com",
  "https://drive.google.com/",
  "http://drive.google.com",
  "http://drive.google.com/",
]);

const isFilled = (v?: string | null) => {
  if (!v) return false;
  const t = v.trim();
  return t !== "" && !PLACEHOLDER_LINKS.has(t);
};

interface DriveLinksTabProps {
  getAuthHeaders: () => Record<string, string>;
}

interface ExamInfo {
  id: string;
  name: string;
}

type Filter = "all" | "ready" | "pending";

function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      title={label}
      className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${
        ok
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-red-50 text-red-600 border-red-200"
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`} />
      {ok ? "OK" : "Missing"}
    </span>
  );
}

export default function DriveLinksTab({ getAuthHeaders }: DriveLinksTabProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [exams, setExams] = useState<ExamInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [coursesRes, examsRes] = await Promise.all([
        fetch(`/api/admin/courses?t=${Date.now()}`, { headers: getAuthHeaders(), cache: "no-store" }),
        fetch(`/api/admin/exams?t=${Date.now()}`, { headers: getAuthHeaders(), cache: "no-store" }),
      ]);
      if (coursesRes.ok) {
        const cData = await coursesRes.json();
        setCourses(Array.isArray(cData) ? cData : []);
      }
      if (examsRes.ok) {
        const eData = await examsRes.json();
        setExams(
          (Array.isArray(eData) ? eData : []).map((e: { id: string | number; name?: string }) => ({
            id: String(e.id),
            name: e.name || String(e.id),
          }))
        );
      }
    } catch {
      setMessage({ type: "error", text: "Data load karne me error aaya." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const examName = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of exams) m.set(e.id, e.name);
    return m;
  }, [exams]);

  const rows = useMemo(
    () =>
      courses.map((c) => {
        const origOk = isFilled(c.drive_url);
        const demoOk = isFilled(c.sample_pdf_url);
        const htmlOk = !!c.demo_html_mock_enabled && isFilled(c.demo_html_mock_url);
        return { course: c, origOk, demoOk, htmlOk, ready: origOk };
      }),
    [courses]
  );

  const summary = useMemo(() => {
    const total = rows.length;
    const ready = rows.filter((r) => r.ready).length;
    const missingOrig = total - ready;
    const missingDemo = rows.filter((r) => !r.demoOk || !r.htmlOk).length;
    return { total, ready, missingOrig, missingDemo };
  }, [rows]);

  const groups = useMemo(() => {
    const map = new Map<string, { examId: string; examLabel: string; items: typeof rows }>();
    for (const r of rows) {
      if (filter === "ready" && !r.ready) continue;
      if (filter === "pending" && r.ready) continue;
      const examId = String(r.course.exam_id || "unknown");
      let g = map.get(examId);
      if (!g) {
        g = { examId, examLabel: examName.get(examId) || examId, items: [] };
        map.set(examId, g);
      }
      g.items.push(r);
    }
    return [...map.values()].sort((a, b) => a.examLabel.localeCompare(b.examLabel));
  }, [rows, examName, filter]);

  const startEdit = (course: Course) => {
    setEditingId(course.id);
    setEditValue(isFilled(course.drive_url) ? course.drive_url : "");
    setMessage(null);
  };

  const saveLink = async (courseId: string) => {
    const v = editValue.trim();
    if (!isFilled(v)) {
      setMessage({ type: "error", text: "Sahi Google Drive link paste karo." });
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(`/api/admin/courses/${courseId}`, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ drive_url: v }),
      });
      if (!res.ok) throw new Error("save failed");
      setMessage({ type: "success", text: "Drive link save ho gaya — kit ab Ready hai." });
      setEditingId(null);
      setEditValue("");
      await fetchData();
    } catch {
      setMessage({ type: "error", text: "Save nahi ho paya, dobara try karo." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-black text-stone-900">Drive Links Report</h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Har kit ka original Drive link, demo PDF link aur HTML MCQ demo — khali wale turant dikhenge. Original link dalte hi kit Ready me aa jayega.
        </p>
      </div>

      {message && (
        <div
          className={`text-xs font-bold px-3.5 py-2.5 rounded-xl border ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-red-50 text-red-600 border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-stone-200 rounded-2xl p-4">
          <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wide">Total Kits</p>
          <p className="text-2xl font-black text-stone-900 mt-1">{loading ? "…" : summary.total}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Ready</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            {loading ? "…" : `${summary.ready}/${summary.total}`}
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-[11px] font-bold text-red-600 uppercase tracking-wide">Original Missing</p>
          <p className="text-2xl font-black text-red-600 mt-1">{loading ? "…" : summary.missingOrig}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">Demo / HTML Missing</p>
          <p className="text-2xl font-black text-amber-700 mt-1">{loading ? "…" : summary.missingDemo}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        {(
          [
            { id: "all", label: `All (${summary.total})` },
            { id: "ready", label: `Ready (${summary.ready})` },
            { id: "pending", label: `Pending (${summary.missingOrig})` },
          ] as { id: Filter; label: string }[]
        ).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer border ${
              filter === f.id
                ? "bg-stone-900 text-white border-stone-900"
                : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Exam groups */}
      {loading ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center text-sm text-stone-500">
          Loading…
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center text-sm text-stone-500">
          {filter === "all" ? "Koi kit nahi mila." : filter === "ready" ? "Abhi koi kit Ready nahi hai." : "Sab kits Ready hain — badhai ho!"}
        </div>
      ) : (
        groups.map((g) => {
          const readyCount = g.items.filter((i) => i.ready).length;
          return (
            <div key={g.examId} className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                <p className="text-sm font-black text-stone-900">{g.examLabel}</p>
                <span
                  className={`text-[11px] font-black px-2.5 py-1 rounded-full ${
                    readyCount === g.items.length
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {readyCount}/{g.items.length} ready
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-stone-400 uppercase text-[10px] tracking-wide border-b border-stone-100">
                      <th className="px-4 py-2.5 font-bold">Kit</th>
                      <th className="px-3 py-2.5 font-bold">Original Drive</th>
                      <th className="px-3 py-2.5 font-bold">Demo PDF</th>
                      <th className="px-3 py-2.5 font-bold">HTML MCQ</th>
                      <th className="px-3 py-2.5 font-bold">Status</th>
                      <th className="px-3 py-2.5 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map(({ course: c, origOk, demoOk, htmlOk, ready }) => (
                      <tr key={c.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/60">
                        <td className="px-4 py-3 font-bold text-stone-800 max-w-[220px]">
                          <span className="line-clamp-2">{c.title}</span>
                        </td>
                        <td className="px-3 py-3">
                          {editingId === c.id ? (
                            <div className="flex items-center gap-1.5 min-w-[220px]">
                              <input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                placeholder="https://drive.google.com/…"
                                className="flex-1 min-w-0 text-xs border border-stone-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-600"
                                autoFocus
                              />
                              <button
                                onClick={() => saveLink(c.id)}
                                disabled={saving}
                                className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-black transition cursor-pointer disabled:opacity-50"
                              >
                                {saving ? "…" : "Save"}
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-2 py-1.5 rounded-lg text-stone-400 hover:text-stone-600 text-xs font-bold cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          ) : origOk ? (
                            <a
                              href={c.drive_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-700 hover:underline font-bold text-xs"
                            >
                              Open link ↗
                            </a>
                          ) : (
                            <button
                              onClick={() => startEdit(c)}
                              className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-700 text-white text-xs font-black transition cursor-pointer"
                            >
                              + Add link
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <StatusDot ok={demoOk} label="Demo PDF link" />
                        </td>
                        <td className="px-3 py-3">
                          <StatusDot ok={htmlOk} label="HTML MCQ demo" />
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`text-[11px] font-black px-2.5 py-1 rounded-full ${
                              ready ? "bg-emerald-600 text-white" : "bg-stone-200 text-stone-600"
                            }`}
                          >
                            {ready ? "READY" : "PENDING"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          {origOk && (
                            <button
                              onClick={() => startEdit(c)}
                              className="text-[11px] font-bold text-stone-400 hover:text-amber-700 underline cursor-pointer"
                            >
                              Change
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
