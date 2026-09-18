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

type DrillLevel = "categories" | "boards" | "exams" | "kits";

export default function CategoriesTab({ getAuthHeaders }: CategoriesTabProps) {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "warning" | "error" } | null>(null);

  // Progressive Drilldown State
  const [level, setLevel] = useState<DrillLevel>("categories");
  const [currentCategory, setCurrentCategory] = useState<CategoryItem | null>(null);
  const [currentBoard, setCurrentBoard] = useState<BoardItem | null>(null);
  const [currentExam, setCurrentExam] = useState<ExamItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [, startTransition] = useTransition();

  // Edit Modal State (Category, Board, Exam)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLevel, setEditLevel] = useState<DrillLevel>("categories");
  const [editFormData, setEditFormData] = useState<any>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Kit / Book Management Modal State
  const [showKitModal, setShowKitModal] = useState(false);
  const [editingKitId, setEditingKitId] = useState<string | null>(null);
  const [savingKit, setSavingKit] = useState(false);
  const [uploadingKitImage, setUploadingKitImage] = useState(false);
  const kitFileInputRef = useRef<HTMLInputElement>(null);
  const [kitFormData, setKitFormData] = useState<any>({
    title: "",
    badge: "1000 MCQs",
    short_description: "",
    original_price: 499,
    price: 99,
    discount_percent: 80,
    pages_count: "320+ Pages",
    format: "Printable PDF",
    language: "हिन्दी (Hindi)",
    cover_image: "",
    sample_pdf_url: "https://drive.google.com",
    drive_url: "https://drive.google.com",
    is_active: true,
  });

  // Category Card & Logo Customizer Modal State
  const [showCardStyleModal, setShowCardStyleModal] = useState(false);
  const [savingCardStyle, setSavingCardStyle] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [cardStyle, setCardStyle] = useState({
    logo_size: 100,
    logo_shape: "circle" as "circle" | "rounded-xl" | "rounded-2xl" | "square",
    container_padding: 0,
    show_inner_border: false,
    show_card_border: true,
    text_gap: 6,
    text_position: "below" as "above" | "below",
    text_size: "xs" as "xs" | "sm" | "base",
    show_exam_count: true,
    card_border_radius: "rounded-2xl" as "rounded-xl" | "rounded-2xl" | "rounded-3xl",
  });

  // Show toast utility
  const showToast = (text: string, type: "success" | "warning" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // -------------------------------------------------------------
  // INITIAL PROGRESSIVE LOAD (Categories + Courses/Kits + Settings)
  // -------------------------------------------------------------
  useEffect(() => {
    fetchCategories();
    fetchCourses();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const authHeaders = typeof getAuthHeaders === "function" ? getAuthHeaders() : {};
      const res = await fetch(`/api/admin/settings?t=${Date.now()}`, {
        headers: authHeaders,
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        if (data?.homepage?.category_card_style) {
          const s = data.homepage.category_card_style;
          setCardStyle({
            logo_size: s.logo_size ?? 100,
            logo_shape: s.logo_shape ?? "circle",
            container_padding: s.container_padding ?? 0,
            show_inner_border: s.show_inner_border === true,
            show_card_border: s.show_card_border !== false,
            text_gap: s.text_gap ?? 6,
            text_position: s.text_position ?? "below",
            text_size: s.text_size ?? "xs",
            show_exam_count: s.show_exam_count !== false,
            card_border_radius: s.card_border_radius ?? "rounded-2xl",
          });
        }
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  const handleSaveCardStyle = async () => {
    try {
      setSavingCardStyle(true);
      const authHeaders = typeof getAuthHeaders === "function" ? getAuthHeaders() : {};
      const updatedHomepage = {
        ...(settings?.homepage || {}),
        category_card_style: cardStyle,
      };
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          homepage: updatedHomepage,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "सेटिंग्स सुरक्षित करने में विफल");
      }
      const data = await res.json();
      setSettings(data);
      showToast("श्रेणी कार्ड व लोगो स्टाइल सफलतापूर्वक अपडेट हो गया!", "success");
      setShowCardStyleModal(false);
    } catch (err: any) {
      showToast(err.message || "स्टाइल सेव करने में त्रुटि", "error");
    } finally {
      setSavingCardStyle(false);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoadingCourses(true);
      const authHeaders = typeof getAuthHeaders === "function" ? getAuthHeaders() : {};
      const res = await fetch(`/api/admin/courses?t=${Date.now()}`, {
        headers: authHeaders,
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setCourses(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load courses for exam kits:", err);
    } finally {
      setLoadingCourses(false);
    }
  };

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
      formData.append("folder", editLevel === "exams" ? "exams" : editLevel === "boards" ? "boards" : "categories");

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
      setCurrentExam(null);
      setSearchQuery("");
    });
  };

  const jumpToBoards = () => {
    startTransition(() => {
      setLevel("boards");
      setCurrentBoard(null);
      setCurrentExam(null);
      setSearchQuery("");
    });
  };

  const drillIntoExam = (exam: ExamItem) => {
    startTransition(() => {
      setCurrentExam(exam);
      setLevel("kits");
      setSearchQuery("");
    });
  };

  const jumpToExams = () => {
    startTransition(() => {
      setLevel("exams");
      setCurrentExam(null);
      setSearchQuery("");
    });
  };

  // -------------------------------------------------------------
  // 📚 KIT / BOOK MANAGEMENT HANDLERS (Level 4)
  // -------------------------------------------------------------
  const openCreateKitModal = () => {
    if (!currentExam) return;
    setEditingKitId(null);
    setKitFormData({
      title: `${currentExam.short_name || currentExam.name} - 1000+ MCQs Book`,
      badge: "1000 MCQs",
      short_description: `${currentExam.name} हेतु नए परीक्षा पैटर्न पर आधारित 1000+ महत्वपूर्ण वस्तुनिष्ठ प्रश्नोत्तर (MCQs) व्याख्या सहित।`,
      original_price: 499,
      price: 99,
      discount_percent: 80,
      pages_count: "320+ Pages",
      format: "Printable PDF",
      language: "हिन्दी (Hindi)",
      cover_image: currentExam.logo_url || "",
      sample_pdf_url: "https://drive.google.com",
      drive_url: "https://drive.google.com",
      is_active: true,
      highlights: [
        "1000+ विषयवार वस्तुनिष्ठ प्रश्नोत्तर (MCQs) व्याख्या सहित",
        "विगत वर्षों के पैटर्न पर आधारित महत्वपूर्ण प्रश्न",
        "प्रिंट हेतु तैयार A4 साइज साफ-सुथरी PDF",
      ],
    });
    setShowKitModal(true);
  };

  const openEditKitModal = (kit: any) => {
    setEditingKitId(kit.id);
    setKitFormData({
      ...kit,
      original_price: kit.original_price || 499,
      price: kit.price || 99,
      discount_percent: kit.discount_percent || 80,
      badge: kit.badge || "1000 MCQs",
      sample_pdf_url: kit.sample_pdf_url || "https://drive.google.com",
      drive_url: kit.drive_url || "https://drive.google.com",
      highlights: Array.isArray(kit.highlights) ? kit.highlights : [],
    });
    setShowKitModal(true);
  };

  const handleSaveKit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentExam) return;
    setSavingKit(true);
    try {
      const isEdit = !!editingKitId;
      const url = isEdit ? `/api/admin/courses/${editingKitId}` : "/api/admin/courses";
      const method = isEdit ? "PUT" : "POST";

      const orig = Number(kitFormData.original_price || 499);
      const prc = Number(kitFormData.price || 99);
      const disc = orig > 0 ? Math.round(((orig - prc) / orig) * 100) : 0;

      const baseSlug = (kitFormData.title || "kit")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const slug = isEdit && kitFormData.slug ? kitFormData.slug : `${baseSlug}-${Date.now().toString().slice(-4)}`;

      const payload = {
        ...kitFormData,
        exam_id: currentExam.id,
        original_price: orig,
        price: prc,
        discount_percent: disc,
        slug,
      };

      const authHeaders = typeof getAuthHeaders === "function" ? getAuthHeaders() : {};
      const res = await fetch(url, {
        method,
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save kit");
      }

      showToast(isEdit ? "किट सफलतापूर्वक अपडेट हो गई!" : "नई किट सफलतापूर्वक जुड़ गई!", "success");
      setShowKitModal(false);
      fetchCourses();
    } catch (err: any) {
      showToast(err.message || "किट सुरक्षित करने में त्रुटि", "error");
    } finally {
      setSavingKit(false);
    }
  };

  const handleDeleteKit = async (kitId: string) => {
    if (!confirm("क्या आप वाकई इस किट/बुक को हटाना चाहते हैं?")) return;
    try {
      const authHeaders = typeof getAuthHeaders === "function" ? getAuthHeaders() : {};
      const res = await fetch(`/api/admin/courses/${kitId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (res.ok) {
        showToast("किट सफलतापूर्वक हटा दी गई", "success");
        fetchCourses();
      } else {
        throw new Error("Delete failed");
      }
    } catch (err: any) {
      showToast(err.message || "डिलीट करने में त्रुटि", "error");
    }
  };

  const handleToggleKitActive = async (kit: any) => {
    try {
      const authHeaders = typeof getAuthHeaders === "function" ? getAuthHeaders() : {};
      const res = await fetch(`/api/admin/courses/${kit.id}`, {
        method: "PUT",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: !kit.is_active }),
      });
      if (res.ok) {
        showToast(kit.is_active ? "किट बंद (OFF) कर दी गई" : "किट लाइव (ON) कर दी गई!", "success");
        fetchCourses();
      }
    } catch {
      showToast("स्टेटस बदलने में त्रुटि", "error");
    }
  };

  const handleKitImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      showToast("इमेज 3MB से कम होनी चाहिए!", "warning");
      return;
    }

    try {
      setUploadingKitImage(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "bundles");

      const authHeaders = typeof getAuthHeaders === "function" ? getAuthHeaders() : {};
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: {
          Authorization: authHeaders.Authorization || "99502521387877489932hhh@@@",
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          setKitFormData((prev: any) => ({ ...prev, cover_image: data.url }));
          showToast("कवर इमेज सफलतापूर्वक अपलोड हुई!", "success");
          return;
        }
      }
      throw new Error("Upload fallback");
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        setKitFormData((prev: any) => ({ ...prev, cover_image: reader.result as string }));
        showToast("इमेज लोड हो गई!", "success");
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingKitImage(false);
    }
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

  const visibleKits = useMemo(() => {
    if (!currentExam) return [];
    const list = courses.filter(
      (c) => c.exam_id === currentExam.id || c.id === currentExam.id || c.id === `exam-${currentExam.id}`
    );
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (k) =>
        k.title?.toLowerCase().includes(q) ||
        k.badge?.toLowerCase().includes(q) ||
        k.short_description?.toLowerCase().includes(q)
    );
  }, [courses, currentExam, searchQuery]);

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
              <button
                onClick={jumpToExams}
                className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                  level === "exams" ? "text-amber-700 font-extrabold" : "text-stone-500 hover:text-stone-900"
                }`}
              >
                <span>{currentBoard.icon || "🏛️"} {currentBoard.short_name}</span>
                <span className="text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-mono">
                  {(currentBoard.exams || []).length} परीक्षाएं
                </span>
              </button>
            </>
          )}

          {currentExam && (
            <>
              <span className="text-stone-300">›</span>
              <span className="text-amber-700 font-extrabold flex items-center gap-1.5">
                <span>🎯 {currentExam.short_name || currentExam.name}</span>
                <span className="text-xs bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-mono">
                  {visibleKits.length} किट्स
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
                : level === "exams"
                ? "परीक्षा खोजें..."
                : "किट या बुक खोजें..."
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
              {level === "kits" && `स्तर 4: ${currentExam?.name} की स्टडी किट्स व बुक्स (Kits & Books)`}
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              {level === "categories" && "नाम पर क्लिक करके अंदर के भर्ती बोर्ड देखें • नंबर बदलने पर बाकी स्वतः आगे खिसक जाएंगे"}
              {level === "boards" && "बोर्ड पर क्लिक करके अंदर की परीक्षाएं देखें • मूल श्रेणी बंद होने पर बोर्ड स्वतः निष्क्रिय रहेगा"}
              {level === "exams" && "परीक्षा पर क्लिक करके अंदर की बुक्स व किट्स देखें • ऑन/ऑफ दृश्यता नियंत्रित करें"}
              {level === "kits" && "प्रत्येक 1000 MCQs बुक या सम्पूर्ण किट को अलग-अलग जोड़ें, ऑन/ऑफ करें एवं मूल्य निर्धारित करें"}
            </p>
          </div>

          {level === "kits" ? (
            <div className="flex items-center gap-2">
              <button
                onClick={openCreateKitModal}
                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <span>➕</span>
                <span>नई किट / बुक जोड़ें</span>
              </button>
              <button
                onClick={jumpToExams}
                className="text-xs font-bold bg-white border border-stone-200 px-3.5 py-1.5 rounded-lg text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <span>⬅️</span>
                <span>परीक्षाओं पर वापस</span>
              </button>
            </div>
          ) : level !== "categories" ? (
            <button
              onClick={level === "exams" ? jumpToBoards : jumpToCategories}
              className="text-xs font-bold bg-white border border-stone-200 px-3.5 py-1.5 rounded-lg text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <span>⬅️</span>
              <span>{level === "exams" ? "बोर्ड्स पर वापस" : "श्रेणियों पर वापस"}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCardStyleModal(true)}
                className="text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="वेबसाइट के होमपेज पर श्रेणी कार्ड व लोगो का साइज, आकार और टेक्स्ट कस्टमाइज़ करें"
              >
                <span>🎨</span>
                <span>कार्ड व लोगो कस्टमाइज़ करें</span>
              </button>
            </div>
          )}
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-stone-100/70 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider text-[11px]">
                {level === "kits" ? (
                  <>
                    <th className="py-3 px-4 w-[45%]">1. किट / बुक का नाम व विवरण</th>
                    <th className="py-3 px-4 w-[20%]">2. मूल्य व छूट (Price)</th>
                    <th className="py-3 px-4 w-[15%] text-center">3. स्थिति (On / Off)</th>
                    <th className="py-3 px-4 w-[20%] text-right">4. संपादन व डिलीट</th>
                  </>
                ) : (
                  <>
                    <th className="py-3 px-4 w-[45%]">1. नाम (क्लिक करने पर अंदर जाएं)</th>
                    <th className="py-3 px-4 w-[18%]">2. क्रम संख्या (Auto-Shift)</th>
                    <th className="py-3 px-4 w-[18%] text-center">3. स्थिति (On / Off)</th>
                    <th className="py-3 px-4 w-[19%] text-right">4. संपादन (Action)</th>
                  </>
                )}
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
                    {/* 1. Exam Name with SQUARE LOGO (चौकोर लोगो) - CLICKABLE DRILLDOWN */}
                    <td className="py-3.5 px-4">
                      <div
                        onClick={() => drillIntoExam(exam)}
                        className="flex items-center gap-3 cursor-pointer select-none group"
                        title="क्लिक करके इस परीक्षा की बुक्स व किट्स देखें / जोड़ें"
                      >
                        <div className="w-11 h-11 rounded-xl bg-stone-900 border border-stone-700 flex items-center justify-center text-white shrink-0 aspect-square shadow-sm p-1 overflow-hidden group-hover:border-amber-400 transition-colors">
                          {exam.logo_url ? (
                            <img src={exam.logo_url} alt="" className="w-full h-full rounded-lg object-contain" />
                          ) : (
                            <span className="font-mono font-extrabold text-[10px] uppercase text-center leading-tight text-amber-400">
                              {(exam.short_name || exam.name).substring(0, 4)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-stone-900 group-hover:text-amber-700 transition-colors text-sm truncate">
                              {exam.name}
                            </span>
                            <span className="text-[10px] text-stone-400 group-hover:translate-x-1 transition-transform">
                              ›
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {(() => {
                              const count = courses.filter(
                                (c) => c.exam_id === exam.id || c.id === exam.id || c.id === `exam-${exam.id}`
                              ).length;
                              return (
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors ${
                                    count > 0
                                      ? "bg-amber-100 text-amber-900 border border-amber-300 group-hover:bg-amber-200"
                                      : "bg-stone-100 text-stone-500 border border-stone-200"
                                  }`}
                                >
                                  📦 {count} {count === 1 ? "किट / बुक" : "किट्स / बुक्स"} ›
                                </span>
                              );
                            })()}
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

                    {/* 4. Exam Actions (Drill to Kits + Edit) */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => drillIntoExam(exam)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                          title="इस परीक्षा की बुक्स व किट्स मैनेज करें"
                        >
                          <span>📦</span>
                          <span>किट्स</span>
                        </button>
                        <button
                          onClick={() => openEditModal(exam, "exams")}
                          className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <span>✏️</span>
                          <span>एडिट</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

              {/* ------------------------------------------------------------- */}
              {/* LEVEL 4: KITS / BOOKS ROW RENDERING                          */}
              {/* ------------------------------------------------------------- */}
              {level === "kits" && visibleKits.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-14 text-center px-4">
                    <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 shadow-2xs">
                      📚
                    </div>
                    <h4 className="text-sm font-extrabold text-stone-800">
                      इस परीक्षा में अभी कोई बुक या किट नहीं जुड़ी है
                    </h4>
                    <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto leading-relaxed">
                      आप इस परीक्षा के लिए अलग-अलग विषयवार 1000 MCQs बुक्स (जैसे: गणित, रीजनिंग, इंग्लिश, सामान्य अध्ययन) या सम्पूर्ण सलेक्शन किट जोड़ सकते हैं।
                    </p>
                    <button
                      onClick={openCreateKitModal}
                      className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl shadow-xs cursor-pointer transition-colors"
                    >
                      <span>➕</span>
                      <span>पहली किट / 1000 MCQs बुक जोड़ें</span>
                    </button>
                  </td>
                </tr>
              )}

              {level === "kits" &&
                visibleKits.map((kit) => (
                  <tr key={kit.id} className="hover:bg-amber-50/40 transition-colors">
                    {/* 1. Kit Details */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-14 rounded-lg bg-stone-900 border border-stone-700 shrink-0 overflow-hidden shadow-xs flex items-center justify-center p-0.5">
                          {kit.cover_image ? (
                            <img src={kit.cover_image} alt="" className="w-full h-full object-cover rounded-md" />
                          ) : (
                            <span className="text-xl">📖</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-stone-900 text-sm truncate max-w-md">
                              {kit.title}
                            </span>
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full shrink-0 border border-emerald-300">
                              {kit.badge || "Study Kit"}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 truncate mt-0.5 max-w-md">
                            {kit.short_description || "नए परीक्षा पैटर्न पर आधारित हस्तलिखित नोट्स व MCQs"}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-stone-400 flex-wrap">
                            <span className="bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded font-medium">
                              📄 {kit.pages_count || "Printable PDF"}
                            </span>
                            <span>•</span>
                            <span className={kit.drive_url ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                              {kit.drive_url ? "✓ Drive लिंक सेट है" : "⚠️ Drive लिंक नहीं है"}
                            </span>
                            {kit.sample_pdf_url && (
                              <>
                                <span>•</span>
                                <a
                                  href={kit.sample_pdf_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-amber-700 hover:underline font-medium"
                                >
                                  नमूना PDF देखें ↗
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Price & Discount */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono">
                        <span className="text-sm font-black text-stone-900">₹{kit.price}</span>
                        <del className="text-xs text-stone-400 ml-1.5">₹{kit.original_price}</del>
                        <div className="text-[10px] font-bold text-emerald-700 mt-0.5">
                          {kit.discount_percent || (kit.original_price ? Math.round(((kit.original_price - kit.price) / kit.original_price) * 100) : 0)}% छूट
                        </div>
                      </div>
                    </td>

                    {/* 3. On/Off Switch */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <button
                          onClick={() => handleToggleKitActive(kit)}
                          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none cursor-pointer ${
                            kit.is_active ? "bg-emerald-600" : "bg-stone-300"
                          }`}
                          title={kit.is_active ? "लाइव चालू (क्लिक करके बंद करें)" : "छुपा हुआ (क्लिक करके चालू करें)"}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              kit.is_active ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                        <div className="text-[10px] font-bold mt-0.5">
                          {kit.is_active ? (
                            <span className="text-emerald-700">लाइव (ON)</span>
                          ) : (
                            <span className="text-stone-400">बंद (OFF)</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 4. Edit / Delete Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditKitModal(kit)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <span>✏️</span>
                          <span>एडिट</span>
                        </button>
                        <button
                          onClick={() => handleDeleteKit(kit.id)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                          title="इस किट को डिलीट करें"
                        >
                          <span>🗑️</span>
                        </button>
                      </div>
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

      {/* ========================================================= */}
      {/* 📚 KIT / BOOK MODAL (CREATE & EDIT)                       */}
      {/* ========================================================= */}
      {showKitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                  {editingKitId ? "किट / बुक संपादन (Edit Kit)" : "नई किट / बुक जोड़ें (Add Kit / Book)"}
                </span>
                <h3 className="text-sm font-extrabold text-stone-900 mt-1 truncate max-w-md">
                  🎯 {currentExam?.name}
                </h3>
              </div>
              <button
                onClick={() => setShowKitModal(false)}
                className="text-stone-400 hover:text-stone-700 text-base font-bold w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveKit} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* 1. Title */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  किट / बुक का शीर्षक (Book / Kit Title) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="उदा. SSC CGL सामान्य गणित (Maths) 1000+ MCQs Book"
                  value={kitFormData.title || ""}
                  onChange={(e) => setKitFormData({ ...kitFormData, title: e.target.value })}
                  className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              {/* 2. Badge & Language */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    बैज / टैग (Badge Label)
                  </label>
                  <input
                    type="text"
                    placeholder="उदा. 1000 MCQs, Complete Kit, Handwritten Notes"
                    value={kitFormData.badge || ""}
                    onChange={(e) => setKitFormData({ ...kitFormData, badge: e.target.value })}
                    className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    भाषा (Language)
                  </label>
                  <input
                    type="text"
                    placeholder="हिन्दी (Hindi)"
                    value={kitFormData.language || "हिन्दी (Hindi)"}
                    onChange={(e) => setKitFormData({ ...kitFormData, language: e.target.value })}
                    className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* 3. Pricing */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    विक्रय मूल्य (Offer Price ₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={kitFormData.price || 99}
                    onChange={(e) => setKitFormData({ ...kitFormData, price: Number(e.target.value) })}
                    className="w-full text-xs font-mono font-bold bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    असली मूल्य (Original Price ₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={kitFormData.original_price || 499}
                    onChange={(e) => setKitFormData({ ...kitFormData, original_price: Number(e.target.value) })}
                    className="w-full text-xs font-mono bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    पेज संख्या (Pages Count)
                  </label>
                  <input
                    type="text"
                    placeholder="320+ Pages"
                    value={kitFormData.pages_count || ""}
                    onChange={(e) => setKitFormData({ ...kitFormData, pages_count: e.target.value })}
                    className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* 4. Short Description */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  संक्षिप्त विवरण (Short Description)
                </label>
                <textarea
                  rows={2}
                  placeholder="इस किट की मुख्य विशेषताएं या सारांश..."
                  value={kitFormData.short_description || ""}
                  onChange={(e) => setKitFormData({ ...kitFormData, short_description: e.target.value })}
                  className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 outline-none focus:border-emerald-500 focus:bg-white resize-none"
                />
              </div>

              {/* 5. Google Drive URLs (Download & Sample Preview) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Google Drive लिंक (सशुल्क डाउनलोड लिंक) *
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={kitFormData.drive_url || ""}
                    onChange={(e) => setKitFormData({ ...kitFormData, drive_url: e.target.value })}
                    className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 outline-none focus:border-emerald-500 focus:bg-white"
                  />
                  <span className="text-[10px] text-stone-400">भुगतान के बाद छात्र को यह लिंक मिलता है।</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    सैंपल PDF लिंक (Sample Demo Link)
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={kitFormData.sample_pdf_url || ""}
                    onChange={(e) => setKitFormData({ ...kitFormData, sample_pdf_url: e.target.value })}
                    className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 outline-none focus:border-emerald-500 focus:bg-white"
                  />
                  <span className="text-[10px] text-stone-400">छात्र खरीदने से पहले डेमो देख सकते हैं।</span>
                </div>
              </div>

              {/* 6. Cover Image & Presets */}
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <span>🖼️</span>
                    <span>कवर इमेज (Cover Image)</span>
                  </label>
                  {kitFormData.cover_image && (
                    <button
                      type="button"
                      onClick={() => setKitFormData({ ...kitFormData, cover_image: "" })}
                      className="text-[11px] text-rose-600 hover:underline font-bold"
                    >
                      हटाएं (Remove)
                    </button>
                  )}
                </div>

                {/* Custom Upload or Exam Logo */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <input
                    type="file"
                    ref={kitFileInputRef}
                    onChange={handleKitImageFileChange}
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => kitFileInputRef.current?.click()}
                    disabled={uploadingKitImage}
                    className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    📁 {uploadingKitImage ? "अपलोड हो रहा है..." : "कंप्यूटर से नई इमेज अपलोड करें"}
                  </button>
                  {currentExam?.logo_url && (
                    <button
                      type="button"
                      onClick={() => setKitFormData({ ...kitFormData, cover_image: currentExam.logo_url || "" })}
                      className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-medium transition cursor-pointer"
                    >
                      🏛️ परीक्षा लोगो लगाएं
                    </button>
                  )}
                  <input
                    type="text"
                    placeholder="या इमेज URL पेस्ट करें (/images/...)"
                    value={kitFormData.cover_image || ""}
                    onChange={(e) => setKitFormData({ ...kitFormData, cover_image: e.target.value })}
                    className="flex-1 min-w-[200px] text-xs bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-stone-900 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 7. Active Status Checkbox */}
              <div className="flex items-center gap-2.5 p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                <input
                  type="checkbox"
                  id="kitActiveCheck"
                  checked={kitFormData.is_active !== false}
                  onChange={(e) => setKitFormData({ ...kitFormData, is_active: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-stone-300 cursor-pointer"
                />
                <label htmlFor="kitActiveCheck" className="text-xs font-bold text-emerald-900 cursor-pointer">
                  यह किट / बुक तुरंत वेबसाइट पर लाइव (ON) रखें
                </label>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowKitModal(false)}
                  className="text-xs font-bold px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-200 transition-colors cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={savingKit || uploadingKitImage}
                  className="text-xs font-bold px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {savingKit ? "सुरक्षित हो रहा है..." : "💾 किट सुरक्षित करें (Save Kit)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 🎨 CATEGORY CARD & LOGO STYLING CUSTOMIZER MODAL          */}
      {/* ========================================================= */}
      {showCardStyleModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-stone-200 rounded-3xl shadow-2xl max-w-4xl w-full p-6 space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl shadow-inner">
                  🎨
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-stone-900">
                    होमपेज श्रेणी कार्ड व लोगो कस्टमाइज़र (Category Cards & Logo Style)
                  </h3>
                  <p className="text-xs text-stone-500">
                    होमपेज पर दिखने वाले श्रेणी (Category) कार्ड्स का लोगो साइज, आकार, पैडिंग व टेक्स्ट पोजीशन रियल-टाइम बदलें
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCardStyleModal(false)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 transition cursor-pointer text-base font-bold"
              >
                ✕
              </button>
            </div>

            {/* Split layout: Controls on Left, Live Preview on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN: Controls (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                {/* 1. Logo Size Slider */}
                <div className="bg-stone-50/80 border border-stone-200/80 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <span>📏 लोगो का आकार (Logo Size)</span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 font-bold px-1.5 py-0.5 rounded">
                        असीमित साइज (40px - 220px)
                      </span>
                    </label>
                    <span className="text-xs font-mono font-extrabold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300">
                      {cardStyle.logo_size}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="220"
                    step="2"
                    value={cardStyle.logo_size}
                    onChange={(e) =>
                      setCardStyle((prev) => ({ ...prev, logo_size: Number(e.target.value) }))
                    }
                    className="w-full accent-amber-600 cursor-pointer h-2 bg-stone-200 rounded-lg"
                  />
                  <div className="flex items-center justify-between text-[11px] text-stone-400">
                    <span>छोटा (40px)</span>
                    <span>मध्यम (100px)</span>
                    <span>विशाल (160px)</span>
                    <span>मैक्स (220px)</span>
                  </div>
                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {[
                      { label: "64px", size: 64 },
                      { label: "84px", size: 84 },
                      { label: "100px", size: 100 },
                      { label: "120px", size: 120 },
                      { label: "150px", size: 150 },
                      { label: "180px", size: 180 },
                      { label: "200px", size: 200 },
                    ].map((preset) => (
                      <button
                        key={preset.size}
                        type="button"
                        onClick={() =>
                          setCardStyle((prev) => ({ ...prev, logo_size: preset.size }))
                        }
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                          cardStyle.logo_size === preset.size
                            ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                            : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Double Border & Frame Controls (User Specific Request) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Inner Logo Border / Ring */}
                  <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-amber-950 flex items-center gap-1">
                        <span>⭕ लोगो आंतरिक बॉर्डर/रिंग</span>
                      </label>
                      <span className="text-[10px] text-amber-800 font-medium">
                        {!cardStyle.show_inner_border ? "✓ साफ (Clean)" : "बॉक्स सहित"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCardStyle((prev) => ({ ...prev, show_inner_border: false }))
                        }
                        className={`text-xs py-2 px-1.5 rounded-xl border font-bold transition cursor-pointer text-center ${
                          !cardStyle.show_inner_border
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                        }`}
                        title="लोगो के चारों ओर कोई अतिरिक्त पीला या ग्रे डिब्बा नहीं रहेगा, केवल आपका लोगो खुलकर दिखेगा"
                      >
                        🚫 बॉर्डर-रहित (Clean)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setCardStyle((prev) => ({ ...prev, show_inner_border: true }))
                        }
                        className={`text-xs py-2 px-1.5 rounded-xl border font-bold transition cursor-pointer text-center ${
                          cardStyle.show_inner_border
                            ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                            : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                        }`}
                      >
                        🔲 बॉर्डर रिंग दिखाएं
                      </button>
                    </div>
                    <p className="text-[10px] text-stone-500">
                      *बॉर्डर-रहित चुनने पर डबल-बॉर्डर हट जाता है और लोगो बड़ा दिखता है।
                    </p>
                  </div>

                  {/* Outer Card Border */}
                  <div className="bg-stone-50/80 border border-stone-200/80 rounded-2xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-stone-800 flex items-center gap-1">
                        <span>🔲 कार्ड का बाहरी बॉर्डर</span>
                      </label>
                      <span className="text-[10px] text-stone-500 font-medium">
                        {cardStyle.show_card_border ? "बॉर्डर ऑन" : "पूरा बॉर्डर-लेस"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCardStyle((prev) => ({ ...prev, show_card_border: true }))
                        }
                        className={`text-xs py-2 px-1.5 rounded-xl border font-bold transition cursor-pointer text-center ${
                          cardStyle.show_card_border
                            ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                            : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                        }`}
                      >
                        ✓ कार्ड बॉर्डर ऑन
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setCardStyle((prev) => ({ ...prev, show_card_border: false }))
                        }
                        className={`text-xs py-2 px-1.5 rounded-xl border font-bold transition cursor-pointer text-center ${
                          !cardStyle.show_card_border
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                        }`}
                        title="कार्ड का बाहरी बॉर्डर भी हट जाएगा, केवल हल्की आधुनिक शैडो दिखेगी"
                      >
                        🚫 पूरा बॉर्डर-लेस
                      </button>
                    </div>
                    <p className="text-[10px] text-stone-500">
                      *पूरा बॉर्डर-लेस करने पर कार्ड बिना लाइन के मॉडर्न शैडो में दिखता है।
                    </p>
                  </div>
                </div>

                {/* 3. Distance / Gap between Logo & Text */}
                <div className="bg-stone-50/80 border border-stone-200/80 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <span>↕️ लोगो और टेक्स्ट के बीच दूरी (Spacing / Gap)</span>
                    </label>
                    <span className="text-xs font-mono font-extrabold bg-stone-200 text-stone-800 px-2.5 py-0.5 rounded-md">
                      {cardStyle.text_gap}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="32"
                    step="1"
                    value={cardStyle.text_gap}
                    onChange={(e) =>
                      setCardStyle((prev) => ({ ...prev, text_gap: Number(e.target.value) }))
                    }
                    className="w-full accent-amber-600 cursor-pointer h-2 bg-stone-200 rounded-lg"
                  />
                  <div className="flex items-center justify-between text-[11px] text-stone-400">
                    <span>सटा हुआ (0px)</span>
                    <span>नजदीक (4px)</span>
                    <span>सामान्य (8px)</span>
                    <span>अधिक दूरी (16px+)</span>
                  </div>
                  {/* Gap Quick Presets */}
                  <div className="flex items-center gap-2 pt-1">
                    {[
                      { label: "0px (चिपका हुआ)", gap: 0 },
                      { label: "4px (नजदीक)", gap: 4 },
                      { label: "8px (डिफ़ॉल्ट)", gap: 8 },
                      { label: "14px (खुला)", gap: 14 },
                      { label: "20px (अधिक दूर)", gap: 20 },
                    ].map((gp) => (
                      <button
                        key={gp.gap}
                        type="button"
                        onClick={() => setCardStyle((prev) => ({ ...prev, text_gap: gp.gap }))}
                        className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition cursor-pointer ${
                          cardStyle.text_gap === gp.gap
                            ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                            : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                        }`}
                      >
                        {gp.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Logo Shape Selector */}
                <div className="bg-stone-50/80 border border-stone-200/80 rounded-2xl p-4 space-y-2.5">
                  <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <span>🔷 लोगो का कट/आकार (Logo Shape)</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "circle", label: "⭕ गोल (Circle)", sub: "rounded-full" },
                      { id: "rounded-2xl", label: "🔲 राउंडेड 2XL", sub: "rounded-2xl" },
                      { id: "rounded-xl", label: "◽ राउंडेड XL", sub: "rounded-xl" },
                      { id: "square", label: "⬛ चौकोर (Square)", sub: "rounded-none" },
                    ].map((shape) => (
                      <button
                        key={shape.id}
                        type="button"
                        onClick={() =>
                          setCardStyle((prev) => ({ ...prev, logo_shape: shape.id as any }))
                        }
                        className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                          cardStyle.logo_shape === shape.id
                            ? "bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 text-amber-950 font-extrabold"
                            : "bg-white border-stone-200 text-stone-700 hover:bg-stone-100 font-medium"
                        }`}
                      >
                        <span className="text-xs">{shape.label}</span>
                        <span className="text-[10px] text-stone-400 font-mono">{shape.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Inner Container Padding */}
                <div className="bg-stone-50/80 border border-stone-200/80 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <span>🔳 लोगो इनर पैडिंग (Padding)</span>
                      <span className="text-[10px] text-stone-400 font-normal">
                        (0px पर इमेज पूरी चौड़ाई में बिना कटे फैलेगी)
                      </span>
                    </label>
                    <span className="text-xs font-mono font-extrabold bg-stone-200 text-stone-800 px-2 py-0.5 rounded-md">
                      {cardStyle.container_padding}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={cardStyle.container_padding}
                    onChange={(e) =>
                      setCardStyle((prev) => ({ ...prev, container_padding: Number(e.target.value) }))
                    }
                    className="w-full accent-amber-600 cursor-pointer h-2 bg-stone-200 rounded-lg"
                  />
                  <div className="flex items-center justify-between text-[11px] text-stone-400">
                    <span>0px (इमेज पूरी फैलेगी - अनुशंसित)</span>
                    <span>4px</span>
                    <span>12px</span>
                    <span>20px</span>
                  </div>
                </div>

                {/* 6. Text Position & Text Size Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Text Position */}
                  <div className="bg-stone-50/80 border border-stone-200/80 rounded-2xl p-3.5 space-y-2">
                    <label className="text-xs font-bold text-stone-800">
                      📝 टेक्स्ट की स्थिति (Text Position)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "below", label: "⬇️ नीचे (Below)" },
                        { id: "above", label: "⬆️ ऊपर (Above)" },
                      ].map((pos) => (
                        <button
                          key={pos.id}
                          type="button"
                          onClick={() =>
                            setCardStyle((prev) => ({ ...prev, text_position: pos.id as any }))
                          }
                          className={`text-xs py-2 px-2 rounded-xl border font-bold transition cursor-pointer text-center ${
                            cardStyle.text_position === pos.id
                              ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                              : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                          }`}
                        >
                          {pos.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Text Size */}
                  <div className="bg-stone-50/80 border border-stone-200/80 rounded-2xl p-3.5 space-y-2">
                    <label className="text-xs font-bold text-stone-800">
                      🔤 टेक्स्ट का आकार (Text Size)
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: "xs", label: "छोटा (XS)" },
                        { id: "sm", label: "मध्यम (SM)" },
                        { id: "base", label: "बड़ा (Base)" },
                      ].map((ts) => (
                        <button
                          key={ts.id}
                          type="button"
                          onClick={() =>
                            setCardStyle((prev) => ({ ...prev, text_size: ts.id as any }))
                          }
                          className={`text-xs py-2 px-1 rounded-xl border font-bold transition cursor-pointer text-center ${
                            cardStyle.text_size === ts.id
                              ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                              : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                          }`}
                        >
                          {ts.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 7. Exam Count Badge & Card Radius */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Exam Count Badge */}
                  <div className="bg-stone-50/80 border border-stone-200/80 rounded-2xl p-3.5 space-y-2">
                    <label className="text-xs font-bold text-stone-800">
                      🏷️ परीक्षा संख्या बैज (Exam Badge)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCardStyle((prev) => ({ ...prev, show_exam_count: true }))
                        }
                        className={`text-xs py-2 px-2 rounded-xl border font-bold transition cursor-pointer text-center ${
                          cardStyle.show_exam_count
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                        }`}
                      >
                        ✓ दिखाएं
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setCardStyle((prev) => ({ ...prev, show_exam_count: false }))
                        }
                        className={`text-xs py-2 px-2 rounded-xl border font-bold transition cursor-pointer text-center ${
                          !cardStyle.show_exam_count
                            ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                            : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                        }`}
                      >
                        ✕ छुपाएं
                      </button>
                    </div>
                  </div>

                  {/* Card Border Radius */}
                  <div className="bg-stone-50/80 border border-stone-200/80 rounded-2xl p-3.5 space-y-2">
                    <label className="text-xs font-bold text-stone-800">
                      📐 कार्ड के कोने (Card Radius)
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: "rounded-xl", label: "XL" },
                        { id: "rounded-2xl", label: "2XL" },
                        { id: "rounded-3xl", label: "3XL" },
                      ].map((cr) => (
                        <button
                          key={cr.id}
                          type="button"
                          onClick={() =>
                            setCardStyle((prev) => ({ ...prev, card_border_radius: cr.id as any }))
                          }
                          className={`text-xs py-2 px-1 rounded-xl border font-bold transition cursor-pointer text-center ${
                            cardStyle.card_border_radius === cr.id
                              ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                              : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                          }`}
                        >
                          {cr.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Live Interactive Preview (5 cols) */}
              <div className="lg:col-span-5 flex flex-col">
                <div className="bg-stone-900 text-stone-100 rounded-3xl p-5 flex-1 flex flex-col justify-between border border-stone-800 shadow-xl space-y-4">
                  <div>
                    <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-bold tracking-wider uppercase text-emerald-400">
                          लाइव होमपेज प्रिव्यू (Live Preview)
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {cardStyle.logo_size}px • {cardStyle.show_inner_border ? "Bordered" : "Borderless"}
                      </span>
                    </div>

                    <p className="text-xs text-stone-400 mb-4">
                      होमपेज पर यूज़र को यह कार्ड्स बिल्कुल ऐसे ही दिखाई देंगे:
                    </p>

                    {/* Preview Cards Grid */}
                    <div className="grid grid-cols-2 gap-3.5">
                      {(categories.length > 0 ? categories.slice(0, 2) : [
                        { id: "rajasthan", name: "राजस्थान (Rajasthan State)", icon: "🚩", logo_url: "/images/categories/rajasthan_category_logo.jpg", boards: [1, 2, 3] },
                        { id: "ssc", name: "कर्मचारी चयन आयोग (SSC National)", icon: "🏛️", logo_url: "/images/categories/ssc_category_logo.jpg", boards: [1, 2] },
                      ]).map((cat) => {
                        const previewShapeClass =
                          cardStyle.logo_shape === "square"
                            ? "rounded-none"
                            : cardStyle.logo_shape === "rounded-xl"
                            ? "rounded-xl"
                            : cardStyle.logo_shape === "rounded-2xl"
                            ? "rounded-2xl"
                            : "rounded-full";

                        const previewTextClass =
                          cardStyle.text_size === "base"
                            ? "text-sm font-extrabold"
                            : cardStyle.text_size === "sm"
                            ? "text-xs font-bold"
                            : "text-[11px] font-bold";

                        const examsCount =
                          (cat.boards || []).reduce((acc: number, b: any) => acc + ((b.exams || []).length || 1), 0) || 3;

                        return (
                          <div
                            key={cat.id}
                            className={`bg-white text-stone-900 p-3.5 transition-all flex flex-col items-center text-center ${
                              cardStyle.show_card_border
                                ? "border border-stone-200 shadow-sm"
                                : "border-0 shadow-lg bg-stone-50/80"
                            } ${cardStyle.card_border_radius || "rounded-2xl"}`}
                          >
                            {/* Text above logo if configured */}
                            {cardStyle.text_position === "above" && (
                              <div
                                style={{ marginBottom: `${cardStyle.text_gap}px` }}
                                className="text-center"
                              >
                                <p className={`${previewTextClass} line-clamp-1`}>{cat.name}</p>
                                {cardStyle.show_exam_count && (
                                  <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-full mt-0.5 inline-block">
                                    {examsCount}+ Exams
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Logo / Badge */}
                            <div
                              style={{
                                width: `${cardStyle.logo_size}px`,
                                height: `${cardStyle.logo_size}px`,
                                padding: `${cardStyle.container_padding}px`,
                                marginBottom: cardStyle.text_position !== "above" ? `${cardStyle.text_gap}px` : undefined,
                              }}
                              className={`flex items-center justify-center shrink-0 overflow-hidden transition-all ${previewShapeClass} ${
                                cardStyle.show_inner_border
                                  ? "bg-amber-50 border border-amber-200/80 shadow-xs"
                                  : "bg-transparent border-0 shadow-none"
                              }`}
                            >
                              {cat.logo_url ? (
                                <img
                                  src={cat.logo_url}
                                  alt={cat.name}
                                  className={`w-full h-full object-contain transition-all ${previewShapeClass}`}
                                />
                              ) : (
                                <span style={{ fontSize: `${Math.max(20, Math.floor(cardStyle.logo_size * 0.45))}px` }}>
                                  {cat.icon || "📁"}
                                </span>
                              )}
                            </div>

                            {/* Text below logo if configured */}
                            {cardStyle.text_position !== "above" && (
                              <div className="text-center">
                                <p className={`${previewTextClass} line-clamp-1`}>{cat.name}</p>
                                {cardStyle.show_exam_count && (
                                  <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-full mt-0.5 inline-block">
                                    {examsCount}+ Exams
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick Tip Box */}
                  <div className="bg-stone-800/80 border border-stone-700/60 rounded-2xl p-3 text-[11px] text-stone-300">
                    💡 <span className="font-bold text-amber-300">सलाह:</span> <span className="text-white font-bold">🚫 बॉर्डर-रहित</span> चुनने पर लोगो के चारों ओर का अतिरिक्त घेरा/डिब्बा हट जाता है और लोगो स्क्रीन पर बहुत बड़ा और आकर्षक दिखाई देता है।
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() =>
                  setCardStyle({
                    logo_size: 100,
                    logo_shape: "circle",
                    container_padding: 0,
                    show_inner_border: false,
                    show_card_border: true,
                    text_gap: 6,
                    text_position: "below",
                    text_size: "xs",
                    show_exam_count: true,
                    card_border_radius: "rounded-2xl",
                  })
                }
                className="text-xs font-bold text-stone-500 hover:text-stone-800 hover:bg-stone-100 px-3 py-2 rounded-xl transition cursor-pointer"
              >
                🔄 डिफ़ॉल्ट रीसेट करें (Reset Default)
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCardStyleModal(false)}
                  className="text-xs font-bold px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 transition cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  onClick={handleSaveCardStyle}
                  disabled={savingCardStyle}
                  className="text-xs font-bold px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {savingCardStyle ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>सुरक्षित हो रहा है...</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>स्टाइल सुरक्षित करें (Save Style)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
