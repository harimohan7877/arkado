"use client";

import { useState, useEffect, startTransition } from "react";

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
  priority: number;
  created_at: string;
  updated_at: string;
}

interface Exam {
  id: string;
  name: string;
  short_name: string;
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
  const [formData, setFormData] = useState<Partial<Course>>({
    exam_id: "",
    title: "",
    slug: "",
    badge: "Complete Kit",
    short_description: "",
    original_price: 999,
    price: 199,
    highlights: [],
    subjects: [],
    syllabus_preview: [],
    pages_count: "",
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
    rating_count: "0",
    is_active: true,
    priority: 1,
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"basic" | "content" | "delivery">("basic");
  const [search, setSearch] = useState("");

  const PRESET_COVERS = [
    "/images/bundles/cet_bundle_3d.jpg",
    "/images/bundles/patwari_bundle_3d.jpg",
    "/images/bundles/police_bundle_3d.jpg",
    "/images/bundles/ssc_bundle_3d.jpg",
  ];

  const fetchData = async () => {
    try {
      const [coursesRes, examsRes] = await Promise.all([
        fetch("/api/admin/courses", { headers: getAuthHeaders() }),
        fetch("/api/admin/exams", { headers: getAuthHeaders() }),
      ]);
      if (coursesRes.ok) setCourses(await coursesRes.json());
      if (examsRes.ok) {
        const examsData: Exam[] = await examsRes.json();
        setExams(examsData.map((e) => ({ id: e.id, name: e.name, short_name: e.short_name })));
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
    setFormData({ ...formData, cover_image: url });
    setCoverFile(null);
    setCoverPreview(url);
  };

  const openCreateModal = () => {
    setEditingCourse(null);
    setFormData({
      exam_id: exams[0]?.id || "",
      title: "",
      slug: "",
      badge: "Complete Kit",
      short_description: "",
      original_price: 999,
      price: 199,
      highlights: ["", "", ""],
      subjects: ["", "", ""],
      syllabus_preview: [],
      pages_count: "",
      format: "Printable PDF",
      language: "Hindi",
      cover_image: PRESET_COVERS[0],
      show_in_slider: false,
      slider_tagline: "",
      sample_pdf_url: "https://drive.google.com",
      drive_url: "https://drive.google.com",
      rating: 4.9,
      rating_count: "0",
      is_active: true,
      priority: courses.length + 1,
    });
    setCoverFile(null);
    setCoverPreview(PRESET_COVERS[0]);
    setActiveTab("basic");
    setShowModal(true);
  };

  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    setFormData({ ...course });
    setCoverFile(null);
    setCoverPreview(course.cover_image);
    setActiveTab("basic");
    setShowModal(true);
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
        if (["highlights", "subjects", "syllabus_preview"].includes(k)) fd.append(k, JSON.stringify(v || []));
        else if (v !== undefined && v !== null) fd.append(k, String(v));
      });
      if (coverFile) fd.append("cover", coverFile);

      const url = editingCourse ? `/api/admin/courses/${editingCourse.id}` : "/api/admin/courses";
      const res = await fetch(url, {
        method: editingCourse ? "PUT" : "POST",
        headers: { Authorization: getAuthHeaders().Authorization },
        body: fd,
      });

      if (res.ok) {
        setMessage({ type: "success", text: editingCourse ? "Course updated!" : "Course created!" });
        fetchData();
        closeModal();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this course?")) return;
    try {
      await fetch(`/api/admin/courses/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      fetchData();
      setMessage({ type: "success", text: "Course deleted" });
    } catch {
      setMessage({ type: "error", text: "Delete failed" });
    }
  };

  const handleToggleActive = async (course: Course) => {
    try {
      await fetch(`/api/admin/courses/${course.id}`, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !course.is_active }),
      });
      fetchData();
    } catch {
      console.error("Toggle failed");
    }
  };

  const addHighlight = () => setFormData({ ...formData, highlights: [...(formData.highlights || []), ""] });
  const removeHighlight = (idx: number) =>
    setFormData({ ...formData, highlights: (formData.highlights || []).filter((_, i) => i !== idx) });
  const updateHighlight = (idx: number, val: string) =>
    setFormData({
      ...formData,
      highlights: (formData.highlights || []).map((h, i) => (i === idx ? val : h)),
    });

  const addSubject = () => setFormData({ ...formData, subjects: [...(formData.subjects || []), ""] });
  const removeSubject = (idx: number) =>
    setFormData({ ...formData, subjects: (formData.subjects || []).filter((_, i) => i !== idx) });
  const updateSubject = (idx: number, val: string) =>
    setFormData({
      ...formData,
      subjects: (formData.subjects || []).map((s, i) => (i === idx ? val : s)),
    });

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
        i === sIdx ? { ...s, chapters: [...s.chapters, ""] } : s,
      ),
    });
  const removeChapter = (sIdx: number, cIdx: number) =>
    setFormData({
      ...formData,
      syllabus_preview: (formData.syllabus_preview || []).map((s, i) =>
        i === sIdx ? { ...s, chapters: s.chapters.filter((_, ci) => ci !== cIdx) } : s,
      ),
    });
  const updateChapter = (sIdx: number, cIdx: number, val: string) =>
    setFormData({
      ...formData,
      syllabus_preview: (formData.syllabus_preview || []).map((s, i) =>
        i === sIdx
          ? { ...s, chapters: s.chapters.map((c, ci) => (ci === cIdx ? val : c)) }
          : s,
      ),
    });

  if (loading)
    return (
      <div className="py-12 text-center text-stone-500 bg-white rounded-2xl border border-stone-200">
        Loading courses...
      </div>
    );

  const getExamName = (examId: string) => exams.find((e) => e.id === examId)?.name || examId;

  const filteredCourses = courses
    .filter((c) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.badge.toLowerCase().includes(q) ||
        getExamName(c.exam_id).toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a.priority - b.priority);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900">Courses</h2>
          <p className="text-stone-500 text-sm">Manage study material bundles: pricing, content, delivery links.</p>
        </div>
        <button onClick={openCreateModal} className="self-start sm:self-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl">
          + Add Course
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-xl border text-sm ${message.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-2xl p-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search courses..."
          className="w-full px-4 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
        />
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="p-4 text-left">Course</th>
              <th className="p-4 text-left">Exam</th>
              <th className="p-4 text-right">Price</th>
              <th className="p-4 text-center">Slider</th>
              <th className="p-4 text-center">Active</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredCourses.map((course) => (
              <tr key={course.id} className="hover:bg-stone-50">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {course.cover_image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={course.cover_image} alt={course.title} className="w-14 h-10 rounded-lg object-cover border border-stone-200" />
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-stone-900 text-sm truncate max-w-xs">{course.title}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="text-[11px] text-stone-500">{course.badge}</span>
                        {course.is_featured && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">🔥 Featured</span>}
                        {course.is_new_arrival && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">✨ New</span>}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-sm text-stone-700">{getExamName(course.exam_id)}</td>
                <td className="p-4 text-right">
                  <p className="font-bold text-stone-900">₹{course.price}</p>
                  <p className="text-[11px] text-stone-400 line-through">₹{course.original_price}</p>
                </td>
                <td className="p-4 text-center">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${course.show_in_slider ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-stone-100 text-stone-500 border border-stone-200"}`}>
                    {course.show_in_slider ? "Yes" : "No"}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => handleToggleActive(course)}
                    className={`px-3 py-1 rounded-full text-xs font-bold ${course.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-stone-100 text-stone-500 border border-stone-200"}`}
                  >
                    {course.is_active ? "Active" : "Off"}
                  </button>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEditModal(course)} className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg">Edit</button>
                    <button onClick={() => handleDelete(course.id)} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-semibold rounded-lg">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredCourses.length === 0 && (
          <div className="p-12 text-center text-stone-400 text-sm">No courses match your search.</div>
        )}
      </div>

      {/* Mobile card list */}
      <div className="lg:hidden space-y-3">
        {filteredCourses.map((course) => (
          <div key={course.id} className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              {course.cover_image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={course.cover_image} alt={course.title} className="w-16 h-12 rounded-lg object-cover border border-stone-200 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-stone-900 text-sm line-clamp-2">{course.title}</p>
                <p className="text-[11px] text-stone-500">{course.badge} • {getExamName(course.exam_id)}</p>
              </div>
              <button
                onClick={() => handleToggleActive(course)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${course.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-stone-100 text-stone-500 border border-stone-200"}`}
              >
                {course.is_active ? "Active" : "Off"}
              </button>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <div>
                <span className="font-bold text-stone-900">₹{course.price}</span>
                <span className="ml-2 text-xs text-stone-400 line-through">₹{course.original_price}</span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {course.show_in_slider && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    Slider
                  </span>
                )}
                {course.is_featured && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    🔥 Featured
                  </span>
                )}
                {course.is_new_arrival && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ✨ New
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-stone-100">
              <button onClick={() => openEditModal(course)} className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg">
                Edit
              </button>
              <button onClick={() => handleDelete(course.id)} className="flex-1 py-2 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg">
                Delete
              </button>
            </div>
          </div>
        ))}
        {filteredCourses.length === 0 && (
          <div className="p-12 text-center text-stone-400 text-sm bg-white border border-stone-200 rounded-2xl">
            No courses match your search.
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={closeModal} />
          <div className="relative bg-white border border-stone-200 rounded-t-3xl sm:rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden z-10 flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-stone-200 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-stone-900">
                  {editingCourse ? "Edit Course" : "New Course"}
                </h3>
                <div className="flex gap-1 bg-stone-100 rounded-lg p-1">
                  {(["basic", "content", "delivery"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setActiveTab(t)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                        activeTab === t ? "bg-amber-600 text-white" : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      {t === "basic" ? "Basic" : t === "content" ? "Content" : "Delivery"}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={closeModal} className="w-9 h-9 rounded-lg hover:bg-stone-100 text-stone-500 flex items-center justify-center">✕</button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {activeTab === "basic" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1">Exam *</label>
                      <select
                        value={formData.exam_id || ""}
                        onChange={(e) => setFormData({ ...formData, exam_id: e.target.value })}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                      >
                        {exams.map((e) => (
                          <option key={e.id} value={e.id}>{e.name} ({e.short_name})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1">Slug (URL)</label>
                      <input
                        type="text"
                        value={formData.slug || ""}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                        placeholder="auto-generated from title"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600 mb-1">Title *</label>
                    <input
                      type="text"
                      value={formData.title || ""}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1">Badge</label>
                      <input
                        type="text"
                        value={formData.badge || ""}
                        onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1">Language</label>
                      <input
                        type="text"
                        value={formData.language || "Hindi"}
                        onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600 mb-1">Short Description</label>
                    <textarea
                      value={formData.short_description || ""}
                      onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                      rows={2}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1">Original Price (₹)</label>
                      <input
                        type="number"
                        value={formData.original_price || 0}
                        onChange={(e) => setFormData({ ...formData, original_price: Number(e.target.value) })}
                        min={0}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1">Sale Price (₹)</label>
                      <input
                        type="number"
                        value={formData.price || 0}
                        onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                        min={0}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                      />
                    </div>
                    <label className="flex items-end gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.show_in_slider}
                        onChange={(e) => setFormData({ ...formData, show_in_slider: e.target.checked })}
                        className="w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-xs font-medium text-stone-700">In Slider</span>
                    </label>
                  </div>

                  {formData.show_in_slider && (
                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1">Slider Tagline</label>
                      <input
                        type="text"
                        value={formData.slider_tagline || ""}
                        onChange={(e) => setFormData({ ...formData, slider_tagline: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer mb-1.5">
                        <input
                          type="checkbox"
                          checked={formData.is_featured || false}
                          onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                          className="w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                        />
                        <span className="text-xs font-bold text-stone-800">🔥 Featured Deals (होमपेज डील्स)</span>
                      </label>
                      {formData.is_featured && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-stone-500">Priority:</span>
                          <input
                            type="number"
                            value={formData.featured_priority || 1}
                            onChange={(e) => setFormData({ ...formData, featured_priority: Number(e.target.value) })}
                            min={1}
                            className="w-20 px-2 py-1 text-xs border border-stone-300 rounded-lg bg-white"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="flex items-center gap-2 cursor-pointer mb-1.5">
                        <input
                          type="checkbox"
                          checked={formData.is_new_arrival || false}
                          onChange={(e) => setFormData({ ...formData, is_new_arrival: e.target.checked })}
                          className="w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                        />
                        <span className="text-xs font-bold text-stone-800">✨ New Arrivals (नए कोर्सेज)</span>
                      </label>
                      {formData.is_new_arrival && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-stone-500">Priority:</span>
                          <input
                            type="number"
                            value={formData.new_arrival_priority || 1}
                            onChange={(e) => setFormData({ ...formData, new_arrival_priority: Number(e.target.value) })}
                            min={1}
                            className="w-20 px-2 py-1 text-xs border border-stone-300 rounded-lg bg-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600 mb-2">Cover Image</label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                      {PRESET_COVERS.map((url) => (
                        <button
                          type="button"
                          key={url}
                          onClick={() => selectPresetCover(url)}
                          className={`relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition ${
                            formData.cover_image === url ? "border-amber-500" : "border-stone-200 hover:border-stone-300"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="Preset" className="object-cover w-full h-full" />
                          {formData.cover_image === url && (
                            <div className="absolute inset-0 bg-amber-500/40 flex items-center justify-center text-white text-xl">✓</div>
                          )}
                        </button>
                      ))}
                      <label className="relative aspect-[4/3] rounded-lg border-2 border-dashed border-stone-300 hover:border-amber-500 flex items-center justify-center cursor-pointer bg-stone-50">
                        <input type="file" accept="image/*" onChange={handleCoverChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                        <span className="text-stone-500 text-[10px] text-center px-1">Upload</span>
                      </label>
                    </div>
                    {coverPreview && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={coverPreview} alt="Preview" className="w-40 h-28 rounded-lg object-cover border border-stone-200" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1">Pages Count</label>
                      <input
                        type="text"
                        value={formData.pages_count || ""}
                        onChange={(e) => setFormData({ ...formData, pages_count: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1">Format</label>
                      <input
                        type="text"
                        value={formData.format || "Printable PDF"}
                        onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1">Rating</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        value={formData.rating || 0}
                        onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1">Rating Count</label>
                      <input
                        type="text"
                        value={formData.rating_count || "0"}
                        onChange={(e) => setFormData({ ...formData, rating_count: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1">Priority</label>
                      <input
                        type="number"
                        value={formData.priority || 1}
                        onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                        min={1}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                      />
                    </div>
                    <label className="flex items-end gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-sm font-medium text-stone-700">Active</span>
                    </label>
                  </div>
                </div>
              )}

              {activeTab === "content" && (
                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-stone-600">Highlights</label>
                      <button type="button" onClick={addHighlight} className="px-3 py-1 text-xs bg-stone-100 hover:bg-stone-200 rounded-lg font-semibold">+ Add</button>
                    </div>
                    <div className="space-y-2">
                      {(formData.highlights || []).map((h, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            type="text"
                            value={h}
                            onChange={(e) => updateHighlight(i, e.target.value)}
                            placeholder={`Highlight ${i + 1}`}
                            className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                          />
                          <button type="button" onClick={() => removeHighlight(i)} className="px-3 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-xs font-semibold">Remove</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-stone-600">Subjects</label>
                      <button type="button" onClick={addSubject} className="px-3 py-1 text-xs bg-stone-100 hover:bg-stone-200 rounded-lg font-semibold">+ Add</button>
                    </div>
                    <div className="space-y-2">
                      {(formData.subjects || []).map((s, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            type="text"
                            value={s}
                            onChange={(e) => updateSubject(i, e.target.value)}
                            placeholder={`Subject ${i + 1}`}
                            className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                          />
                          <button type="button" onClick={() => removeSubject(i)} className="px-3 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-xs font-semibold">Remove</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-stone-600">Syllabus Preview</label>
                      <button type="button" onClick={addSyllabusSection} className="px-3 py-1 text-xs bg-stone-100 hover:bg-stone-200 rounded-lg font-semibold">+ Add Section</button>
                    </div>
                    <div className="space-y-3">
                      {(formData.syllabus_preview || []).map((sec, si) => (
                        <div key={si} className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={sec.subject}
                              onChange={(e) => updateSyllabusSubject(si, e.target.value)}
                              placeholder="Subject name"
                              className="flex-1 px-3 py-2 rounded-lg border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                            />
                            <button type="button" onClick={() => removeSyllabusSection(si)} className="px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs rounded-lg font-semibold">Remove</button>
                          </div>
                          <div className="space-y-2 pl-3">
                            {sec.chapters.map((ch, ci) => (
                              <div key={ci} className="flex gap-2">
                                <input
                                  type="text"
                                  value={ch}
                                  onChange={(e) => updateChapter(si, ci, e.target.value)}
                                  placeholder={`Chapter ${ci + 1}`}
                                  className="flex-1 px-3 py-2 rounded-lg border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                                />
                                <button type="button" onClick={() => removeChapter(si, ci)} className="px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs rounded-lg font-semibold">×</button>
                              </div>
                            ))}
                            <button type="button" onClick={() => addChapter(si)} className="px-3 py-1 text-xs bg-stone-100 hover:bg-stone-200 rounded-lg font-semibold">+ Chapter</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "delivery" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-600 mb-1">Notes Access Link (Drive URL)</label>
                    <input
                      type="url"
                      value={formData.drive_url || ""}
                      onChange={(e) => setFormData({ ...formData, drive_url: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                    />
                    <p className="text-[11px] text-stone-400 mt-1">This link will be sent to students after payment verification.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-600 mb-1">Sample PDF Link</label>
                    <input
                      type="url"
                      value={formData.sample_pdf_url || ""}
                      onChange={(e) => setFormData({ ...formData, sample_pdf_url: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                    />
                  </div>
                </div>
              )}
            </form>

            <div className="p-4 border-t border-stone-200 bg-stone-50 flex justify-end gap-2">
              <button type="button" onClick={closeModal} className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-white font-semibold text-sm">Cancel</button>
              <button
                type="submit"
                disabled={saving}
                onClick={(e) => {
                  e.preventDefault();
                  const formEl = (e.currentTarget.closest(".relative") as HTMLElement)?.querySelector("form");
                  formEl?.requestSubmit();
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm disabled:opacity-50"
              >
                {saving ? "Saving..." : editingCourse ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
