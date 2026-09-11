"use client";

import { useState, useEffect, startTransition, useMemo } from "react";

interface Course {
  id: string;
  exam_id: string;
  title: string;
  slug: string;
  badge: string;
  short_description: string;
  original_price: number;
  price: number;
  discount_percent: number;
  highlights: string[];
  subjects: string[];
  syllabus_preview: { subject: string; chapters: string[] }[];
  pages_count: string;
  format: string;
  language: string;
  cover_image: string;
  show_in_slider: boolean;
  slider_tagline: string;
  sample_pdf_url: string;
  drive_url: string;
  rating: number;
  rating_count: string;
  is_active: boolean;
  is_featured?: boolean;
  featured_priority?: number;
  is_new_arrival?: boolean;
  new_arrival_priority?: number;
  is_auto_synced?: boolean;
  priority: number;
  created_at?: string;
  updated_at?: string;
}

interface Exam {
  id: string;
  name: string;
  short_name: string;
  logo_url?: string;
  board?: string;
  category_name?: string;
  is_active?: boolean;
}

interface CoursesTabProps {
  getAuthHeaders: () => Record<string, string>;
}

export default function CoursesTab({ getAuthHeaders }: CoursesTabProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [examSearchFilter, setExamSearchFilter] = useState("");

  const [formData, setFormData] = useState<Partial<Course>>({
    exam_id: "",
    title: "",
    slug: "",
    badge: "Complete Selection Kit",
    short_description: "",
    original_price: 999,
    price: 199,
    highlights: [],
    subjects: [],
    syllabus_preview: [],
    pages_count: "1,250+ Pages",
    format: "Printable PDF",
    language: "Hindi",
    cover_image: "",
    show_in_slider: false,
    slider_tagline: "",
    is_featured: false,
    featured_priority: 1,
    is_new_arrival: false,
    new_arrival_priority: 1,
    sample_pdf_url: "https://drive.google.com",
    drive_url: "https://drive.google.com",
    rating: 4.9,
    rating_count: "3,500+ छात्र",
    is_active: true,
    priority: 1,
  });

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"basic" | "content" | "delivery">("basic");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "custom" | "synced">("all");

  const PRESET_COVERS = [
    "/images/bundles/cet_bundle_3d.jpg",
    "/images/bundles/patwari_bundle_3d.jpg",
    "/images/bundles/police_bundle_3d.jpg",
    "/images/bundles/ssc_bundle_3d.jpg",
  ];

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
        const examsData = await examsRes.json();
        const list = Array.isArray(examsData) ? examsData : [];
        setExams(
          list.map((e: any) => ({
            id: e.id,
            name: e.name,
            short_name: e.short_name || e.name,
            logo_url: e.logo_url || "",
            board: e.board || "",
            category_name: e.category_name || "",
            is_active: e.is_active,
          }))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startTransition(() => {
      fetchData();
    });
  }, []);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const selectPresetCover = (url: string) => {
    if (formData.cover_image === url) {
      // Toggle off if already selected
      setFormData((prev) => ({ ...prev, cover_image: "" }));
      setCoverFile(null);
      setCoverPreview(null);
    } else {
      setFormData((prev) => ({ ...prev, cover_image: url }));
      setCoverFile(null);
      setCoverPreview(url);
    }
  };

  const removeCoverImage = () => {
    setFormData((prev) => ({ ...prev, cover_image: "" }));
    setCoverFile(null);
    setCoverPreview(null);
  };

  // Open modal for NEW course
  const openCreateModal = () => {
    setEditingCourse(null);
    const initialExam = exams[0];
    const defaultCover = initialExam?.logo_url || "";

    setFormData({
      exam_id: initialExam?.id || "",
      title: initialExam ? `${initialExam.name} - Complete Selection Kit` : "",
      slug: initialExam ? `exam-${initialExam.id}` : "",
      badge: "Complete Selection Kit",
      short_description: initialExam
        ? `${initialExam.name} (${initialExam.board || "Exam"}) हेतु 2026 नए सिलेबस पर आधारित सम्पूर्ण हस्तलिखित थ्योरी नोट्स, 3000+ MCQs और फुल मॉक टेस्ट पेपर्स।`
        : "",
      original_price: 999,
      price: 199,
      discount_percent: 80,
      highlights: [
        "सम्पूर्ण विषयवार हस्तलिखित थ्योरी नोट्स",
        "3000+ विषयवार वस्तुनिष्ठ प्रश्नोत्तर (MCQs) व्याख्या सहित",
        "5 फुल लेंथ मॉडल टेस्ट पेपर्स (ओरिजिनल परीक्षा पैटर्न पर)",
        "प्रिंट हेतु तैयार A4 साइज PDF फॉर्मेट",
      ],
      subjects: [
        initialExam ? `${initialExam.name} थ्योरी नोट्स एवं संपूर्ण सिलेबस` : "सामान्य ज्ञान एवं विषय नोट्स",
        "विषयवार वस्तुनिष्ठ प्रश्नोत्तर (MCQs)",
        "पिछले वर्षों के हल प्रश्न-पत्र (PYQs)",
        "मॉडल टेस्ट पेपर्स एवं अभ्यास प्रश्न",
      ],
      syllabus_preview: [],
      pages_count: "1,250+ Pages",
      format: "Printable PDF",
      language: "हिन्दी (Hindi)",
      cover_image: defaultCover,
      show_in_slider: false,
      slider_tagline: "सलेक्शन का पक्का साथी — 80% विशेष छूट",
      is_featured: false,
      featured_priority: 1,
      is_new_arrival: false,
      new_arrival_priority: 1,
      sample_pdf_url: "https://drive.google.com",
      drive_url: "https://drive.google.com",
      rating: 4.9,
      rating_count: "3,500+ छात्र",
      is_active: true,
      priority: courses.length + 1,
    });
    setCoverFile(null);
    setCoverPreview(defaultCover || null);
    setActiveTab("basic");
    setShowModal(true);
  };

  // Open modal for EDITING / CUSTOMIZING an existing or auto-synced course
  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      ...course,
      highlights: course.highlights?.length ? course.highlights : ["सम्पूर्ण हस्तलिखित थ्योरी नोट्स", "3000+ MCQs", "5 फुल मॉक टेस्ट"],
      subjects: course.subjects?.length ? course.subjects : [`${course.title} संपूर्ण सिलेबस`, "MCQs & PYQs"],
    });
    setCoverFile(null);
    setCoverPreview(course.cover_image || null);
    setActiveTab("basic");
    setShowModal(true);
  };

  // When exam is changed in dropdown, auto-fill details if appropriate
  const handleExamSelect = (examId: string) => {
    const selected = exams.find((e) => e.id === examId);
    if (!selected) return;

    setFormData((prev) => ({
      ...prev,
      exam_id: examId,
      title: `${selected.name} - Complete Selection Kit`,
      slug: `exam-${selected.id}`,
      short_description: `${selected.name} (${selected.board || "Exam"}) हेतु 2026 नए सिलेबस पर आधारित सम्पूर्ण हस्तलिखित थ्योरी नोट्स, 3000+ MCQs और फुल मॉक टेस्ट पेपर्स।`,
      cover_image: selected.logo_url || prev.cover_image || "",
      subjects: [
        `${selected.name} थ्योरी नोट्स एवं संपूर्ण सिलेबस`,
        "विषयवार वस्तुनिष्ठ प्रश्नोत्तर (MCQs)",
        "पिछले वर्षों के हल प्रश्न-पत्र (PYQs)",
        "मॉडल टेस्ट पेपर्स एवं अभ्यास प्रश्न",
      ],
    }));

    if (selected.logo_url) {
      setCoverPreview(selected.logo_url);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCourse(null);
    setCoverFile(null);
    setCoverPreview(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => {
        if (["highlights", "subjects", "syllabus_preview"].includes(k)) {
          fd.append(k, JSON.stringify(v || []));
        } else if (v !== undefined && v !== null) {
          fd.append(k, String(v));
        }
      });
      if (coverFile) fd.append("cover", coverFile);

      // If editing an existing course or auto-synced exam
      const targetId = editingCourse ? editingCourse.id : (formData.slug || `course-${Date.now()}`);
      const url = editingCourse ? `/api/admin/courses/${targetId}` : "/api/admin/courses";

      const res = await fetch(url, {
        method: editingCourse ? "PUT" : "POST",
        headers: { Authorization: getAuthHeaders().Authorization },
        body: fd,
      });

      if (res.ok) {
        setMessage({
          type: "success",
          text: editingCourse ? "कोर्स सफलतापूर्वक अपडेट हो गया!" : "नया कोर्स सफलतापूर्वक बन गया!",
        });
        fetchData();
        closeModal();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "सेव करने में त्रुटि हुई" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("क्या आप वाकई इस कोर्स को डिलीट करना चाहते हैं?")) return;
    try {
      await fetch(`/api/admin/courses/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      fetchData();
      setMessage({ type: "success", text: "कोर्स डिलीट कर दिया गया" });
    } catch {
      setMessage({ type: "error", text: "डिलीट करने में त्रुटि" });
    }
  };

  const handleToggleActive = async (course: Course) => {
    try {
      const res = await fetch(`/api/admin/courses/${course.id}`, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !course.is_active }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch {
      console.error("Toggle failed");
    }
  };

  // Dynamic highlight helpers
  const addHighlight = () => setFormData({ ...formData, highlights: [...(formData.highlights || []), ""] });
  const removeHighlight = (idx: number) =>
    setFormData({ ...formData, highlights: (formData.highlights || []).filter((_, i) => i !== idx) });
  const updateHighlight = (idx: number, val: string) =>
    setFormData({
      ...formData,
      highlights: (formData.highlights || []).map((h, i) => (i === idx ? val : h)),
    });

  // Dynamic subject helpers
  const addSubject = () => setFormData({ ...formData, subjects: [...(formData.subjects || []), ""] });
  const removeSubject = (idx: number) =>
    setFormData({ ...formData, subjects: (formData.subjects || []).filter((_, i) => i !== idx) });
  const updateSubject = (idx: number, val: string) =>
    setFormData({
      ...formData,
      subjects: (formData.subjects || []).map((s, i) => (i === idx ? val : s)),
    });

  // Dynamic syllabus helpers
  const addSyllabusSection = () =>
    setFormData({
      ...formData,
      syllabus_preview: [...(formData.syllabus_preview || []), { subject: "", chapters: [""] }],
    });
  const removeSyllabusSection = (idx: number) =>
    setFormData({
      ...formData,
      syllabus_preview: (formData.syllabus_preview || []).filter((_, i) => i !== idx),
    });
  const updateSyllabusSubject = (idx: number, val: string) =>
    setFormData({
      ...formData,
      syllabus_preview: (formData.syllabus_preview || []).map((s, i) => (i === idx ? { ...s, subject: val } : s)),
    });
  const addChapter = (sIdx: number) =>
    setFormData({
      ...formData,
      syllabus_preview: (formData.syllabus_preview || []).map((s, i) =>
        i === sIdx ? { ...s, chapters: [...s.chapters, ""] } : s
      ),
    });
  const removeChapter = (sIdx: number, cIdx: number) =>
    setFormData({
      ...formData,
      syllabus_preview: (formData.syllabus_preview || []).map((s, i) =>
        i === sIdx ? { ...s, chapters: s.chapters.filter((_, ci) => ci !== cIdx) } : s
      ),
    });
  const updateChapter = (sIdx: number, cIdx: number, val: string) =>
    setFormData({
      ...formData,
      syllabus_preview: (formData.syllabus_preview || []).map((s, i) =>
        i === sIdx ? { ...s, chapters: s.chapters.map((c, ci) => (ci === cIdx ? val : c)) } : s
      ),
    });

  const getExamName = (examId: string) => {
    const found = exams.find((e) => e.id === examId || `exam-${e.id}` === examId);
    return found ? `${found.name} (${found.board || ""})` : examId;
  };

  // Filtered exams for modal dropdown
  const filteredExamsForModal = useMemo(() => {
    if (!examSearchFilter.trim()) return exams;
    const q = examSearchFilter.toLowerCase();
    return exams.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.short_name.toLowerCase().includes(q) ||
        (e.board && e.board.toLowerCase().includes(q)) ||
        (e.category_name && e.category_name.toLowerCase().includes(q))
    );
  }, [exams, examSearchFilter]);

  const filteredCourses = courses
    .filter((c) => {
      if (filterType === "custom" && c.is_auto_synced) return false;
      if (filterType === "synced" && !c.is_auto_synced) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        (c.badge && c.badge.toLowerCase().includes(q)) ||
        getExamName(c.exam_id).toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (a.priority || 0) - (b.priority || 0));

  const customCount = courses.filter((c) => !c.is_auto_synced).length;
  const syncedCount = courses.filter((c) => c.is_auto_synced).length;

  if (loading)
    return (
      <div className="py-20 text-center text-stone-500 bg-white rounded-2xl border border-stone-200">
        <div className="w-8 h-8 border-3 border-amber-600/30 border-t-amber-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-stone-700">कोर्सेज़ एवं सिलेक्शन किट्स लोड हो रहे हैं...</p>
      </div>
    );

  return (
    <div className="space-y-5">
      {/* Header & Main Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-stone-200 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📚</span>
            <h2 className="text-lg sm:text-xl font-black text-stone-900">
              कोर्सेज़ एवं सिलेक्शन किट्स (Courses Management)
            </h2>
          </div>
          <p className="text-stone-500 text-xs mt-1">
            यहाँ से आप किसी भी परीक्षा के नोट्स, कीमत, PDF लिंक व सिलेबस को लाइव जोड़ और कस्टमाइज़ कर सकते हैं।
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="self-start sm:self-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer active:scale-98"
        >
          <span className="text-base">+</span>
          नया कोर्स / किट जोड़ें (Add Course)
        </button>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              filterType === "all" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            सभी ({courses.length})
          </button>
          <button
            onClick={() => setFilterType("synced")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              filterType === "synced" ? "bg-white text-indigo-700 shadow-xs" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            ⚡ परीक्षा से स्वतः जुड़े ({syncedCount})
          </button>
          <button
            onClick={() => setFilterType("custom")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              filterType === "custom" ? "bg-white text-amber-800 shadow-xs" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            ⭐ कस्टम बंडल्स ({customCount})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="कोर्स या परीक्षा खोजें..."
            className="w-full px-4 py-2 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-600 focus:outline-none text-xs shadow-2xs"
          />
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <table className="w-full text-left">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 text-[11px] font-bold uppercase tracking-wider">
            <tr>
              <th className="p-4">कोर्स व किट</th>
              <th className="p-4">संबद्ध परीक्षा (Exam)</th>
              <th className="p-4 text-center">प्रकार</th>
              <th className="p-4 text-right">कीमत</th>
              <th className="p-4 text-center">होमपेज</th>
              <th className="p-4 text-center">स्थिति</th>
              <th className="p-4 text-right">एक्शन</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-xs">
            {filteredCourses.map((course) => (
              <tr key={course.id} className="hover:bg-amber-50/20 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {course.cover_image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={course.cover_image}
                        alt=""
                        className="w-12 h-14 rounded-lg object-cover border border-stone-200 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-extrabold text-stone-900 text-xs truncate max-w-xs">{course.title}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        <span className="text-[10px] text-stone-500 font-medium">{course.badge}</span>
                        {course.is_featured && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800">
                            🔥 फीचर्ड #{course.featured_priority || 1}
                          </span>
                        )}
                        {course.is_new_arrival && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-800">
                            ✨ न्यू अराइवल #{course.new_arrival_priority || 1}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="p-4 text-stone-700 font-bold max-w-xs truncate">{getExamName(course.exam_id)}</td>

                <td className="p-4 text-center">
                  {course.is_auto_synced ? (
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      ⚡ परीक्षा से स्वतः
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      ⭐ कस्टम
                    </span>
                  )}
                </td>

                <td className="p-4 text-right">
                  <p className="font-black text-stone-900">₹{course.price}</p>
                  <p className="text-[10px] text-stone-400 line-through">₹{course.original_price}</p>
                </td>

                <td className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1 flex-wrap">
                    {course.show_in_slider && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        स्लाइडर
                      </span>
                    )}
                    {course.is_featured && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        फीचर्ड
                      </span>
                    )}
                    {!course.show_in_slider && !course.is_featured && !course.is_new_arrival && (
                      <span className="text-stone-400 text-[11px]">—</span>
                    )}
                  </div>
                </td>

                <td className="p-4 text-center">
                  <button
                    onClick={() => handleToggleActive(course)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition ${
                      course.is_active
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-stone-100 text-stone-500 border border-stone-200"
                    }`}
                  >
                    {course.is_active ? "● लाइव (ON)" : "○ बंद (OFF)"}
                  </button>
                </td>

                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => openEditModal(course)}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      कस्टमाइज़ ✏️
                    </button>
                    {!course.is_auto_synced && (
                      <button
                        onClick={() => handleDelete(course.id)}
                        className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                      >
                        हटाएं
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredCourses.length === 0 && (
          <div className="p-12 text-center text-stone-400 text-xs bg-white">कोई कोर्स नहीं मिला।</div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="grid grid-cols-1 gap-3 lg:hidden">
        {filteredCourses.map((course) => (
          <div key={course.id} className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex items-start gap-3">
              {course.cover_image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={course.cover_image} alt="" className="w-14 h-16 rounded-xl object-cover border border-stone-200" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-black text-stone-900 text-sm line-clamp-2 leading-tight">{course.title}</p>
                <p className="text-xs text-stone-500 mt-0.5 truncate">{getExamName(course.exam_id)}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {course.is_auto_synced ? (
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700">
                      ⚡ ऑटो-सिंक
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-800">
                      ⭐ कस्टम
                    </span>
                  )}
                  <span className="text-xs font-black text-stone-900">₹{course.price}</span>
                  <span className="text-[10px] text-stone-400 line-through">₹{course.original_price}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-stone-100 gap-2">
              <button
                onClick={() => handleToggleActive(course)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  course.is_active ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"
                }`}
              >
                {course.is_active ? "● लाइव (ON)" : "○ बंद"}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(course)}
                  className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold"
                >
                  कस्टमाइज़ ✏️
                </button>
                {!course.is_auto_synced && (
                  <button
                    onClick={() => handleDelete(course.id)}
                    className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold"
                  >
                    हटाएं
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FULL CUSTOMIZER MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={closeModal} />
          <div className="relative bg-white border border-stone-200 rounded-t-3xl sm:rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden z-10 flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 sm:p-5 border-b border-stone-200 bg-stone-50 flex-wrap gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-stone-900">
                  {editingCourse ? `कोर्स कस्टमाइज़ करें: ${editingCourse.title}` : "नया कोर्स / सिलेक्शन किट बनाएं"}
                </h3>
                <div className="flex gap-1 bg-stone-200/70 rounded-xl p-1">
                  {(["basic", "content", "delivery"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setActiveTab(t)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                        activeTab === t ? "bg-amber-600 text-white shadow-xs" : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      {t === "basic" ? "1. बेसिक व कीमत" : t === "content" ? "2. विषय व सिलेबस" : "3. PDF लिंक्स व फोटो"}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-lg hover:bg-stone-200 text-stone-500 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {activeTab === "basic" && (
                <div className="space-y-4">
                  {/* Exam Selector with Search */}
                  <div className="bg-amber-50/50 border border-amber-200 p-3.5 rounded-xl space-y-2">
                    <label className="block text-xs font-black text-amber-900">
                      📌 किस परीक्षा के लिए यह कोर्स बना रहे हैं? (Select Exam) *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="परीक्षा का नाम सर्च करें..."
                        value={examSearchFilter}
                        onChange={(e) => setExamSearchFilter(e.target.value)}
                        className="px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white"
                      />
                      <select
                        value={formData.exam_id || ""}
                        onChange={(e) => handleExamSelect(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-stone-900 text-xs font-bold"
                      >
                        <option value="">-- परीक्षा चुनें ({exams.length} परीक्षाएं उपलब्ध) --</option>
                        {filteredExamsForModal.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name} {e.board ? `(${e.board})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">कोर्स का शीर्षक (Title) *</label>
                    <input
                      type="text"
                      value={formData.title || ""}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      placeholder="उदा. Rajasthan CET 2026 - Complete Selection Kit"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-600 focus:outline-none text-xs font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">URL Slug</label>
                      <input
                        type="text"
                        value={formData.slug || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-600 focus:outline-none text-xs"
                        placeholder="auto-generated"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">बैज (Badge)</label>
                      <input
                        type="text"
                        value={formData.badge || "Complete Selection Kit"}
                        onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-600 focus:outline-none text-xs font-semibold"
                      />
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="grid grid-cols-3 gap-3 p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">असली कीमत (MRP ₹)</label>
                      <input
                        type="number"
                        value={formData.original_price || 999}
                        onChange={(e) => setFormData({ ...formData, original_price: Number(e.target.value) })}
                        min={0}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-stone-900 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-amber-800 mb-1">सेल कीमत (Selling ₹)</label>
                      <input
                        type="number"
                        value={formData.price || 199}
                        onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                        min={0}
                        className="w-full px-3 py-2 rounded-lg border border-amber-400 bg-white text-amber-900 text-xs font-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-emerald-800 mb-1">छूट (Discount %)</label>
                      <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black">
                        {formData.original_price && formData.price
                          ? `${Math.round((1 - formData.price / formData.original_price) * 100)}% OFF`
                          : "0%"}
                      </div>
                    </div>
                  </div>

                  {/* Promotion Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.is_featured || false}
                          onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                          className="w-4 h-4 rounded text-amber-600"
                        />
                        <span className="text-xs font-bold text-stone-900">🔥 होमपेज फीचर्ड में दिखाएं</span>
                      </label>
                      {formData.is_featured && (
                        <div className="flex items-center gap-2 pl-6">
                          <span className="text-[11px] text-stone-500">प्राथमिकता क्रम:</span>
                          <input
                            type="number"
                            value={formData.featured_priority || 1}
                            onChange={(e) => setFormData({ ...formData, featured_priority: Number(e.target.value) })}
                            min={1}
                            className="w-16 px-2 py-1 text-xs border border-stone-300 rounded bg-white font-bold"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.is_new_arrival || false}
                          onChange={(e) => setFormData({ ...formData, is_new_arrival: e.target.checked })}
                          className="w-4 h-4 rounded text-amber-600"
                        />
                        <span className="text-xs font-bold text-stone-900">✨ न्यू अराइवल्स में दिखाएं</span>
                      </label>
                      {formData.is_new_arrival && (
                        <div className="flex items-center gap-2 pl-6">
                          <span className="text-[11px] text-stone-500">प्राथमिकता क्रम:</span>
                          <input
                            type="number"
                            value={formData.new_arrival_priority || 1}
                            onChange={(e) => setFormData({ ...formData, new_arrival_priority: Number(e.target.value) })}
                            min={1}
                            className="w-16 px-2 py-1 text-xs border border-stone-300 rounded bg-white font-bold"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Slider toggle */}
                  <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.show_in_slider || false}
                        onChange={(e) => setFormData({ ...formData, show_in_slider: e.target.checked })}
                        className="w-4 h-4 rounded text-amber-600"
                      />
                      <span className="text-xs font-bold text-stone-900">🖼️ होमपेज टॉप हीरो स्लाइडर में शामिल करें</span>
                    </label>
                    {formData.show_in_slider && (
                      <input
                        type="text"
                        value={formData.slider_tagline || ""}
                        onChange={(e) => setFormData({ ...formData, slider_tagline: e.target.value })}
                        placeholder="स्लाइडर टैगलाइन (उदा. सलेक्शन का पक्का साथी — 80% छूट)"
                        className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white"
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-xs font-bold text-stone-800">लाइव स्थिति (Active)</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_active !== false}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-4 h-4 rounded text-emerald-600"
                      />
                      <span className="text-xs font-bold text-emerald-700">सक्रिय (Live on Website)</span>
                    </label>
                  </div>
                </div>
              )}

              {activeTab === "content" && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">संक्षिप्त विवरण (Short Description)</label>
                    <textarea
                      value={formData.short_description || ""}
                      onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                      rows={2}
                      className="w-full px-3.5 py-2 rounded-xl border border-stone-300 bg-white text-stone-900 text-xs"
                      placeholder="कोर्स के मुख्य लाभ व नोट्स की जानकारी..."
                    />
                  </div>

                  {/* Highlights */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-stone-800">मुख्य विशेषताएं (Key Highlights)</label>
                      <button
                        type="button"
                        onClick={addHighlight}
                        className="px-2.5 py-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg font-bold cursor-pointer"
                      >
                        + नया जोड़ें
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(formData.highlights || []).map((h, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            type="text"
                            value={h}
                            onChange={(e) => updateHighlight(i, e.target.value)}
                            placeholder={`विशेषता #${i + 1}`}
                            className="flex-1 px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => removeHighlight(i)}
                            className="px-2.5 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Subjects */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-stone-800">शामिल विषय (Covered Subjects)</label>
                      <button
                        type="button"
                        onClick={addSubject}
                        className="px-2.5 py-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg font-bold cursor-pointer"
                      >
                        + नया विषय जोड़ें
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(formData.subjects || []).map((s, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            type="text"
                            value={s}
                            onChange={(e) => updateSubject(i, e.target.value)}
                            placeholder={`विषय #${i + 1}`}
                            className="flex-1 px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => removeSubject(i)}
                            className="px-2.5 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Syllabus */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-stone-800">विस्तृत सिलेबस पूर्वावलोकन (Syllabus Preview)</label>
                      <button
                        type="button"
                        onClick={addSyllabusSection}
                        className="px-2.5 py-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg font-bold cursor-pointer"
                      >
                        + सेक्शन जोड़ें
                      </button>
                    </div>
                    <div className="space-y-3">
                      {(formData.syllabus_preview || []).map((sec, si) => (
                        <div key={si} className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={sec.subject}
                              onChange={(e) => updateSyllabusSubject(si, e.target.value)}
                              placeholder="विषय का नाम (Subject Name)"
                              className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-xs font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => removeSyllabusSection(si)}
                              className="px-2.5 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold cursor-pointer"
                            >
                              सेक्शन हटाएं
                            </button>
                          </div>
                          <div className="space-y-1.5 pl-3 border-l-2 border-amber-300">
                            {sec.chapters.map((ch, ci) => (
                              <div key={ci} className="flex gap-2">
                                <input
                                  type="text"
                                  value={ch}
                                  onChange={(e) => updateChapter(si, ci, e.target.value)}
                                  placeholder={`अध्याय / टॉपिक #${ci + 1}`}
                                  className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeChapter(si, ci)}
                                  className="px-2 py-1 text-stone-400 hover:text-red-700 text-xs"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addChapter(si)}
                              className="text-[11px] font-bold text-amber-800 hover:underline cursor-pointer"
                            >
                              + टॉपिक जोड़ें
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "delivery" && (
                <div className="space-y-4">
                  {/* Delivery Links */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      📥 पूरे स्टडी मटेरियल का Google Drive Link *
                    </label>
                    <input
                      type="url"
                      value={formData.drive_url || ""}
                      onChange={(e) => setFormData({ ...formData, drive_url: e.target.value })}
                      placeholder="https://drive.google.com/..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-xs font-mono"
                    />
                    <p className="text-[10px] text-stone-400 mt-1">
                      यह लिंक छात्र को पेमेंट व UTR वेरीफाई होने के बाद WhatsApp / Gmail पर भेजा जाता है।
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      📄 फ्री सैंपल PDF लिंक (Sample PDF URL)
                    </label>
                    <input
                      type="url"
                      value={formData.sample_pdf_url || ""}
                      onChange={(e) => setFormData({ ...formData, sample_pdf_url: e.target.value })}
                      placeholder="https://drive.google.com/..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-xs font-mono"
                    />
                    <p className="text-[10px] text-stone-400 mt-1">
                      छात्र खरीदने से पहले इस लिंक से फ्री में 10-15 पेज सैंपल देख सकते हैं।
                    </p>
                  </div>

                  {/* Cover Image Upload & Customization */}
                  <div className="space-y-3 p-4 bg-stone-50 rounded-2xl border border-stone-200">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <label className="block text-xs font-bold text-stone-900">कवर फोटो (Cover Image)</label>
                        <p className="text-[11px] text-stone-500">
                          कोर्स कार्ड व डिटेल्स पेज पर दिखने वाली फोटो। खाली रखने पर ऑटो-ग्रेडिएंट कार्ड दिखेगा।
                        </p>
                      </div>
                      {(coverPreview || formData.cover_image) && (
                        <button
                          type="button"
                          onClick={removeCoverImage}
                          className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          🗑️ फोटो हटाएं (Remove Image)
                        </button>
                      )}
                    </div>

                    {/* Active Preview */}
                    {coverPreview ? (
                      <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-stone-200 shadow-xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={coverPreview}
                          alt="Cover Preview"
                          className="w-16 h-20 rounded-lg object-cover border border-stone-200 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-stone-800">चयनित कवर फोटो (Active)</p>
                          <p className="text-[10px] text-stone-500 truncate max-w-xs">
                            {formData.cover_image || "डिवाइस से कस्टम फाइल अपलोड की गई"}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <button
                              type="button"
                              onClick={removeCoverImage}
                              className="text-[11px] font-bold text-red-600 hover:text-red-800 cursor-pointer underline"
                            >
                              ✕ इसे हटाएं (No Photo)
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-center gap-2">
                        <span>✨</span>
                        <span>
                          वर्तमान में कोई फोटो नहीं चुनी गई है — वेबसाइट पर आकर्षक <strong>ऑटोमैटिक ग्रेडिएंट कार्ड</strong> दिखेगा (कोई ब्रोकन इमेज नहीं)।
                        </span>
                      </div>
                    )}

                    {/* Custom Upload or Custom URL */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">
                          1. डिवाइस से कस्टम फोटो अपलोड करें:
                        </label>
                        <label className="relative flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-stone-300 hover:border-amber-500 bg-white cursor-pointer text-xs font-bold text-stone-700 hover:text-amber-700 transition">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleCoverChange}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          <span>📁 फोटो चुनें (PNG / JPG / WEBP)</span>
                        </label>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">
                          2. या इमेज URL टाइप / पेस्ट करें:
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={formData.cover_image || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData({ ...formData, cover_image: val });
                              setCoverFile(null);
                              setCoverPreview(val || null);
                            }}
                            placeholder="https://... या /images/..."
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-stone-900 text-xs font-mono"
                          />
                          {formData.cover_image && (
                            <button
                              type="button"
                              onClick={removeCoverImage}
                              className="px-2.5 py-1 text-xs text-stone-500 hover:text-red-600 bg-white border border-stone-200 rounded-xl"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Exam Logo shortcut if exam has a logo */}
                    {(() => {
                      const examObj = exams.find((e) => e.id === formData.exam_id);
                      if (examObj?.logo_url && formData.cover_image !== examObj.logo_url) {
                        return (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, cover_image: examObj.logo_url || "" });
                                setCoverFile(null);
                                setCoverPreview(examObj.logo_url || null);
                              }}
                              className="text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5"
                            >
                              <span>📋</span>
                              <span>परीक्षा का लोगो उपयोग करें ({examObj.name})</span>
                            </button>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Optional 3D Presets */}
                    <div className="pt-2 border-t border-stone-200">
                      <p className="text-[11px] font-bold text-stone-600 mb-2">
                        3. सैंपल 3D मॉकअप्स (वैकल्पिक टेम्पलेट्स — क्लिक करके चुनें या हटाएं):
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {PRESET_COVERS.map((url) => {
                          const isSelected = formData.cover_image === url;
                          return (
                            <button
                              type="button"
                              key={url}
                              onClick={() => selectPresetCover(url)}
                              className={`relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition cursor-pointer ${
                                isSelected ? "border-amber-600 ring-2 ring-amber-200" : "border-stone-200 hover:border-stone-300"
                              }`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt="" className="object-cover w-full h-full" />
                              {isSelected && (
                                <div className="absolute inset-0 bg-amber-600/40 flex items-center justify-center text-white text-xs font-bold">
                                  ✓ चुना गया
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-200 bg-stone-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-white font-bold text-xs cursor-pointer"
              >
                रद्द करें (Cancel)
              </button>
              <button
                type="submit"
                disabled={saving}
                onClick={(e) => {
                  e.preventDefault();
                  const formEl = (e.currentTarget.closest(".relative") as HTMLElement)?.querySelector("form");
                  formEl?.requestSubmit();
                }}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {saving ? "सेव हो रहा है..." : editingCourse ? "अपडेट करें (Save Changes)" : "कोर्स बनाएं (Create Course)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
