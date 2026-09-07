"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface Exam {
  id: string;
  category_id: string;
  name: string;
  short_name: string;
  board: string;
  logo_url?: string;
  description: string;
  status: "upcoming" | "open" | "closed" | "expected";
  form_start?: string;
  last_date?: string;
  expected_notification?: string;
  total_posts?: number;
  priority: number;
  is_active: boolean;
  course_ids: string[];
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  name: string;
  name_hi?: string;
}

interface ExamsTabProps {
  getAuthHeaders: () => Record<string, string>;
}

export default function ExamsTab({ getAuthHeaders }: ExamsTabProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [formData, setFormData] = useState<Partial<Exam>>({
    category_id: "", name: "", short_name: "", board: "", description: "",
    status: "expected", priority: 1, is_active: true, course_ids: []
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const STATUS_OPTIONS = [
    { value: "upcoming", label: "Upcoming", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    { value: "open", label: "Open / Live", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    { value: "expected", label: "Expected", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    { value: "closed", label: "Closed", color: "bg-neutral-800 text-neutral-500 border-neutral-700" },
  ];

  const fetchData = async () => {
    try {
      const [examsRes, catsRes] = await Promise.all([
        fetch("/api/admin/exams", { headers: getAuthHeaders() }),
        fetch("/api/admin/categories", { headers: getAuthHeaders() }),
      ]);
      if (examsRes.ok) setExams(await examsRes.json());
      if (catsRes.ok) setCategories(await catsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setLogoFile(file); setLogoPreview(URL.createObjectURL(file)); }
  };

  const openCreateModal = () => {
    setEditingExam(null);
    setFormData({ category_id: categories[0]?.id || "", name: "", short_name: "", board: "", description: "", status: "expected", priority: exams.length + 1, is_active: true, course_ids: [] });
    setLogoFile(null); setLogoPreview(null); setShowModal(true);
  };

  const openEditModal = (exam: Exam) => {
    setEditingExam(exam);
    setFormData({ ...exam });
    setLogoFile(null); setLogoPreview(exam.logo_url || null); setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingExam(null); setLogoFile(null); setLogoPreview(null); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMessage(null);
    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => {
        if (k === "course_ids") fd.append(k, JSON.stringify(v || []));
        else if (v !== undefined && v !== null) fd.append(k, String(v));
      });
      if (logoFile) fd.append("logo", logoFile);

      const url = editingExam ? `/api/admin/exams/${editingExam.id}` : "/api/admin/exams";
      const res = await fetch(url, { method: editingExam ? "PUT" : "POST", headers: { Authorization: getAuthHeaders().Authorization }, body: fd });

      if (res.ok) { setMessage({ type: "success", text: editingExam ? "Exam updated!" : "Exam created!" }); fetchData(); closeModal(); }
      else { const err = await res.json(); throw new Error(err.error || "Failed"); }
    } catch (err: unknown) { setMessage({ type: "error", text: err instanceof Error ? err.message : "Save failed" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this exam? This cannot be undone.")) return;
    try {
      await fetch(`/api/admin/exams/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      fetchData(); setMessage({ type: "success", text: "Exam deleted" });
    } catch { setMessage({ type: "error", text: "Delete failed" }); }
  };

  const handleToggleActive = async (exam: Exam) => {
    try {
      await fetch(`/api/admin/exams/${exam.id}`, { method: "PUT", headers: { ...getAuthHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !exam.is_active }) });
      fetchData();
    } catch { console.error("Toggle failed"); }
  };

  if (loading) return <div className="py-12 text-center text-neutral-500">Loading exams...</div>;

  const getCategoryName = (catId: string) => categories.find(c => c.id === catId)?.name || catId;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Exams Management</h2>
          <p className="text-neutral-400 text-sm">Manage exams under categories with status, dates, and logos.</p>
        </div>
        <button onClick={openCreateModal} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all">
          + Add Exam
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
              <th className="p-4 text-left">Logo</th>
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Category</th>
              <th className="p-4 text-left">Board</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Dates</th>
              <th className="p-4 text-center">Active</th>
              <th className="p-4 text-left">Posts</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {exams.map((exam) => (
              <tr key={exam.id} className="hover:bg-neutral-950/50">
                <td className="p-4">
                  {exam.logo_url ? (
                    <img src={exam.logo_url} alt={exam.name} className="w-12 h-12 rounded-xl object-cover border border-neutral-700" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-2xl">📋</div>
                  )}
                </td>
                <td className="p-4">
                  <p className="font-semibold text-white">{exam.name}</p>
                  <p className="text-xs text-neutral-500">{exam.short_name}</p>
                </td>
                <td className="p-4 text-sm text-neutral-300">{getCategoryName(exam.category_id)}</td>
                <td className="p-4 text-sm text-neutral-400">{exam.board}</td>
                <td className="p-4">
                  {(() => {
                    const status = STATUS_OPTIONS.find(s => s.value === exam.status);
                    return (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${status?.color || ""}`}>
                        {status?.label || exam.status}
                      </span>
                    );
                  })()}
                </td>
                <td className="p-4 text-xs text-neutral-400">
                  {exam.form_start && <div>Form: {exam.form_start}</div>}
                  {exam.last_date && <div>Last: {exam.last_date}</div>}
                  {exam.expected_notification && <div>Expected: {exam.expected_notification}</div>}
                </td>
                <td className="p-4 text-center">
                  <button onClick={() => handleToggleActive(exam)} className={`px-3 py-1 rounded-full text-xs font-bold ${exam.is_active ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-neutral-800 text-neutral-500 border border-neutral-700"}`}>
                    {exam.is_active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="p-4 text-sm text-neutral-400">{exam.total_posts || "—"}</td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEditModal(exam)} className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium rounded-lg transition">Edit</button>
                    <button onClick={() => handleDelete(exam.id)} className="px-3 py-1.5 bg-red-950/30 hover:bg-red-950/50 border border-red-500/20 text-red-400 text-xs font-medium rounded-lg transition">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {exams.length === 0 && <div className="p-12 text-center text-neutral-500">No exams yet. Click "Add Exam" to create one.</div>}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={closeModal} />
          <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">{editingExam ? "Edit Exam" : "New Exam"}</h3>
              <button onClick={closeModal} className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 flex items-center justify-center">✕</button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Category *</label>
                  <select value={formData.category_id || ""} onChange={e => setFormData({ ...formData, category_id: e.target.value })} required className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none">
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name} {c.name_hi && `(${c.name_hi})`}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Status *</label>
                  <select value={formData.status || "expected"} onChange={e => setFormData({ ...formData, status: e.target.value as Exam["status"] })} required className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none">
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Full Name *</label>
                  <input type="text" value={formData.name || ""} onChange={e => setFormData({ ...formData, name: e.target.value })} required className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Short Name *</label>
                  <input type="text" value={formData.short_name || ""} onChange={e => setFormData({ ...formData, short_name: e.target.value })} required className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">Board / Organization *</label>
                <input type="text" value={formData.board || ""} onChange={e => setFormData({ ...formData, board: e.target.value })} required className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">Description</label>
                <textarea value={formData.description || ""} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Form Start Date</label>
                  <input type="date" value={formData.form_start || ""} onChange={e => setFormData({ ...formData, form_start: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Last Date</label>
                  <input type="date" value={formData.last_date || ""} onChange={e => setFormData({ ...formData, last_date: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Expected Notification</label>
                  <input type="text" value={formData.expected_notification || ""} onChange={e => setFormData({ ...formData, expected_notification: e.target.value })} placeholder="e.g. 2026 Q3" className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Total Posts</label>
                  <input type="number" value={formData.total_posts || ""} onChange={e => setFormData({ ...formData, total_posts: Number(e.target.value) || undefined })} className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none" min={0} />
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

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">Logo Image (Optional)</label>
                <div className="flex items-center gap-4">
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="text-sm text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-emerald-600 file:text-white hover:file:bg-emerald-700" />
                  {logoPreview && <img src={logoPreview} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-neutral-700" />}
                  {formData.logo_url && !logoPreview && !logoFile && <img src={formData.logo_url} alt="Current" className="w-16 h-16 rounded-xl object-cover border border-neutral-700 opacity-60" />}
                </div>
                <p className="text-xs text-neutral-500 mt-1">Recommended: 200x200px, PNG/JPG/WebP, max 500KB</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                <button type="button" onClick={closeModal} className="px-5 py-2.5 rounded-xl border border-neutral-700 text-neutral-300 hover:bg-neutral-800 font-medium transition">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black transition disabled:opacity-50">{saving ? "Saving..." : (editingExam ? "Update" : "Create")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}