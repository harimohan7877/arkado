"use client";

import { useState, useEffect, useMemo, useRef } from "react";

interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  cover_image?: string;
  price?: number;
  type: "product" | "exam";
}

interface RankedItem {
  id: string;
  title: string;
  name?: string; // backwards compatibility
  subtitle?: string;
  cover_image?: string;
  logo_url?: string;
  price?: number;
  priority: number;
}

interface FeaturedTabProps {
  getAuthHeaders: () => Record<string, string>;
}

export default function FeaturedTab({ getAuthHeaders }: FeaturedTabProps) {
  const [allItems, setAllItems] = useState<SearchItem[]>([]);
  const [featuredItems, setFeaturedItems] = useState<RankedItem[]>([]);
  const [newArrivals, setNewArrivals] = useState<RankedItem[]>([]);
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
      const items: SearchItem[] = [];

      // 1. Load all courses/products (Primary)
      try {
        const coursesRes = await fetch(`/api/courses?all=true&t=${Date.now()}`, {
          cache: "no-store",
        });
        if (coursesRes.ok) {
          const courses = await coursesRes.json();
          if (Array.isArray(courses)) {
            for (const c of courses) {
              items.push({
                id: c.id,
                title: c.title,
                subtitle: `₹${c.price || 0} • ${c.exam_name || c.exam_id || "Study Bundle"}`,
                cover_image: c.cover_image || "",
                price: c.price || 0,
                type: "product",
              });
            }
          }
        }
      } catch (err) {
        console.error("Failed to load courses:", err);
      }

      // 2. Load all exams (Secondary)
      try {
        const catRes = await fetch(`/api/admin/categories?t=${Date.now()}`, {
          headers: getAuthHeaders(),
          cache: "no-store",
        });
        if (catRes.ok) {
          const categories = await catRes.json();
          if (Array.isArray(categories)) {
            for (const c of categories) {
              for (const b of c.boards || []) {
                for (const e of b.exams || []) {
                  items.push({
                    id: e.id,
                    title: e.name,
                    subtitle: `${b.short_name || b.name} • ${c.name}`,
                    cover_image: e.logo_url || "",
                    type: "exam",
                  });
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to load exams:", err);
      }

      setAllItems(items);

      // 3. Load configured featured & new arrival items
      const featRes = await fetch(`/api/admin/featured?t=${Date.now()}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      if (featRes.ok) {
        const featData = await featRes.json();
        const normalizeItem = (item: any, idx: number): RankedItem => ({
          id: item.id,
          title: item.title || item.name || "Untitled Item",
          name: item.name || item.title || "Untitled Item",
          subtitle: item.subtitle || (item.price ? `₹${item.price}` : item.exam_name || item.board_name || ""),
          cover_image: item.cover_image || item.logo_url || "",
          logo_url: item.logo_url || item.cover_image || "",
          price: item.price,
          priority: item.priority || idx + 1,
        });

        setFeaturedItems((featData.featured_exams || []).map(normalizeItem));
        setNewArrivals((featData.new_arrivals || []).map(normalizeItem));
      }
    } catch {
      showToast("डेटा लोड करने में समस्या आई");
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (newFeatured: RankedItem[], newNewArr: RankedItem[], msg: string) => {
    try {
      setSaving(true);
      setFeaturedItems(newFeatured);
      setNewArrivals(newNewArr);

      const res = await fetch("/api/admin/featured", {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          featured_exams: newFeatured.map((item, idx) => ({
            ...item,
            name: item.title || item.name,
            logo_url: item.cover_image || item.logo_url,
            priority: item.priority || idx + 1,
          })),
          new_arrivals: newNewArr.map((item, idx) => ({
            ...item,
            name: item.title || item.name,
            logo_url: item.cover_image || item.logo_url,
            priority: item.priority || idx + 1,
          })),
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
  // FEATURED PRODUCT HANDLERS
  // -------------------------------------------------------------
  const filteredFeaturedResults = useMemo(() => {
    if (!featuredSearch.trim()) return [];
    const q = featuredSearch.toLowerCase().trim();
    const existingIds = new Set(featuredItems.map((e) => e.id));
    return allItems
      .filter((e) => !existingIds.has(e.id))
      .filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.subtitle.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [allItems, featuredSearch, featuredItems]);

  const addFeaturedItem = (item: SearchItem) => {
    const nextRank = featuredItems.length + 1;
    const newItem: RankedItem = {
      id: item.id,
      title: item.title,
      name: item.title,
      subtitle: item.subtitle,
      cover_image: item.cover_image,
      logo_url: item.cover_image,
      price: item.price,
      priority: nextRank,
    };
    const updated = [...featuredItems, newItem];
    setFeaturedSearch("");
    setShowFeaturedDropdown(false);
    saveData(updated, newArrivals, `"${item.title}" को फीचर्ड में जोड़ा गया (#${nextRank})`);
  };

  const removeFeaturedItem = (id: string) => {
    const target = featuredItems.find((e) => e.id === id);
    const remaining = featuredItems
      .filter((e) => e.id !== id)
      .map((e, idx) => ({ ...e, priority: idx + 1 }));
    saveData(remaining, newArrivals, `"${target?.title || "प्रोडक्ट"}" को फीचर्ड से हटाया गया`);
  };

  const handleFeaturedRankChange = (id: string, newRankStr: string) => {
    const newRank = parseInt(newRankStr, 10);
    if (isNaN(newRank) || newRank < 1) return;

    const current = featuredItems.find((e) => e.id === id);
    if (!current) return;

    const others = featuredItems
      .filter((e) => e.id !== id)
      .sort((a, b) => a.priority - b.priority);

    const clampedRank = Math.max(1, Math.min(newRank, featuredItems.length));
    const reordered: RankedItem[] = [];
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
  // NEW ARRIVAL PRODUCT HANDLERS
  // -------------------------------------------------------------
  const filteredNewArrivalResults = useMemo(() => {
    if (!newArrivalSearch.trim()) return [];
    const q = newArrivalSearch.toLowerCase().trim();
    const existingIds = new Set(newArrivals.map((e) => e.id));
    return allItems
      .filter((e) => !existingIds.has(e.id))
      .filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.subtitle.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [allItems, newArrivalSearch, newArrivals]);

  const addNewArrivalItem = (item: SearchItem) => {
    const nextRank = newArrivals.length + 1;
    const newItem: RankedItem = {
      id: item.id,
      title: item.title,
      name: item.title,
      subtitle: item.subtitle,
      cover_image: item.cover_image,
      logo_url: item.cover_image,
      price: item.price,
      priority: nextRank,
    };
    const updated = [...newArrivals, newItem];
    setNewArrivalSearch("");
    setShowNewArrivalDropdown(false);
    saveData(featuredItems, updated, `"${item.title}" को न्यू अराइवल्स में जोड़ा गया (#${nextRank})`);
  };

  const removeNewArrivalItem = (id: string) => {
    const target = newArrivals.find((e) => e.id === id);
    const remaining = newArrivals
      .filter((e) => e.id !== id)
      .map((e, idx) => ({ ...e, priority: idx + 1 }));
    saveData(featuredItems, remaining, `"${target?.title || "प्रोडक्ट"}" को न्यू अराइवल्स से हटाया गया`);
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
    const reordered: RankedItem[] = [];
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

    saveData(featuredItems, reordered, `क्रम संख्या #${clampedRank} पर सेट की गई`);
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-stone-400 bg-white rounded-2xl border border-stone-200">
        <div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-stone-700">प्रोडक्ट्स लोड हो रहे हैं...</p>
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

      {/* SECTION 1: FEATURED PRODUCTS */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-200 bg-amber-50/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌟</span>
              <div>
                <h3 className="text-sm font-extrabold text-stone-900">
                  फीचर्ड प्रोडक्ट्स एवं बंडल्स (Featured on Homepage)
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  सर्च बार से कोई भी किताब या स्टडी बंडल खोजें और होमपेज पर फीचर्ड में प्रदर्शित करें।
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
                placeholder="🔍 किताब या स्टडी बंडल खोजें (उदा. CET, Reasoning, Maths, SSC CGL) और फीचर्ड में जोड़ें..."
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
              <div className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-stone-100">
                {filteredFeaturedResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => addFeaturedItem(item)}
                    className="p-3 hover:bg-amber-50 cursor-pointer flex items-center justify-between transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-12 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0 overflow-hidden">
                        {item.cover_image ? (
                          <img src={item.cover_image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm">📚</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-stone-900 truncate">{item.title}</div>
                        <div className="text-[10px] text-stone-500 truncate">{item.subtitle}</div>
                      </div>
                    </div>
                    <button className="shrink-0 text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors">
                      + जोड़ें
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* FEATURED ITEMS LIST */}
        <div className="p-4">
          {featuredItems.length === 0 ? (
            <div className="py-8 text-center text-stone-400 text-xs">
              <span className="text-2xl block mb-1">🌟</span>
              अभी कोई प्रोडक्ट फीचर्ड में नहीं जोड़ा गया है। ऊपर दिए गए सर्च बार से खोजकर जोड़ें।
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {featuredItems
                .sort((a, b) => a.priority - b.priority)
                .map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-12 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                        {item.cover_image ? (
                          <img src={item.cover_image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm">📚</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-xs text-stone-900 truncate">{item.title}</div>
                        <div className="text-[10px] text-stone-500 truncate">{item.subtitle}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-stone-500">क्रम:</span>
                        <input
                          type="number"
                          min="1"
                          max={featuredItems.length}
                          defaultValue={item.priority}
                          key={`feat-${item.id}-${item.priority}`}
                          onBlur={(e) => handleFeaturedRankChange(item.id, e.target.value)}
                          className="w-12 text-center font-mono font-bold bg-white border border-amber-300 rounded py-0.5 px-1 text-xs text-stone-900 focus:border-amber-600 outline-none"
                        />
                      </div>
                      <button
                        onClick={() => removeFeaturedItem(item.id)}
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

      {/* SECTION 2: NEW ARRIVALS */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-200 bg-sky-50/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">✨</span>
              <div>
                <h3 className="text-sm font-extrabold text-stone-900">
                  न्यू अराइवल्स (New Arrivals on Homepage)
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  सर्च बार से नई किताबें या बंडल्स खोजें और होमपेज पर New Arrivals में जोड़ें।
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
                placeholder="🔍 किताब या स्टडी बंडल खोजें और न्यू अराइवल्स में जोड़ें..."
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
              <div className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-stone-100">
                {filteredNewArrivalResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => addNewArrivalItem(item)}
                    className="p-3 hover:bg-sky-50 cursor-pointer flex items-center justify-between transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-12 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0 overflow-hidden">
                        {item.cover_image ? (
                          <img src={item.cover_image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm">📚</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-stone-900 truncate">{item.title}</div>
                        <div className="text-[10px] text-stone-500 truncate">{item.subtitle}</div>
                      </div>
                    </div>
                    <button className="shrink-0 text-xs font-bold text-sky-700 bg-sky-100 hover:bg-sky-200 px-3 py-1.5 rounded-lg transition-colors">
                      + जोड़ें
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* NEW ARRIVAL ITEMS LIST */}
        <div className="p-4">
          {newArrivals.length === 0 ? (
            <div className="py-8 text-center text-stone-400 text-xs">
              <span className="text-2xl block mb-1">✨</span>
              अभी कोई प्रोडक्ट न्यू अराइवल्स में नहीं जोड़ा गया है। ऊपर दिए गए सर्च बार से खोजकर जोड़ें।
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {newArrivals
                .sort((a, b) => a.priority - b.priority)
                .map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-12 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                        {item.cover_image ? (
                          <img src={item.cover_image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm">📚</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-xs text-stone-900 truncate">{item.title}</div>
                        <div className="text-[10px] text-stone-500 truncate">{item.subtitle}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-stone-500">क्रम:</span>
                        <input
                          type="number"
                          min="1"
                          max={newArrivals.length}
                          defaultValue={item.priority}
                          key={`new-${item.id}-${item.priority}`}
                          onBlur={(e) => handleNewArrivalRankChange(item.id, e.target.value)}
                          className="w-12 text-center font-mono font-bold bg-white border border-sky-300 rounded py-0.5 px-1 text-xs text-stone-900 focus:border-sky-600 outline-none"
                        />
                      </div>
                      <button
                        onClick={() => removeNewArrivalItem(item.id)}
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
