"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

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
    exam_id: "", title: "", slug: "", badge: "Complete Kit", short_description: "",
    original_price: 999, price: 199, highlights: [], subjects: [],
    syllabus_preview: [], pages_count: "", format: "Printable PDF", language: "Hindi",
    cover_image: "", show_in_slider: false, slider_tagline: "",
    sample_pdf_url: "https://drive.google.com", drive_url: "https://drive.google.com",
    rating: 4.9, rating_count: "0", is_active: true, priority: 1
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"basic" | "content" | "delivery">("basic");

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
        const examsData = await examsRes.json();
        setExams(examsData.map((e: any) => ({ id: e.id, name: e.name, short_name: e.short_name })));
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setCoverFile(file); setCoverPreview(URL.createObjectURL(file)); }
  };

  const selectPresetCover = (url: string) => {
    setFormData({ ...formData, cover_image: url });
    setCoverFile(null); setCoverPreview(url);
  };

  const openCreateModal = () => {
    setEditingCourse(null);
    setFormData({ exam_id: exams[0]?.id || "", title: "", slug: "", badge: "Complete Kit", short_description: "", original_price: 999, price: 199, highlights: ["", "", ""], subjects: ["", "", ""], syllabus_preview: [], pages_count: "", format: "Printable PDF", language: "Hindi", cover_image: PRESET_COVERS[0], show_in_slider: false, slider_tagline: "", sample_pdf_url: "https://drive.google.com", drive_url: "https://drive.google.com", rating: 4.9, rating_count: "0", is_active: true, priority: courses.length + 1 });
    setCoverFile(null); setCoverPreview(PRESET_COVERS[0]); setActiveTab("basic"); setShowModal(true);
  };

  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    setFormData({ ...course });
    setCoverFile(null); setCoverPreview(course.cover_image); setActiveTab("basic"); setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingCourse(null); setCoverFile(null); setCoverPreview(null); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMessage(null);
    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => {
        if (["highlights", "subjects", "syllabus_preview"].includes(k)) fd.append(k, JSON.stringify(v || []));
        else if (v !== undefined && v !== null) fd.append(k, String(v));
      });
      if (coverFile) fd.append("cover", coverFile);

      const url = editingCourse ? `/api/admin/courses/${editingCourse.id}` : "/api/admin/courses";
      const res = await fetch(url, { method: editingCourse ? "PUT" : "POST", headers: { Authorization: getAuthHeaders().Authorization }, body: fd });

      if (res.ok) { setMessage({ type: "success", text: editingCourse ? "Course updated!" : "Course created!" }); fetchData(); closeModal(); }
      else { const err = await res.json(); throw new Error(err.error || "Failed"); }
    } catch (err: unknown) { setMessage({ type: "error", text: err instanceof Error ? err.message : "Save failed" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this course? This cannot be undone.")) return;
    try { await fetch(`/api/admin/courses/${id}`, { method: "DELETE", headers: getAuthHeaders() }); fetchData(); setMessage({ type: "success", text: "Course deleted" }); }
    catch { setMessage({ type: "error", text: "Delete failed" }); }
  };

  const handleToggleActive = async (course: Course) => {
    try { await fetch(`/api/admin/courses/${course.id}`, { method: "PUT", headers: { ...getAuthHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !course.is_active }) }); fetchData(); }
    catch { console.error("Toggle failed"); }
  };

  const addHighlight = () => setFormData({ ...formData, highlights: [...(formData.highlights || []), ""] });
  const removeHighlight = (idx: number) => setFormData({ ...formData, highlights: (formData.highlights || []).filter((_, i) => i !== idx) });
  const updateHighlight = (idx: number, val: string) => setFormData({ ...formData, highlights: (formData.highlights || []).map((h, i) => i === idx ? val : h) });

  const addSubject = () => setFormData({ ...formData, subjects: [...(formData.subjects || []), ""] });
  const removeSubject = (idx: number) => setFormData({ ...formData, subjects: (formData.subjects || []).filter((_, i) => i !== idx) });
  const updateSubject = (idx: number, val: string) => setFormData({ ...formData, subjects: (formData.subjects || []).map((s, i) => i === idx ? val : s) });

  const addSyllabusSection = () => setFormData({ ...formData, syllabus_preview: [...(formData.syllabus_preview || []), { subject: "", chapters: [""] }] });
  const removeSyllabusSection = (idx: number) => setFormData({ ...formData, syllabus_preview: (formData.syllabus_preview || []).filter((_, i) => i !== idx) });
  const updateSyllabusSubject = (idx: number, val: string) => setFormData({ ...formData, syllabus_preview: (formData.syllabus_preview || []).map((s, i) => i === idx ? { ...s, subject: val } : s) });
  const addChapter = (sIdx: number) => setFormData({ ...formData, syllabus_preview: (formData.syllabus_preview || []).map((s, i) => i === sIdx ? { ...s, chapters: [...s.chapters, ""] } : s) });
  const removeChapter = (sIdx: number, cIdx: number) => setFormData({ ...formData, syllabus_preview: (formData.syllabus_preview || []).map((s, i) => i === sIdx ? { ...s, chapters: s.chapters.filter((_, ci) => ci !== cIdx) } : s) });
  const updateChapter = (sIdx: number, cIdx: number, val: string) => setFormData({ ...formData, syllabus_preview: (formData.syllabus_preview || []).map((s, i) => i === sIdx ? { ...s, chapters: s.chapters.map((c, ci) => ci === cIdx ? val : c) } : s) });

  if (loading) return <div className="py-12 text-center text-neutral-500">Loading courses...</div>;

  const getExamName = (examId: string) => exams.find(e => e.id === examId)?.name || examId;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Courses Management</h2>
          <p className="text-neutral-400 text-sm">Manage study material bundles: pricing, content, delivery links, and slider placement.</p>
        </div>
        <button onClick={openCreateModal} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all">
          + Add Course
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border ${message.type === "success" ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-400" : "bg-red-950/30 border-red-500/30 text-red-400"}`}>
          {message.text}
        </div>
      )}

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 text-xs uppercase tracking-wider">
              <th className="p-4 text-left">Cover</th>
              <th className="p-4 text-left">Title</th>
              <th className="p-4 text-left">Exam</th>
              <th className="p-4 text-right">Price</th>
              <th className="p-4 text-center">Slider</th>
              <th className="p-4 text-center">Active</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {courses.map((course) => (
              <tr key={course.id} className="hover:bg-neutral-950/50">
                <td className="p-4"><img src={course.cover_image} alt={course.title} className="w-16 h-12 rounded-lg object-cover border border-neutral-700" /></td>
                <td className="p-4 max-w-xs">
                  <p className="font-semibold text-white truncate">{course.title}</p>
                  <p className="text-xs text-neutral-500">{course.badge}</p>
                </td>
                <td className="p-4 text-sm text-neutral-300">{getExamName(course.exam_id)}</td>
                <td className="p-4 text-right font-bold text-white">₹{course.price} <span className="text-xs text-neutral-400 line-through font-normal">₹{course.original_price}</span></td>
                <td className="p-4 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${course.show_in_slider ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-neutral-800 text-neutral-500 border border-neutral-700"}`}>
                    {course.show_in_slider ? "Yes" : "No"}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <button onClick={() => handleToggleActive(course)} className={`px-3 py-1 rounded-full text-xs font-bold ${course.is_active ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-neutral-800 text-neutral-500 border border-neutral-700"}`}>
                    {course.is_active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEditModal(course)} className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium rounded-lg transition">Edit</button>
                    <button onClick={() => handleDelete(course.id)} className="px-3 py-1.5 bg-red-950/30 hover:bg-red-950/50 border border-red-500/20 text-red-400 text-xs font-medium rounded-lg transition">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {courses.length === 0 && <div className="p-12 text-center text-neutral-500">No courses yet. Click "Add Course" to create one.</div>}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={closeModal} />
          <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden z-10 flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b border-neutral-800 bg-neutral-950/50">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-bold text-white">{editingCourse ? "Edit Course" : "New Course"}</h3>
                <div className="flex gap-1 bg-neutral-800 rounded-lg p-1">
                  {["basic", "content", "delivery"].map(t => (
                    <button key={t} onClick={() => setActiveTab(t as typeof activeTab)} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${activeTab === t ? "bg-emerald-600 text-white" : "text-neutral-400 hover:text-white"}`}>
                      {t === "basic" ? "Basic Info" : t === "content" ? "Content" : "Delivery"}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={closeModal} className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 flex items-center justify-center">✕</button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleSave} className="space-y-6">

                {/* BASIC INFO TAB */}
                {activeTab === "basic" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-400 mb-1">Exam *</label>
                        <select value={formData.exam_id || ""} onChange={e => setFormData({ ...formData, exam_id: e.target.value })} required className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none">
                          {exams.map(e => <option key={e.id} value={e.id}>{e.name} ({e.short_name})</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-neutral-400 mb-1">Slug (URL)</label>
                        <input type="text" value={formData.slug || ""} onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none" placeholder="auto-generated from title" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-400 mb-1">Title *</label>
                      <input type="text" value={formData.title || ""} onChange={e => setFormData({ ...formData, title: e.target.value })} required className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-400 mb-1">Badge</label>
                        <input type="text" value={formData.badge || ""} onChange={e => setFormData({ ...formData, badge: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none" placeholder="Complete Kit, Bestseller, etc." />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-neutral-400 mb-1">Language</label>
                        <input type="text" value={formData.language || "Hindi"} onChange={e => setFormData({ ...formData, language: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-400 mb-1">Short Description</label>
                      <textarea value={formData.short_description || ""} onChange={e => setFormData({ ...formData, short_description: e.target.value })} rows={2} className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none" />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-400 mb-1">Original Price (₹)</label>
                        <input type="number" value={formData.original_price || 999} onChange={e => setFormData({ ...formData, original_price: Number(e.target.value) })} className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none" min={0} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-neutral-400 mb-1">Sale Price (₹)</label>
                        <input type="number" value={formData.price || 199} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none" min={0} />
                      </div>
<div className="flex items-end">
                          <label className="w-full flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={formData.show_in_slider} onChange={e => setFormData({ ...formData, show_in_slider: e.target.checked })} className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-emerald-600 focus:ring-emerald-500" />
                            <span className="text-sm text-neutral-300">Show in Hero Slider</span>
                          </label>
                        </div>
                    </div>

                    {formData.show_in_slider && (
                      <div>
                        <label className="block text-xs font-semibold text-neutral-400 mb-1">Slider Tagline</label>
                        <input type="text" value={formData.slider_tagline || ""} onChange={e => setFormData({ ...formData, slider_tagline: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none" placeholder="Short tagline for hero slider" />
                      </div>
                    )}

                    {/* Cover Image Selector */}
                    <div>
                      <label className="block text-xs font-semibold text-neutral-400 mb-2">Cover Image</label>
                      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
                        {PRESET_COVERS.map(url => (
                          <button type="button" key={url} onClick={() => selectPresetCover(url)} className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition ${formData.cover_image === url ? "border-emerald-500 scale-[1.02]" : "border-neutral-700 hover:border-neutral-600"}`}>
                            <Image src={url} alt="Preset" fill className="object-cover" sizes="100px" />
                            {formData.cover_image === url && <div className="absolute inset-0 bg-emerald-500/30 flex items-center justify-center"><span className="text-white text-xl">✓</span></div>}
                          </button>
                        ))}
                        <label className="relative aspect-[4/3] rounded-xl border-2 border-dashed border-neutral-700 hover:border-emerald-500 flex items-center justify-center cursor-pointer transition bg-neutral-950">
                          <input type="file" accept="image/*" onChange={handleCoverChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                          <span className="text-neutral-500 text-center px-2">Upload Custom</span>
                        </label>
                      </div>
                      {coverPreview && (
                        <div className="relative w-48 h-36 rounded-xl overflow-hidden border border-neutral-700">
                          <Image src={coverPreview} alt="Preview" fill className="object-cover" sizes="192px" />
                        </div>
                      )}
                      <p className="text-xs text-neutral-500 mt-1">Recommended: 400x300px, JPG/WebP, max 1MB</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-400 mb-1">Pages Count</label>
                        <input type="text" value={formData.pages_count || ""} onChange={e => setFormData({ ...formData, pages_count: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none" placeholder="e.g. 1,450+ Pages" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-neutral-400 mb-1">Format</label>
                        <input type="text" value={formData.format || "Printable PDF"} onChange={e => setFormData({ ...formData, format: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-400 mb-1">Rating</label>
                        <input type="number" step="0.1" min="0" max="5" value={formData.rating || 4.9} onChange={e => setFormData({ ...formData, rating: Number(e.target.value) })} className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-neutral-400 mb-1">Rating Count</label>
                        <input type="text" value={formData.rating_count || "0"} onChange={e => setFormData({ ...formData, rating_count: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none" placeholder="e.g. 4,120+ Students" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-400 mb-1">Priority (Order)</label>
                        <input type="number" value={formData.priority || 1} onChange={e => setFormData({ ...formData, priority: Number(e.target.value) })} className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none" min={1} />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-emerald-600 focus:ring-emerald-500" />
                          <span className="text-sm text-neutral-300">Active</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* CONTENT TAB */}
                {activeTab === "content" && (
                  <div className="space-y-6">
                    {/* Highlights */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="block text-xs font-semibold text-neutral-400">Key Highlights (max 4)</label>
                        <button type="button" onClick={addHighlight} className="px-3 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 rounded-lg transition">+ Add</button>
                      </div>
                      <div className="space-y-2">
                        {(formData.highlights || []).map((h, i) => (
                          <div key={i} className="flex gap-2">
                            <input type="text" value={h} onChange={e => updateHighlight(i, e.target.value)} placeholder={`Highlight ${i + 1}`} className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none" />
                            <button type="button" onClick={() => removeHighlight(i)} className="px-3 py-2.5 bg-red-950/30 hover:bg-red-950/50 border border-red-500/20 text-red-400 rounded-lg transition">Remove</button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Subjects */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="block text-xs font-semibold text-neutral-400">Subjects</label>
                        <button type="button" onClick={addSubject} className="px-3 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 rounded-lg transition">+ Add</button>
                      </div>
                      <div className="space-y-2">
                        {(formData.subjects || []).map((s, i) => (
                          <div key={i} className="flex gap-2">
                            <input type="text" value={s} onChange={e => updateSubject(i, e.target.value)} placeholder={`Subject ${i + 1}`} className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none" />
                            <button type="button" onClick={() => removeSubject(i)} className="px-3 py-2.5 bg-red-950/30 hover:bg-red-950/50 border border-red-500/20 text-red-400 rounded-lg transition">Remove</button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Syllabus Preview */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="block text-xs font-semibold text-neutral-400">Syllabus Sections</label>
                        <button type="button" onClick={addSyllabusSection} className="px-3 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 rounded-lg transition">+ Add Section</button>
                      </div>
                      <div className="space-y-4">
                        {(formData.syllabus_preview || []).map((sec, si) => (
                          <div key={si} className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-4 space-y-3">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-neutral-800 text-neutral-300 text-xs font-mono flex items-center justify-center">{si + 1}</span>
                                <input type="text" value={sec.subject} onChange={e => updateSyllabusSubject(si, e.target.value)} placeholder="Subject Name (e.g. Rajasthan History)" className="flex-1 px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-900 text-white focus:border-emerald-500 focus:outline-none" />
                              </div>
                              <button type="button" onClick={() => removeSyllabusSection(si)} className="px-3 py-1.5 bg-red-950/30 hover:bg-red-950/50 border border-red-500/20 text-red-400 text-xs rounded-lg transition">Remove Section</button>
                            </div>
                            <div className="space-y-2 pl-8">
                              {sec.chapters.map((ch, ci) => (
                                <div key={ci} className="flex gap-2">
                                  <input type="text" value={ch} onChange={e => updateChapter(si, ci, e.target.value)} placeholder={`Chapter ${ci + 1}`} className="flex-1 px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-900 text-white focus:border-emerald-500 focus:outline-none text-sm" />
                                  <button type="button" onClick={() => removeChapter(si, ci)} className="px-3 py-2 bg-red-950/30 hover:bg-red-950/50 border border-red-500/20 text-red-400 text-sm rounded-lg transition">Remove</button>
                                </div>
                              ))}
                              <button type="button" onClick={() => addChapter(si)} className="px-3 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 rounded-lg transition">+ Add Chapter</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* DELIVERY TAB */}
                {activeTab === "delivery" && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-400 mb-1">Notes Access Link (Delivery URL)</label>
                      <input type="url" value={formData.drive_url || ""} onChange={e => setFormData({ ...formData, drive_url: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none" placeholder="https://drive.google.com/..." />
                      <p className="text-xs text-neutral-500 mt-1">This link will be sent to students after payment verification.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-400 mb-1">Sample PDF Link (Preview)</label>
                      <input type="url" value={formData.sample_pdf_url || ""} onChange={e => setFormData({ ...formData, sample_pdf_url: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none" placeholder="https://drive.google.com/..." />
                      <p className="text-xs text-neutral-500 mt-1">Free sample for students to preview before buying.</p>
                    </div>

                    <div className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-4">
                      <h4 className="font-semibold text-white mb-3">How Delivery Works</h4>
                      <ol className="space-y-2 text-sm text-neutral-400 list-decimal pl-5">
                        <li>Student pays via PhonePe/Paytm UPI and enters 12-digit UTR</li>
                        <li>Order appears in <strong>Orders</strong> tab with payment status</li>
                        <li>You click <strong>"Send via WhatsApp"</strong> or <strong>"Send via Gmail"</strong></li>
                        <li>Pre-filled message opens with course name, Order ID, and <strong>this Drive link</strong></li>
                        <li>Click Send — student gets instant access</li>
                      </ol>
                    </div>
                  </div>
                )}

              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-800 bg-neutral-950/50 flex justify-end gap-3">
              <button type="button" onClick={closeModal} className="px-5 py-2.5 rounded-xl border border-neutral-700 text-neutral-300 hover:bg-neutral-800 font-medium transition">Cancel</button>
              <button type="submit" form={`${editingCourse ? "edit" : "create"}-course-form`} disabled={saving} className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black transition disabled:opacity-50">{saving ? "Saving..." : (editingCourse ? "Update" : "Create")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}