"use client";

import { useState, useEffect } from "react";

interface Course {
  id: string;
  title: string;
  exam_id: string;
  price: number;
  original_price: number;
  cover_image?: string;
  is_active: boolean;
  is_featured: boolean;
  featured_priority: number;
  is_new_arrival: boolean;
  new_arrival_priority: number;
}

interface FeaturedTabProps {
  getAuthHeaders: () => Record<string, string>;
}

export default function FeaturedTab({ getAuthHeaders }: FeaturedTabProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/courses?all=true");
      if (!res.ok) throw new Error("Failed to load courses");
      const data = await res.json();
      setCourses(data);
    } catch {
      showToast("कोर्सेस लोड करने में त्रुटि हुई");
    } finally {
      setLoading(false);
    }
  };

  const persistCourses = async (updated: Course[], msg: string) => {
    try {
      setSaving(true);
      const res = await fetch("/api/courses", {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error("Save failed");
      setCourses(updated);
      showToast(msg);
    } catch {
      showToast("सेव करने में त्रुटि हुई");
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------
  // FEATURED TOGGLE & REORDER (Auto-Shift)
  // -------------------------------------------------------------
  const handleToggleFeatured = (id: string) => {
    const updated = courses.map((c) =>
      c.id === id ? { ...c, is_featured: !c.is_featured } : c
    );
    persistCourses(updated, "फीचर्ड स्थिति अपडेट की गई!");
  };

  const handleFeaturedRankChange = (id: string, newRankStr: string) => {
    const newRank = parseInt(newRankStr, 10);
    if (isNaN(newRank) || newRank < 1) return;

    const target = courses.find((c) => c.id === id);
    if (!target) return;

    // Filter out target and sort other featured items
    const others = courses
      .filter((c) => c.id !== id && c.is_featured)
      .sort((a, b) => a.featured_priority - b.featured_priority);

    let rankCounter = 1;
    const reorderedFeatured: Course[] = [];

    for (let i = 0; i <= others.length; i++) {
      if (rankCounter === newRank) {
        reorderedFeatured.push({ ...target, featured_priority: rankCounter });
        rankCounter++;
      }
      if (i < others.length) {
        reorderedFeatured.push({ ...others[i], featured_priority: rankCounter });
        rankCounter++;
      }
    }

    const featuredMap = new Map(reorderedFeatured.map((c) => [c.id, c.featured_priority]));
    const finalCourses = courses.map((c) =>
      featuredMap.has(c.id) ? { ...c, featured_priority: featuredMap.get(c.id)! } : c
    );

    persistCourses(finalCourses, `फीचर्ड क्रम #${newRank} पर सेट किया गया (अन्य स्वतः खिसके)`);
  };

  // -------------------------------------------------------------
  // NEW ARRIVAL TOGGLE & REORDER (Auto-Shift)
  // -------------------------------------------------------------
  const handleToggleNewArrival = (id: string) => {
    const updated = courses.map((c) =>
      c.id === id ? { ...c, is_new_arrival: !c.is_new_arrival } : c
    );
    persistCourses(updated, "न्यू अराइवल स्थिति अपडेट की गई!");
  };

  const handleNewArrivalRankChange = (id: string, newRankStr: string) => {
    const newRank = parseInt(newRankStr, 10);
    if (isNaN(newRank) || newRank < 1) return;

    const target = courses.find((c) => c.id === id);
    if (!target) return;

    const others = courses
      .filter((c) => c.id !== id && c.is_new_arrival)
      .sort((a, b) => a.new_arrival_priority - b.new_arrival_priority);

    let rankCounter = 1;
    const reordered: Course[] = [];

    for (let i = 0; i <= others.length; i++) {
      if (rankCounter === newRank) {
        reordered.push({ ...target, new_arrival_priority: rankCounter });
        rankCounter++;
      }
      if (i < others.length) {
        reordered.push({ ...others[i], new_arrival_priority: rankCounter });
        rankCounter++;
      }
    }

    const rankMap = new Map(reordered.map((c) => [c.id, c.new_arrival_priority]));
    const finalCourses = courses.map((c) =>
      rankMap.has(c.id) ? { ...c, new_arrival_priority: rankMap.get(c.id)! } : c
    );

    persistCourses(finalCourses, `न्यू अराइवल क्रम #${newRank} पर सेट किया गया`);
  };

  const handleToggleActive = (id: string) => {
    const updated = courses.map((c) =>
      c.id === id ? { ...c, is_active: !c.is_active } : c
    );
    persistCourses(updated, "कोर्स की लाइव स्थिति अपडेट की गई!");
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-stone-400 bg-white rounded-2xl border border-stone-200">
        <div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-stone-700">कोर्सेस व प्रोडक्ट्स लोड हो रहे हैं...</p>
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

      {/* HEADER EXPLANATION */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
        <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
          <span>🌟</span>
          <span>होमपेज प्रदर्शन नियंत्रण (Featured &amp; New Arrivals Management)</span>
        </h2>
        <p className="text-xs text-stone-500 mt-1">
          वेबसाइट के होमपेज पर &quot;फीचर्ड डील्स&quot; और &quot;न्यू अराइवल्स&quot; में कौन-कौन से प्रोडक्ट्स/कोर्स दिखेंगे और किस क्रम संख्या (नंबरिंग) पर आएंगे, उसे यहाँ से नियंत्रित करें।
        </p>
      </div>

      {/* PRODUCTS TABLE */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
          <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
            उपलब्ध कोर्सेस एवं नोट्स (कुल {courses.length})
          </span>
          {saving && <span className="text-xs font-bold text-amber-600 animate-pulse">सुरक्षित हो रहा है...</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-stone-100/70 border-b border-stone-200 text-stone-600 font-bold text-[11px] uppercase">
                <th className="py-3 px-4 w-[35%]">प्रोडक्ट / कोर्स का नाम</th>
                <th className="py-3 px-4 w-[12%] text-center">लाइव स्टेटस</th>
                <th className="py-3 px-4 w-[26%] text-center bg-amber-50/50">
                  🌟 फीचर्ड (Featured) • नंबरिंग
                </th>
                <th className="py-3 px-4 w-[27%] text-center bg-sky-50/50">
                  🆕 न्यू अराइवल (New Arrival) • नंबरिंग
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {courses.map((course) => (
                <tr key={course.id} className="hover:bg-stone-50/80 transition-colors">
                  {/* Title & Price */}
                  <td className="py-3.5 px-4">
                    <div className="font-extrabold text-stone-900 text-xs truncate max-w-[280px]">
                      {course.title}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-stone-500">
                      <span className="font-mono font-bold text-emerald-700">₹{course.price}</span>
                      <span className="line-through text-stone-400">₹{course.original_price}</span>
                      <span className="text-stone-400">• {course.exam_id}</span>
                    </div>
                  </td>

                  {/* General Live Active Toggle */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => handleToggleActive(course.id)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        course.is_active ? "bg-emerald-600" : "bg-stone-300"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          course.is_active ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <div className="text-[10px] font-bold mt-0.5">
                      {course.is_active ? (
                        <span className="text-emerald-700">Live ON</span>
                      ) : (
                        <span className="text-stone-400">OFF</span>
                      )}
                    </div>
                  </td>

                  {/* Featured Toggle + Numbering */}
                  <td className="py-3.5 px-4 bg-amber-50/30">
                    <div className="flex items-center justify-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleFeatured(course.id)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                            course.is_featured ? "bg-amber-600" : "bg-stone-300"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              course.is_featured ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                        <span className="text-[10px] font-bold text-amber-900">
                          {course.is_featured ? "ON" : "OFF"}
                        </span>
                      </div>

                      {course.is_featured && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-stone-500 font-bold">क्रम:</span>
                          <input
                            type="number"
                            min="1"
                            max={courses.length}
                            defaultValue={course.featured_priority || 1}
                            key={`feat-${course.id}-${course.featured_priority}`}
                            onBlur={(e) => handleFeaturedRankChange(course.id, e.target.value)}
                            className="w-12 text-center font-mono font-bold bg-white border border-amber-300 rounded py-0.5 px-1 text-xs text-stone-900 focus:border-amber-600 outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* New Arrival Toggle + Numbering */}
                  <td className="py-3.5 px-4 bg-sky-50/30">
                    <div className="flex items-center justify-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleNewArrival(course.id)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                            course.is_new_arrival ? "bg-sky-600" : "bg-stone-300"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              course.is_new_arrival ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                        <span className="text-[10px] font-bold text-sky-900">
                          {course.is_new_arrival ? "ON" : "OFF"}
                        </span>
                      </div>

                      {course.is_new_arrival && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-stone-500 font-bold">क्रम:</span>
                          <input
                            type="number"
                            min="1"
                            max={courses.length}
                            defaultValue={course.new_arrival_priority || 1}
                            key={`new-${course.id}-${course.new_arrival_priority}`}
                            onBlur={(e) => handleNewArrivalRankChange(course.id, e.target.value)}
                            className="w-12 text-center font-mono font-bold bg-white border border-sky-300 rounded py-0.5 px-1 text-xs text-stone-900 focus:border-sky-600 outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
