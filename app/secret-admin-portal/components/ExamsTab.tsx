"use client";

import { useState, useEffect } from "react";

interface ActiveExam {
  id: string;
  name: string;
  short_name?: string;
  logo_url?: string;
  board_name: string;
  category_name: string;
  eligibility?: string;
  exam_pattern?: string;
  is_active: boolean;
}

interface ExamsTabProps {
  getAuthHeaders: () => Record<string, string>;
}

export default function ExamsTab({ getAuthHeaders }: ExamsTabProps) {
  const [activeExams, setActiveExams] = useState<ActiveExam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveExams();
  }, []);

  const loadActiveExams = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/categories?t=${Date.now()}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load");
      const categories = await res.json();

      const list: ActiveExam[] = [];
      if (Array.isArray(categories)) {
        for (const c of categories) {
          for (const b of c.boards || []) {
            for (const e of b.exams || []) {
              // ONLY include exams that are ACTIVE / created!
              if (e.is_active) {
                list.push({
                  id: e.id,
                  name: e.name,
                  short_name: e.short_name || e.name,
                  logo_url: e.logo_url || "",
                  board_name: b.short_name || b.name,
                  category_name: c.name,
                  eligibility: e.eligibility,
                  exam_pattern: e.exam_pattern,
                  is_active: true,
                });
              }
            }
          }
        }
      }
      setActiveExams(list);
    } catch {
      setActiveExams([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-stone-400 bg-white rounded-2xl border border-stone-200">
        <div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-stone-700">परीक्षा फोल्डर लोड हो रहा है...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📁</span>
            <div>
              <h2 className="text-sm font-extrabold text-stone-900">
                परीक्षाएं फोल्डर (Active Exams Folder)
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                जैसे-जैसे आप &quot;श्रेणियाँ&quot; में जाकर किसी परीक्षा को ON करेंगे, वह इस फोल्डर में स्वतः जुड़ती जाएगी।
              </p>
            </div>
          </div>
          <span className="text-xs font-bold bg-stone-100 text-stone-700 px-3 py-1 rounded-full font-mono">
            सक्रिय: {activeExams.length}
          </span>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden">
        {activeExams.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">
              📁
            </div>
            <h3 className="text-sm font-extrabold text-stone-800">
              परीक्षा फोल्डर अभी खाली है (0 सक्रिय परीक्षाएं)
            </h3>
            <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto leading-relaxed">
              अभी एडमिन में सभी परीक्षाएं OFF हैं। जैसे ही आप &quot;श्रेणियाँ (Categories)&quot; टैब में जाकर किसी परीक्षा को चालू (ON) करेंगे, वह स्वतः इस परीक्षा फोल्डर में लाइव दिखने लगेगी।
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-stone-100/70 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">परीक्षा का नाम (चौकोर लोगो)</th>
                  <th className="py-3 px-4">बोर्ड / आयोग</th>
                  <th className="py-3 px-4">श्रेणी</th>
                  <th className="py-3 px-4">योग्यता / पैटर्न</th>
                  <th className="py-3 px-4 text-center">स्थिति</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {activeExams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-stone-900 flex items-center justify-center text-white shrink-0 aspect-square p-0.5 overflow-hidden shadow-2xs">
                          {exam.logo_url ? (
                            <img src={exam.logo_url} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-[9px] font-mono text-amber-400 font-bold">
                              {(exam.short_name || exam.name).substring(0, 3)}
                            </span>
                          )}
                        </div>
                        <span className="font-extrabold text-stone-900 text-xs">{exam.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-stone-600 font-bold">{exam.board_name}</td>
                    <td className="py-3 px-4 text-stone-500">{exam.category_name}</td>
                    <td className="py-3 px-4 text-stone-500">
                      {exam.eligibility || exam.exam_pattern || "—"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        लाइव (ON)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
