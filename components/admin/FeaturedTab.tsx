"use client";

import { useState, useEffect, useMemo, useRef } from "react";

interface ExamSearchResult {
  id: string;
  name: string;
  short_name?: string;
  logo_url?: string;
  board_name: string;
  category_name: string;
}

interface RankedExam {
  id: string;
  name: string;
  short_name?: string;
  logo_url?: string;
  board_name: string;
  category_name: string;
  priority: number;
}

interface FeaturedTabProps {
  getAuthHeaders: () => Record<string, string>;
}

export default function FeaturedTab({ getAuthHeaders }: FeaturedTabProps) {
  const [allExams, setAllExams] = useState<ExamSearchResult[]>([]);
  const [featuredExams, setFeaturedExams] = useState<RankedExam[]>([]);
  const [newArrivals, setNewArrivals] = useState<RankedExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Search states
  const [featuredSearch, setFeaturedSearch] = useState("");
  const [showFeaturedDropdown, setShowFeaturedDropdown] = useState(false);
  const featuredDropdownRef = useRef<HTMLDivElement>(null);

  const [newArrivalSearch, setNewArrivalSearch] = useState("");
  const [showNewArrivalDropdown, setShowNewArrivalDropdown] = useState(false);
  const newArrivalDropdownRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (featuredDropdownRef.current && !featuredDropdownRef.current.contains(e.target as Node)) {
        setShowFeaturedDropdown(false);
      }
      if (newArrivalDropdownRef.current && !newArrivalDropdownRef.current.contains(e.target as Node)) {
        setShowNewArrivalDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // 1. Load all exams from categories
      const catRes = await fetch(`/api/admin/categories?t=${Date.now()}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const categories = await catRes.json();
      const examList: ExamSearchResult[] = [];

      if (Array.isArray(categories)) {
        for (const c of categories) {
          for (const b of c.boards || []) {
            for (const e of b.exams || []) {
              examList.push({
                id: e.id,
                name: e.name,
                short_name: e.short_name || e.name,
                logo_url: e.logo_url || "",
                board_name: b.short_name || b.name,
                category_name: c.name,
              });
            }
          }
        }
      }
      setAllExams(examList);

      // 2. Load featured & new arrival exams
      const featRes = await fetch(`/api/admin/featured?t=${Date.now()}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      if (featRes.ok) {
        const featData = await featRes.json();
        setFeaturedExams(featData.featured_exams || []);
        setNewArrivals(featData.new_arrivals || []);
      }
    } catch {
      showToast("डेटा लोड करने में समस्या आई");
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (newFeatured: RankedExam[], newNewArr: RankedExam[], msg: string) => {
    try {
      setSaving(true);
      setFeaturedExams(newFeatured);
      setNewArrivals(newNewArr);

      const res = await fetch("/api/admin/featured", {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          featured_exams: newFeatured,
          new_arrivals: newNewArr,
        }),
      });

      if (!res.ok) throw new Error("Save failed");
      showToast(msg);
    } catch {
      showToast("सेव करने में त्रुटि हुई");
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------
  // FEATURED EXAM HANDLERS
  // -------------------------------------------------------------
  const filteredFeaturedResults = useMemo(() => {
    if (!featuredSearch.trim()) return [];
    const q = featuredSearch.toLowerCase().trim();
    const existingIds = new Set(featuredExams.map((e) => e.id));
    return allExams
      .filter((e) => !existingIds.has(e.id))
      .filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.short_name && e.short_name.toLowerCase().includes(q)) ||
          e.board_name.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [allExams, featuredSearch, featuredExams]);

  const addFeaturedExam = (exam: ExamSearchResult) => {
    const nextRank = featuredExams.length + 1;
    const updated = [...featuredExams, { ...exam, priority: nextRank }];
    setFeaturedSearch("");
    setShowFeaturedDropdown(false);
    saveData(updated, newArrivals, `"${exam.name}" को फीचर्ड में जोड़ा गया (#${nextRank})`);
  };

  const removeFeaturedExam = (id: string) => {
    const target = featuredExams.find((e) => e.id === id);
    const remaining = featuredExams
      .filter((e) => e.id !== id)
      .map((e, idx) => ({ ...e, priority: idx + 1 }));
    saveData(remaining, newArrivals, `"${target?.name || "परीक्षा"}" को फीचर्ड से हटाया गया`);
  };

  const handleFeaturedRankChange = (id: string, newRankStr: string) => {
    const newRank = parseInt(newRankStr, 10);
    if (isNaN(newRank) || newRank < 1) return;

    const current = featuredExams.find((e) => e.id === id);
    if (!current) return;

    const others = featuredExams
      .filter((e) => e.id !== id)
      .sort((a, b) => a.priority - b.priority);

    const clampedRank = Math.max(1, Math.min(newRank, featuredExams.length));
    const reordered: RankedExam[] = [];
    let rankCounter = 1;

    for (let i = 0; i <= others.length; i++) {
      if (rankCounter === clampedRank) {
        reordered.push({ ...current, priority: rankCounter });
        rankCounter++;
      }
      if (i < others.length) {
        reordered.push({ ...others[i], priority: rankCounter });
        rankCounter++;
      }
    }

    saveData(reordered, newArrivals, `क्रम संख्या #${clampedRank} पर सेट की गई`);
  };

  // -------------------------------------------------------------
  // NEW ARRIVAL EXAM HANDLERS
  // -------------------------------------------------------------
  const filteredNewArrivalResults = useMemo(() => {
    if (!newArrivalSearch.trim()) return [];
    const q = newArrivalSearch.toLowerCase().trim();
    const existingIds = new Set(newArrivals.map((e) => e.id));
    return allExams
      .filter((e) => !existingIds.has(e.id))
      .filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.short_name && e.short_name.toLowerCase().includes(q)) ||
          e.board_name.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [allExams, newArrivalSearch, newArrivals]);

  const addNewArrivalExam = (exam: ExamSearchResult) => {
    const nextRank = newArrivals.length + 1;
    const updated = [...newArrivals, { ...exam, priority: nextRank }];
    setNewArrivalSearch("");
    setShowNewArrivalDropdown(false);
    saveData(featuredExams, updated, `"${exam.name}" को न्यू अराइवल्स में जोड़ा गया (#${nextRank})`);
  };

  const removeNewArrivalExam = (id: string) => {
    const target = newArrivals.find((e) => e.id === id);
    const remaining = newArrivals
      .filter((e) => e.id !== id)
      .map((e, idx) => ({ ...e, priority: idx + 1 }));
    saveData(featuredExams, remaining, `"${target?.name || "परीक्षा"}" को न्यू अराइवल्स से हटाया गया`);
  };

  const handleNewArrivalRankChange = (id: string, newRankStr: string) => {
    const newRank = parseInt(newRankStr, 10);
    if (isNaN(newRank) || newRank < 1) return;

    const current = newArrivals.find((e) => e.id === id);
    if (!current) return;

    const others = newArrivals
      .filter((e) => e.id !== id)
      .sort((a, b) => a.priority - b.priority);

    const clampedRank = Math.max(1, Math.min(newRank, newArrivals.length));
    const reordered: RankedExam[] = [];
    let rankCounter = 1;

    for (let i = 0; i <= others.length; i++) {
      if (rankCounter === clampedRank) {
        reordered.push({ ...current, priority: rankCounter });
        rankCounter++;
      }
      if (i < others.length) {
        reordered.push({ ...others[i], priority: rankCounter });
        rankCounter++;
      }
    }

    saveData(featuredExams, reordered, `क्रम संख्या #${clampedRank} पर सेट की गई`);
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-stone-400 bg-white rounded-2xl border border-stone-200">
        <div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-stone-700">लोड हो रहा है...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl bg-emerald-600 text-white shadow-xl text-xs font-bold flex items-center gap-2">
          <span>✓</span>
          <span>{toast}</span>
        </div>
      )}

      {/* SECTION 1: FEATURED EXAMS (SEARCH ICON ONLY) */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-200 bg-amber-50/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌟</span>
              <div>
                <h3 className="text-sm font-extrabold text-stone-900">फीचर्ड परीक्षाएं (Featured on Homepage)</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  सर्च आइकन से परीक्षा खोजें और तुरंत जोड़ें। क्रम संख्या डालकर प्राथमिकता सेट करें।
                </p>
              </div>
            </div>
            {saving && <span className="text-xs font-bold text-amber-600 animate-pulse">सुरक्षित हो रहा है...</span>}
          </div>

          {/* SEARCH BAR WITH SEARCH ICON */}
          <div className="relative mt-4" ref={featuredDropdownRef}>
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 परीक्षा खोजें (उदा. CET, पटवारी, SSC CGL, रेलवे NTPC) और फीचर्ड में जोड़ें..."
                value={featuredSearch}
                onChange={(e) => {
                  setFeaturedSearch(e.target.value);
                  setShowFeaturedDropdown(true);
                }}
                onFocus={() => setShowFeaturedDropdown(true)}
                className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-stone-300 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 shadow-2xs font-medium"
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm">🔍</span>
              {featuredSearch && (
                <button
                  onClick={() => {
                    setFeaturedSearch("");
                    setShowFeaturedDropdown(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Dropdown Results */}
            {showFeaturedDropdown && filteredFeaturedResults.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-stone-100">
                {filteredFeaturedResults.map((exam) => (
                  <div
                    key={exam.id}
                    onClick={() => addFeaturedExam(exam)}
                    className="p-3 hover:bg-amber-50 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center text-white shrink-0 aspect-square p-0.5 overflow-hidden">
                        {exam.logo_url ? (
                          <img src={exam.logo_url} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-[9px] font-mono text-amber-400 font-bold">
                            {(exam.short_name || exam.name).substring(0, 3)}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-stone-900">{exam.name}</div>
                        <div className="text-[10px] text-stone-500">
                          {exam.board_name} • {exam.category_name}
                        </div>
                      </div>
                    </div>
                    <button className="text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition-colors">
                      + जोड़ें
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* FEATURED EXAMS LIST */}
        <div className="p-4">
          {featuredExams.length === 0 ? (
            <div className="py-8 text-center text-stone-400 text-xs">
              <span className="text-2xl block mb-1">🌟</span>
              अभी कोई परीक्षा फीचर्ड में नहीं जोड़ी गई है। ऊपर दिए गए सर्च बार से खोजकर जोड़ें।
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {featuredExams
                .sort((a, b) => a.priority - b.priority)
                .map((exam) => (
                  <div key={exam.id} className="py-2.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-stone-900 border border-stone-700 flex items-center justify-center text-white shrink-0 aspect-square p-0.5 overflow-hidden shadow-2xs">
                        {exam.logo_url ? (
                          <img src={exam.logo_url} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-[9px] font-mono text-amber-400 font-bold">
                            {(exam.short_name || exam.name).substring(0, 3)}
                          </span>
                        )}
                      </div>
                      <div className="truncate">
                        <div className="font-extrabold text-xs text-stone-900 truncate">{exam.name}</div>
                        <div className="text-[10px] text-stone-500">
                          {exam.board_name} • {exam.category_name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-stone-500">क्रम:</span>
                        <input
                          type="number"
                          min="1"
                          max={featuredExams.length}
                          defaultValue={exam.priority}
                          key={`feat-${exam.id}-${exam.priority}`}
                          onBlur={(e) => handleFeaturedRankChange(exam.id, e.target.value)}
                          className="w-12 text-center font-mono font-bold bg-white border border-amber-300 rounded py-0.5 px-1 text-xs text-stone-900 focus:border-amber-600 outline-none"
                        />
                      </div>
                      <button
                        onClick={() => removeFeaturedExam(exam.id)}
                        className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-rose-50 text-stone-400 hover:text-rose-600 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                        title="हटाएं"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: NEW ARRIVALS EXAMS (SEARCH ICON ONLY) */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-200 bg-sky-50/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🆕</span>
              <div>
                <h3 className="text-sm font-extrabold text-stone-900">न्यू अराइवल्स (New Arrivals on Homepage)</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  सर्च आइकन से परीक्षा खोजें और तुरंत जोड़ें। होमपेज पर नए आगमन के रूप में प्रदर्शित होंगी।
                </p>
              </div>
            </div>
            {saving && <span className="text-xs font-bold text-sky-600 animate-pulse">सुरक्षित हो रहा है...</span>}
          </div>

          {/* SEARCH BAR WITH SEARCH ICON */}
          <div className="relative mt-4" ref={newArrivalDropdownRef}>
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 परीक्षा खोजें और न्यू अराइवल्स में जोड़ें..."
                value={newArrivalSearch}
                onChange={(e) => {
                  setNewArrivalSearch(e.target.value);
                  setShowNewArrivalDropdown(true);
                }}
                onFocus={() => setShowNewArrivalDropdown(true)}
                className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-stone-300 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600 shadow-2xs font-medium"
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm">🔍</span>
              {newArrivalSearch && (
                <button
                  onClick={() => {
                    setNewArrivalSearch("");
                    setShowNewArrivalDropdown(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Dropdown Results */}
            {showNewArrivalDropdown && filteredNewArrivalResults.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-stone-100">
                {filteredNewArrivalResults.map((exam) => (
                  <div
                    key={exam.id}
                    onClick={() => addNewArrivalExam(exam)}
                    className="p-3 hover:bg-sky-50 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center text-white shrink-0 aspect-square p-0.5 overflow-hidden">
                        {exam.logo_url ? (
                          <img src={exam.logo_url} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-[9px] font-mono text-sky-400 font-bold">
                            {(exam.short_name || exam.name).substring(0, 3)}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-stone-900">{exam.name}</div>
                        <div className="text-[10px] text-stone-500">
                          {exam.board_name} • {exam.category_name}
                        </div>
                      </div>
                    </div>
                    <button className="text-xs font-bold text-sky-700 bg-sky-100 hover:bg-sky-200 px-2.5 py-1 rounded-lg transition-colors">
                      + जोड़ें
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* NEW ARRIVAL EXAMS LIST */}
        <div className="p-4">
          {newArrivals.length === 0 ? (
            <div className="py-8 text-center text-stone-400 text-xs">
              <span className="text-2xl block mb-1">🆕</span>
              अभी कोई परीक्षा न्यू अराइवल्स में नहीं जोड़ी गई है। ऊपर दिए गए सर्च बार से खोजकर जोड़ें।
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {newArrivals
                .sort((a, b) => a.priority - b.priority)
                .map((exam) => (
                  <div key={exam.id} className="py-2.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-stone-900 border border-stone-700 flex items-center justify-center text-white shrink-0 aspect-square p-0.5 overflow-hidden shadow-2xs">
                        {exam.logo_url ? (
                          <img src={exam.logo_url} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-[9px] font-mono text-sky-400 font-bold">
                            {(exam.short_name || exam.name).substring(0, 3)}
                          </span>
                        )}
                      </div>
                      <div className="truncate">
                        <div className="font-extrabold text-xs text-stone-900 truncate">{exam.name}</div>
                        <div className="text-[10px] text-stone-500">
                          {exam.board_name} • {exam.category_name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-stone-500">क्रम:</span>
                        <input
                          type="number"
                          min="1"
                          max={newArrivals.length}
                          defaultValue={exam.priority}
                          key={`new-${exam.id}-${exam.priority}`}
                          onBlur={(e) => handleNewArrivalRankChange(exam.id, e.target.value)}
                          className="w-12 text-center font-mono font-bold bg-white border border-sky-300 rounded py-0.5 px-1 text-xs text-stone-900 focus:border-sky-600 outline-none"
                        />
                      </div>
                      <button
                        onClick={() => removeNewArrivalExam(exam.id)}
                        className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-rose-50 text-stone-400 hover:text-rose-600 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                        title="हटाएं"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
