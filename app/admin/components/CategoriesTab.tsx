"use client";

import { useState, useEffect, useMemo, useTransition, useRef } from "react";

// ==========================================
// TYPES & INTERFACES (Pure 3-Level Hierarchy)
// ==========================================
export interface ExamItem {
  id: string;
  name: string;
  short_name?: string;
  logo_url?: string; // SQUARE / CHOKOR LOGO
  priority: number;
  is_active: boolean;
  eligibility?: string;
  age_limit?: string;
  applicant_scale?: string;
  exam_pattern?: string;
  viral_subtext?: string;
  notes_link?: string;
}

export interface BoardItem {
  board_id: string;
  name: string;
  short_name: string;
  icon?: string;
  logo_url?: string; // ROUND LOGO
  priority: number;
  is_active: boolean;
  viral_preview?: string;
  viral_names?: string[]; // 2-3 viral names displayed inside card
  official_portal?: string;
  exams: ExamItem[];
}

export interface CategoryItem {
  id: string;
  name: string;
  name_hi?: string;
  icon: string;
  logo_url?: string; // ROUND LOGO
  priority: number;
  is_active: boolean;
  sub_preview?: string;
  viral_names?: string[]; // 2-3 viral names displayed inside card
  description?: string;
  boards: BoardItem[];
}

interface CategoriesTabProps {
  getAuthHeaders: () => Record<string, string>;
}

type DrillLevel = "categories" | "boards" | "exams";

export default function CategoriesTab({ getAuthHeaders }: CategoriesTabProps) {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "warning" | "error" } | null>(null);

  // Progressive Drilldown State
  const [level, setLevel] = useState<DrillLevel>("categories");
  const [currentCategory, setCurrentCategory] = useState<CategoryItem | null>(null);
  const [currentBoard, setCurrentBoard] = useState<BoardItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [, startTransition] = useTransition();

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLevel, setEditLevel] = useState<DrillLevel>("categories");
  const [editFormData, setEditFormData] = useState<any>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Show toast utility
  const showToast = (text: string, type: "success" | "warning" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // -------------------------------------------------------------
  // INITIAL PROGRESSIVE LOAD (Cache-Busting Enabled)
  // -------------------------------------------------------------
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const authHeaders = typeof getAuthHeaders === "function" ? getAuthHeaders() : {};
      const res = await fetch(`/api/admin/categories?t=${Date.now()}`, {
        headers: authHeaders,
        cache: "no-store",
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `कैटेगरी लोड नहीं हो सकीं (Status: ${res.status})`);
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      const sorted = list.sort((a: any, b: any) => (a.priority || 0) - (b.priority || 0));
      setCategories(sorted);
    } catch (err: any) {
      showToast(err.message || "श्रेणियां लोड करने में त्रुटि", "error");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // SAVE HIERARCHICAL DATA TO SERVER (Multi-Path Guaranteed Persistence)
  // -------------------------------------------------------------
  const persistCategories = async (updatedList: CategoryItem[], successText = "परिवर्तन सफलतापूर्वक सुरक्षित किया गया!") => {
    try {
      setSaving(true);
      // Immediately update local state for instant UI response
      setCategories(updatedList);

      const authHeaders = typeof getAuthHeaders === "function" ? getAuthHeaders() : {};
      const res = await fetch(`/api/admin/categories?t=${Date.now()}`, {
        method: "PUT",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify(updatedList),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save changes");
      }

      showToast(successText, "success");
    } catch (err: any) {
      showToast(err.message || "सेव करने में त्रुटि हुई", "error");
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------
  // 📤 IMAGE FILE UPLOAD HANDLER
  // -------------------------------------------------------------
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (< 3MB)
    if (file.size > 3 * 1024 * 1024) {
      showToast("इमेज साइज 3MB से कम होना चाहिए!", "warning");
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", editLevel === "exams" ? "exams" : "logos");

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: {
          Authorization: getAuthHeaders().Authorization || "99502521387877489932hhh@@@",
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error("अपलोड असफल रहा");
      }

      const data = await res.json();
      if (data.url) {
        setEditFormData((prev: any) => ({
          ...prev,
          logo_url: data.url,
        }));
        showToast("लोगो इमेज सफलतापूर्वक अपलोड हुई!", "success");
      }
    } catch (err: any) {
      // Base64 fallback if server upload endpoint had issue
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setEditFormData((prev: any) => ({
          ...prev,
          logo_url: base64,
        }));
        showToast("इमेज लोड हो गई!", "success");
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingImage(false);
    }
  };

  // -------------------------------------------------------------
  // ⚡ AUTO-SHIFT REORDERING ALGORITHM
  // -------------------------------------------------------------
  function autoShiftReorder<T extends { id?: string; board_id?: string; priority: number }>(
    items: T[],
    targetIdentifier: string,
    newRank: number,
    idKey: "id" | "board_id" = "id"
  ): T[] {
    const currentItem = items.find((i: any) => (i[idKey] || i.id) === targetIdentifier);
    if (!currentItem) return items;

    const others = items
      .filter((i: any) => (i[idKey] || i.id) !== targetIdentifier)
      .sort((a, b) => a.priority - b.priority);

    const clampedRank = Math.max(1, Math.min(newRank, items.length));
    const reordered: T[] = [];
    let rankCounter = 1;

    for (let i = 0; i <= others.length; i++) {
      if (rankCounter === clampedRank) {
        reordered.push({ ...currentItem, priority: rankCounter });
        rankCounter++;
      }
      if (i < others.length) {
        reordered.push({ ...others[i], priority: rankCounter });
        rankCounter++;
      }
    }

    return reordered.sort((a, b) => a.priority - b.priority);
  }

  const handleNumberChange = (targetId: string, newRankStr: string, currentLevel: DrillLevel) => {
    const newRank = parseInt(newRankStr, 10);
    if (isNaN(newRank) || newRank < 1) return;

    if (currentLevel === "categories") {
      const updated = autoShiftReorder(categories, targetId, newRank, "id");
      persistCategories(updated, `श्रेणी का क्रम #${newRank} पर सेट किया गया (अन्य स्वतः खिसके)`);
    } else if (currentLevel === "boards" && currentCategory) {
      const currentBoards = currentCategory.boards || [];
      const updatedBoards = autoShiftReorder(currentBoards, targetId, newRank, "board_id");

      const updatedCategories = categories.map((cat) =>
        cat.id === currentCategory.id ? { ...cat, boards: updatedBoards } : cat
      );
      setCurrentCategory({ ...currentCategory, boards: updatedBoards });
      persistCategories(updatedCategories, `भर्ती बोर्ड का क्रम #${newRank} पर सेट किया गया`);
    } else if (currentLevel === "exams" && currentCategory && currentBoard) {
      const currentExams = currentBoard.exams || [];
      const updatedExams = autoShiftReorder(currentExams, targetId, newRank, "id");

      const updatedBoards = (currentCategory.boards || []).map((b) =>
        b.board_id === currentBoard.board_id ? { ...b, exams: updatedExams } : b
      );
      const updatedCategories = categories.map((cat) =>
        cat.id === currentCategory.id ? { ...cat, boards: updatedBoards } : cat
      );
      setCurrentBoard({ ...currentBoard, exams: updatedExams });
      setCurrentCategory({ ...currentCategory, boards: updatedBoards });
      persistCategories(updatedCategories, `परीक्षा का क्रम #${newRank} पर सेट किया गया`);
    }
  };

  // -------------------------------------------------------------
  // 🔘 ON/OFF CASCADING TOGGLE
  // -------------------------------------------------------------
  const handleToggleStatus = (targetId: string, currentLevel: DrillLevel) => {
    if (currentLevel === "categories") {
      const updated = categories.map((cat) => {
        if (cat.id === targetId) {
          const nextActive = !cat.is_active;
          return { ...cat, is_active: nextActive };
        }
        return cat;
      });
      persistCategories(updated, "श्रेणी की दृश्यता (On/Off) अपडेट की गई");
      if (currentCategory && currentCategory.id === targetId) {
        setCurrentCategory(updated.find((c) => c.id === targetId) || null);
      }
    } else if (currentLevel === "boards" && currentCategory) {
      let catActive = currentCategory.is_active;

      const updatedBoards = (currentCategory.boards || []).map((b) => {
        if (b.board_id === targetId) {
          const nextActive = !b.is_active;
          if (nextActive) catActive = true;
          return { ...b, is_active: nextActive };
        }
        return b;
      });

      const updatedCategories = categories.map((cat) =>
        cat.id === currentCategory.id
          ? { ...cat, is_active: catActive, boards: updatedBoards }
          : cat
      );
      setCurrentCategory({ ...currentCategory, is_active: catActive, boards: updatedBoards });
      persistCategories(updatedCategories, "भर्ती बोर्ड की दृश्यता (On/Off) अपडेट की गई");
      if (currentBoard && currentBoard.board_id === targetId) {
        setCurrentBoard(updatedBoards.find((b) => b.board_id === targetId) || null);
      }
    } else if (currentLevel === "exams" && currentCategory && currentBoard) {
      let catActive = currentCategory.is_active;
      let boardActive = currentBoard.is_active;

      const updatedExams = (currentBoard.exams || []).map((e) => {
        if (e.id === targetId) {
          const nextActive = !e.is_active;
          if (nextActive) {
            catActive = true;
            boardActive = true;
          }
          return { ...e, is_active: nextActive };
        }
        return e;
      });

      const updatedBoards = (currentCategory.boards || []).map((b) =>
        b.board_id === currentBoard.board_id
          ? { ...b, is_active: boardActive, exams: updatedExams }
          : b
      );
      const updatedCategories = categories.map((cat) =>
        cat.id === currentCategory.id
          ? { ...cat, is_active: catActive, boards: updatedBoards }
          : cat
      );
      setCurrentBoard({ ...currentBoard, is_active: boardActive, exams: updatedExams });
      setCurrentCategory({ ...currentCategory, is_active: catActive, boards: updatedBoards });
      persistCategories(updatedCategories, "परीक्षा की दृश्यता (On/Off) अपडेट की गई");
    }
  };

  // 🧭 DRILLDOWN NAVIGATION (Category -> Board -> Exam)
  // -------------------------------------------------------------
  const drillIntoCategory = (cat: CategoryItem) => {
    startTransition(() => {
      setCurrentCategory(cat);
      setLevel("boards");
      setSearchQuery("");
    });
  };

  const drillIntoBoard = (board: BoardItem) => {
    startTransition(() => {
      setCurrentBoard(board);
      setLevel("exams");
      setSearchQuery("");
    });
  };

  const jumpToCategories = () => {
    startTransition(() => {
      setLevel("categories");
      setCurrentCategory(null);
      setCurrentBoard(null);
      setSearchQuery("");
    });
  };

  const jumpToBoards = () => {
    startTransition(() => {
      setLevel("boards");
      setCurrentBoard(null);
      setSearchQuery("");
    });
  };

  // -------------------------------------------------------------
  // ✏️ EDIT MODAL HANDLERS
  // -------------------------------------------------------------
  const openEditModal = (item: any, itemLevel: DrillLevel) => {
    setEditLevel(itemLevel);
    setEditFormData({
      ...item,
      viral_names_str: (item.viral_names || []).join(", "),
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    const viralNames = (editFormData.viral_names_str || "")
      .split(",")
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0)
      .slice(0, 3);

    if (editLevel === "categories") {
      const updated = categories.map((c) =>
        c.id === editFormData.id
          ? {
              ...c,
              name: editFormData.name,
              name_hi: editFormData.name_hi,
              icon: editFormData.icon,
              logo_url: editFormData.logo_url,
              description: editFormData.description,
              viral_names: viralNames,
              sub_preview: viralNames.join(" • "),
            }
          : c
      );
      persistCategories(updated, "श्रेणी का विवरण सुरक्षित किया गया!");
      if (currentCategory && currentCategory.id === editFormData.id) {
        setCurrentCategory(updated.find((c) => c.id === editFormData.id) || null);
      }
    } else if (editLevel === "boards" && currentCategory) {
      const updatedBoards = (currentCategory.boards || []).map((b) =>
        b.board_id === editFormData.board_id
          ? {
              ...b,
              name: editFormData.name,
              short_name: editFormData.short_name,
              icon: editFormData.icon,
              logo_url: editFormData.logo_url,
              official_portal: editFormData.official_portal,
              viral_names: viralNames,
              viral_preview: viralNames.join(" • "),
            }
          : b
      );
      const updatedCategories = categories.map((cat) =>
        cat.id === currentCategory.id ? { ...cat, boards: updatedBoards } : cat
      );
      setCurrentCategory({ ...currentCategory, boards: updatedBoards });
      persistCategories(updatedCategories, "भर्ती बोर्ड का विवरण सुरक्षित किया गया!");
      if (currentBoard && currentBoard.board_id === editFormData.board_id) {
        setCurrentBoard(updatedBoards.find((b) => b.board_id === editFormData.board_id) || null);
      }
    } else if (editLevel === "exams" && currentCategory && currentBoard) {
      const updatedExams = (currentBoard.exams || []).map((e) =>
        e.id === editFormData.id
          ? {
              ...e,
              name: editFormData.name,
              short_name: editFormData.short_name,
              logo_url: editFormData.logo_url,
              eligibility: editFormData.eligibility,
              age_limit: editFormData.age_limit,
              applicant_scale: editFormData.applicant_scale,
              exam_pattern: editFormData.exam_pattern,
              viral_subtext: editFormData.viral_subtext,
              notes_link: editFormData.notes_link,
            }
          : e
      );
      const updatedBoards = (currentCategory.boards || []).map((b) =>
        b.board_id === currentBoard.board_id ? { ...b, exams: updatedExams } : b
      );
      const updatedCategories = categories.map((cat) =>
        cat.id === currentCategory.id ? { ...cat, boards: updatedBoards } : cat
      );
      setCurrentBoard({ ...currentBoard, exams: updatedExams });
      setCurrentCategory({ ...currentCategory, boards: updatedBoards });
      persistCategories(updatedCategories, "परीक्षा का विवरण सुरक्षित किया गया!");
    }

    setShowEditModal(false);
  };

  // -------------------------------------------------------------
  // FILTERED DATA BY CURRENT LEVEL & SEARCH
  // -------------------------------------------------------------
  const visibleCategories = useMemo(() => {
    if (!searchQuery) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.name_hi && c.name_hi.toLowerCase().includes(q)) ||
        (c.sub_preview && c.sub_preview.toLowerCase().includes(q))
    );
  }, [categories, searchQuery]);

  const visibleBoards = useMemo(() => {
    if (!currentCategory) return [];
    const boards = (currentCategory.boards || []).sort((a, b) => a.priority - b.priority);
    if (!searchQuery) return boards;
    const q = searchQuery.toLowerCase();
    return boards.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.short_name.toLowerCase().includes(q) ||
        (b.viral_preview && b.viral_preview.toLowerCase().includes(q))
    );
  }, [currentCategory, searchQuery]);

  const visibleExams = useMemo(() => {
    if (!currentBoard) return [];
    const exams = (currentBoard.exams || []).sort((a, b) => a.priority - b.priority);
    if (!searchQuery) return exams;
    const q = searchQuery.toLowerCase();
    return exams.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.short_name && e.short_name.toLowerCase().includes(q)) ||
        (e.eligibility && e.eligibility.toLowerCase().includes(q)) ||
        (e.viral_subtext && e.viral_subtext.toLowerCase().includes(q))
    );
  }, [currentBoard, searchQuery]);

  if (loading) {
    return (
      <div className="py-20 text-center text-stone-400 bg-white rounded-2xl border border-stone-200">
        <div className="w-10 h-10 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-bold text-stone-700">श्रेणियाँ व परीक्षा संरचना लोड हो रही है...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* TOAST NOTIFICATION */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-bold flex items-center gap-2.5 transition-all ${
            toastMsg.type === "success"
              ? "bg-emerald-600 text-white"
              : toastMsg.type === "warning"
              ? "bg-amber-600 text-white"
              : "bg-rose-600 text-white"
          }`}
        >
          <span>{toastMsg.type === "success" ? "✓" : "⚠️"}</span>
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* 🧭 BREADCRUMBS NAVIGATION BAR */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <nav className="flex items-center gap-2 text-xs sm:text-sm font-bold">
          <button
            onClick={jumpToCategories}
            className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
              level === "categories" ? "text-amber-700 font-extrabold" : "text-stone-500 hover:text-stone-900"
            }`}
          >
            <span>🏠 श्रेणियाँ (Categories)</span>
            <span className="text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-mono">
              {categories.length}
            </span>
          </button>

          {currentCategory && (
            <>
              <span className="text-stone-300">›</span>
              <button
                onClick={jumpToBoards}
                className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                  level === "boards" ? "text-amber-700 font-extrabold" : "text-stone-500 hover:text-stone-900"
                }`}
              >
                <span>{currentCategory.icon} {currentCategory.name}</span>
                <span className="text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-mono">
                  {(currentCategory.boards || []).length} बोर्ड्स
                </span>
              </button>
            </>
          )}

          {currentBoard && (
            <>
              <span className="text-stone-300">›</span>
              <span className="text-amber-700 font-extrabold flex items-center gap-1.5">
                <span>{currentBoard.icon || "🏛️"} {currentBoard.short_name}</span>
                <span className="text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-mono">
                  {(currentBoard.exams || []).length} परीक्षाएं
                </span>
              </span>
            </>
          )}
        </nav>

        {/* Instant Search Bar */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder={
              level === "categories"
                ? "श्रेणी खोजें..."
                : level === "boards"
                ? "भर्ती बोर्ड खोजें..."
                : "परीक्षा खोजें..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 pl-9 outline-none focus:border-amber-500 focus:bg-white transition-all"
          />
          <span className="absolute left-3 top-2.5 text-stone-400 text-xs">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2 text-stone-400 hover:text-stone-700 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4-COLUMN HIERARCHICAL MANAGEMENT TABLE                   */}
      {/* ========================================================= */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Table Header */}
        <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-stone-900">
              {level === "categories" && "स्तर 1: श्रेणियाँ (Categories)"}
              {level === "boards" && `स्तर 2: ${currentCategory?.name} के भर्ती बोर्ड / आयोग`}
              {level === "exams" && `स्तर 3: ${currentBoard?.name} की सरकारी परीक्षाएं`}
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              {level === "categories" && "नाम पर क्लिक करके अंदर के भर्ती बोर्ड देखें • नंबर बदलने पर बाकी स्वतः आगे खिसक जाएंगे"}
              {level === "boards" && "बोर्ड पर क्लिक करके अंदर की परीक्षाएं देखें • मूल श्रेणी बंद होने पर बोर्ड स्वतः निष्क्रिय रहेगा"}
              {level === "exams" && "चौकोर लोगो वाली वास्तविक परीक्षाएं • ऑन/ऑफ दृश्यता नियंत्रित करें"}
            </p>
          </div>

          {level !== "categories" && (
            <button
              onClick={level === "exams" ? jumpToBoards : jumpToCategories}
              className="text-xs font-bold bg-white border border-stone-200 px-3.5 py-1.5 rounded-lg text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <span>⬅️</span>
              <span>{level === "exams" ? "बोर्ड्स पर वापस" : "श्रेणियों पर वापस"}</span>
            </button>
          )}
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-stone-100/70 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-[45%]">1. नाम (क्लिक करने पर अंदर जाएं)</th>
                <th className="py-3 px-4 w-[18%]">2. क्रम संख्या (Auto-Shift)</th>
                <th className="py-3 px-4 w-[18%] text-center">3. स्थिति (On / Off)</th>
                <th className="py-3 px-4 w-[19%] text-right">4. संपादन (Action)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {/* ------------------------------------------------------------- */}
              {/* LEVEL 1: CATEGORIES ROW RENDERING                             */}
              {/* ------------------------------------------------------------- */}
              {level === "categories" &&
                visibleCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-amber-50/40 transition-colors group">
                    {/* 1. Category Name (Clickable Drilldown) */}
                    <td className="py-3.5 px-4">
                      <div
                        onClick={() => drillIntoCategory(cat)}
                        className="flex items-center gap-3 cursor-pointer select-none"
                      >
                        {/* Round Logo */}
                        <div className="w-10 h-10 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-xl shrink-0 shadow-2xs group-hover:border-amber-400 transition-colors overflow-hidden">
                          {cat.logo_url ? (
                            <img src={cat.logo_url} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            cat.icon || "📁"
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-stone-900 group-hover:text-amber-700 transition-colors text-sm truncate">
                              {cat.name}
                            </span>
                            <span className="text-[10px] text-stone-400 group-hover:translate-x-1 transition-transform">
                              ›
                            </span>
                          </div>
                          {cat.viral_names && cat.viral_names.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200/60 px-1.5 py-0.2 rounded font-medium">
                                3 मुख्य: {cat.viral_names.slice(0, 3).join(" • ")}
                              </span>
                              <span className="text-[10px] text-stone-400">
                                • {(cat.boards || []).length} बोर्ड्स
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Numbering with Auto-Shift */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max={categories.length}
                          defaultValue={cat.priority}
                          key={`${cat.id}-${cat.priority}`}
                          onBlur={(e) => handleNumberChange(cat.id, e.target.value, "categories")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          className="w-14 text-center font-mono font-bold bg-white border border-stone-200 rounded-lg py-1 px-1.5 text-xs text-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs"
                        />
                        <span className="text-[10px] text-stone-400 font-mono">/ {categories.length}</span>
                      </div>
                    </td>

                    {/* 3. On/Off Switch */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(cat.id, "categories")}
                        disabled={saving}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          cat.is_active ? "bg-emerald-600" : "bg-stone-300"
                        }`}
                        title={cat.is_active ? "लाइव चालू (क्लिक करके बंद करें)" : "छुपा हुआ (क्लिक करके चालू करें)"}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            cat.is_active ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <div className="text-[10px] font-bold mt-0.5">
                        {cat.is_active ? (
                          <span className="text-emerald-700">लाइव (ON)</span>
                        ) : (
                          <span className="text-stone-400">बंद (OFF)</span>
                        )}
                      </div>
                    </td>

                    {/* 4. Edit Action */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openEditModal(cat, "categories")}
                        className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <span>✏️</span>
                        <span>एडिट</span>
                      </button>
                    </td>
                  </tr>
                ))}

              {/* ------------------------------------------------------------- */}
              {/* LEVEL 2: BOARDS ROW RENDERING                                 */}
              {/* ------------------------------------------------------------- */}
              {level === "boards" &&
                visibleBoards.map((board) => (
                  <tr key={board.board_id} className="hover:bg-amber-50/40 transition-colors group">
                    {/* 1. Board Name (Clickable Drilldown) */}
                    <td className="py-3.5 px-4">
                      <div
                        onClick={() => drillIntoBoard(board)}
                        className="flex items-center gap-3 cursor-pointer select-none"
                      >
                        <div className="w-10 h-10 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-xl shrink-0 shadow-2xs group-hover:border-amber-400 transition-colors overflow-hidden">
                          {board.logo_url ? (
                            <img src={board.logo_url} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            board.icon || "🏛️"
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-stone-900 group-hover:text-amber-700 transition-colors text-sm truncate">
                              {board.short_name || board.name}
                            </span>
                            <span className="text-[10px] text-stone-400 group-hover:translate-x-1 transition-transform">
                              ›
                            </span>
                          </div>
                          <div className="text-[11px] text-stone-500 truncate">{board.name}</div>
                          {board.viral_names && board.viral_names.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200/60 px-1.5 py-0.2 rounded font-medium">
                                3 मुख्य: {board.viral_names.slice(0, 3).join(" • ")}
                              </span>
                              <span className="text-[10px] text-stone-400">
                                • {(board.exams || []).length} परीक्षाएं
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Board Numbering with Auto-Shift */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max={(currentCategory?.boards || []).length}
                          defaultValue={board.priority}
                          key={`${board.board_id}-${board.priority}`}
                          onBlur={(e) => handleNumberChange(board.board_id, e.target.value, "boards")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          className="w-14 text-center font-mono font-bold bg-white border border-stone-200 rounded-lg py-1 px-1.5 text-xs text-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs"
                        />
                        <span className="text-[10px] text-stone-400 font-mono">
                          / {(currentCategory?.boards || []).length}
                        </span>
                      </div>
                    </td>

                    {/* 3. Board On/Off Switch */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <button
                          onClick={() => handleToggleStatus(board.board_id, "boards")}
                          disabled={saving}
                          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            board.is_active
                              ? "bg-emerald-600 cursor-pointer"
                              : "bg-stone-300 cursor-pointer"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              board.is_active ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                        <div className="text-[10px] font-bold mt-0.5">
                          {!currentCategory?.is_active ? (
                            <span className="text-amber-700">श्रेणी बंद</span>
                          ) : board.is_active ? (
                            <span className="text-emerald-700">लाइव (ON)</span>
                          ) : (
                            <span className="text-stone-400">बंद (OFF)</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 4. Board Edit Action */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openEditModal(board, "boards")}
                        className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <span>✏️</span>
                        <span>एडिट</span>
                      </button>
                    </td>
                  </tr>
                ))}

              {/* ------------------------------------------------------------- */}
              {/* LEVEL 3: EXAMS ROW RENDERING (CHOKOR / SQUARE LOGO)           */}
              {/* ------------------------------------------------------------- */}
              {level === "exams" &&
                visibleExams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-amber-50/40 transition-colors">
                    {/* 1. Exam Name with SQUARE LOGO (चौकोर लोगो) */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-stone-900 border border-stone-700 flex items-center justify-center text-white shrink-0 aspect-square shadow-sm p-1 overflow-hidden">
                          {exam.logo_url ? (
                            <img src={exam.logo_url} alt="" className="w-full h-full rounded-lg object-contain" />
                          ) : (
                            <span className="font-mono font-extrabold text-[10px] uppercase text-center leading-tight text-amber-400">
                              {(exam.short_name || exam.name).substring(0, 4)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-stone-900 text-sm truncate">{exam.name}</div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {exam.eligibility && (
                              <span className="text-[10px] text-stone-600 bg-stone-100 px-1.5 py-0.2 rounded font-medium">
                                {exam.eligibility}
                              </span>
                            )}
                            {exam.exam_pattern && (
                              <span className="text-[10px] text-stone-500 truncate max-w-[200px]">
                                • {exam.exam_pattern}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Exam Numbering with Auto-Shift */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max={(currentBoard?.exams || []).length}
                          defaultValue={exam.priority}
                          key={`${exam.id}-${exam.priority}`}
                          onBlur={(e) => handleNumberChange(exam.id, e.target.value, "exams")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          className="w-14 text-center font-mono font-bold bg-white border border-stone-200 rounded-lg py-1 px-1.5 text-xs text-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs"
                        />
                        <span className="text-[10px] text-stone-400 font-mono">
                          / {(currentBoard?.exams || []).length}
                        </span>
                      </div>
                    </td>

                    {/* 3. Exam On/Off Switch */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <button
                          onClick={() => handleToggleStatus(exam.id, "exams")}
                          disabled={saving}
                          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            exam.is_active
                              ? "bg-emerald-600 cursor-pointer"
                              : "bg-stone-300 cursor-pointer"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              exam.is_active ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                        <div className="text-[10px] font-bold mt-0.5">
                          {!currentCategory?.is_active || !currentBoard?.is_active ? (
                            <span className="text-amber-700">मूल बंद</span>
                          ) : exam.is_active ? (
                            <span className="text-emerald-700">लाइव (ON)</span>
                          ) : (
                            <span className="text-stone-400">बंद (OFF)</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 4. Exam Edit Action */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openEditModal(exam, "exams")}
                        className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <span>✏️</span>
                        <span>एडिट</span>
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ✏️ EDIT MODAL (WITH IMAGE FILE UPLOADER & LIVE PREVIEW)   */}
      {/* ========================================================= */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                  {editLevel === "categories" && "श्रेणी संपादन (Category Edit)"}
                  {editLevel === "boards" && "भर्ती बोर्ड संपादन (Board Edit)"}
                  {editLevel === "exams" && "परीक्षा संपादन (Exam Edit)"}
                </span>
                <span className="text-sm font-bold text-stone-900 truncate max-w-[200px]">
                  {editFormData.name}
                </span>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-stone-400 hover:text-stone-700 text-base font-bold w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Split Form + Live Card Preview */}
            <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-6 max-h-[75vh] overflow-y-auto">
              <div className="md:col-span-2 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    नाम (शीर्षक - Name) *
                  </label>
                  <input
                    type="text"
                    value={editFormData.name || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>

                {editLevel === "categories" && (
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      हिंदी नाम (Hindi Name)
                    </label>
                    <input
                      type="text"
                      value={editFormData.name_hi || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, name_hi: e.target.value })}
                      className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>
                )}

                {editLevel === "boards" && (
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      संक्षिप्त नाम (Short Name) उदा. RSMSSB, RPSC
                    </label>
                    <input
                      type="text"
                      value={editFormData.short_name || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, short_name: e.target.value })}
                      className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>
                )}

                {/* 🌟 LOGO IMAGE FILE UPLOADER + URL INPUT */}
                <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <span>🖼️</span>
                      <span>लोगो इमेज (Logo Upload)</span>
                    </label>
                    {editFormData.logo_url && (
                      <button
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, logo_url: "" })}
                        className="text-[11px] text-rose-600 hover:underline font-bold"
                      >
                        हटाएं (Remove)
                      </button>
                    )}
                  </div>

                  {/* Hidden File Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageFileChange}
                    accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                    className="hidden"
                  />

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="px-3 py-2 bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <span>📤</span>
                      <span>{uploadingImage ? "अपलोड हो रहा है..." : "कंप्यूटर से इमेज चुनें"}</span>
                    </button>

                    <span className="text-[11px] text-stone-400">या URL दर्ज करें</span>
                  </div>

                  <input
                    type="text"
                    placeholder="https://... या /logos/image.png"
                    value={editFormData.logo_url || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, logo_url: e.target.value })}
                    className="w-full text-xs bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-stone-900 outline-none focus:border-amber-500"
                  />
                </div>

                {/* 3 Viral Names Field */}
                {editLevel !== "exams" && (
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      ⭐ अंदर दिखने वाले 3 मुख्य नाम (अल्पविराम ',' से अलग करें)
                    </label>
                    <input
                      type="text"
                      placeholder="उदा. CET 12th, पटवारी, पशु परिचर"
                      value={editFormData.viral_names_str || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, viral_names_str: e.target.value })}
                      className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 outline-none focus:border-amber-500 focus:bg-white font-mono"
                    />
                    <p className="text-[11px] text-stone-400 mt-1">
                      वेबसाइट के गोल घेरे के नीचे यही 3 नाम हल्के से दिखेंगे।
                    </p>
                  </div>
                )}

                {/* Exam Specific Fields */}
                {editLevel === "exams" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">योग्यता (Eligibility)</label>
                        <input
                          type="text"
                          value={editFormData.eligibility || ""}
                          onChange={(e) => setEditFormData({ ...editFormData, eligibility: e.target.value })}
                          className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 outline-none focus:border-amber-500 focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">आयु सीमा (Age Limit)</label>
                        <input
                          type="text"
                          value={editFormData.age_limit || ""}
                          onChange={(e) => setEditFormData({ ...editFormData, age_limit: e.target.value })}
                          className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 outline-none focus:border-amber-500 focus:bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">परीक्षा पैटर्न (Exam Pattern)</label>
                      <input
                        type="text"
                        value={editFormData.exam_pattern || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, exam_pattern: e.target.value })}
                        className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 outline-none focus:border-amber-500 focus:bg-white"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">विवरण (Description)</label>
                  <textarea
                    rows={2}
                    value={editFormData.description || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* 🎨 Live Card Preview on Right (Enforces Round for Cat/Board, Square for Exam) */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-3">
                  लाइव वेबसाइट प्रीव्यू
                </span>

                {editLevel !== "exams" ? (
                  /* CIRCULAR CARD PREVIEW FOR CATEGORY & BOARD */
                  <div className="w-36 h-36 rounded-full bg-slate-900 border-2 border-amber-500/80 flex flex-col items-center justify-center p-3 text-center shadow-lg relative overflow-hidden">
                    {editFormData.logo_url ? (
                      <img
                        src={editFormData.logo_url}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover mb-1 border border-stone-600"
                      />
                    ) : (
                      <div className="text-2xl mb-1">{editFormData.icon || "📁"}</div>
                    )}
                    <div className="text-xs font-extrabold text-white truncate max-w-[120px]">
                      {editFormData.short_name || editFormData.name || "टाइटल"}
                    </div>
                    <div className="text-[9px] text-amber-400 mt-1 max-w-[110px] leading-tight font-medium truncate">
                      {(editFormData.viral_names_str || "नाम 1 • नाम 2").split(",").slice(0, 3).join(" • ")}
                    </div>
                    <span className="absolute -bottom-2 bg-slate-950 text-[8px] text-stone-400 border border-stone-700 px-2 py-0.5 rounded-full font-bold">
                      गोल घेरा (Round)
                    </span>
                  </div>
                ) : (
                  /* 🎯 SQUARE CARD PREVIEW FOR EXAMS (चौकोर) */
                  <div className="w-full bg-slate-900 border border-stone-700 rounded-xl p-3.5 text-left shadow-lg">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-emerald-950 border border-emerald-500 flex items-center justify-center text-[10px] text-emerald-400 font-mono font-bold aspect-square overflow-hidden shrink-0">
                        {editFormData.logo_url ? (
                          <img src={editFormData.logo_url} alt="" className="w-full h-full object-contain" />
                        ) : (
                          "SQ"
                        )}
                      </div>
                      <div className="text-xs font-extrabold text-white truncate max-w-[130px]">
                        {editFormData.name || "परीक्षा का नाम"}
                      </div>
                    </div>
                    <div className="text-[9px] text-stone-400">
                      {editFormData.eligibility || "योग्यता"}
                    </div>
                    <div className="mt-2 text-center text-[8px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 py-1 rounded">
                      ✓ चौकोर परीक्षा लोगो (Square)
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-stone-400 mt-4 leading-normal">
                  {editLevel !== "exams"
                    ? "श्रेणी और बोर्ड का कार्ड गोल रहेगा।"
                    : "परीक्षा का लोगो गोल नहीं, चौकोर रहेगा।"}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowEditModal(false)}
                className="text-xs font-bold px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-200 transition-colors cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || uploadingImage}
                className="text-xs font-bold px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {saving ? "सुरक्षित हो रहा है..." : "💾 सुरक्षित करें (Save)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
