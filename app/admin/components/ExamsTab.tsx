"use client";

import { useState, useEffect, startTransition } from "react";

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

const STATUS_OPTIONS = [
  { value: "upcoming", label: "Upcoming", chip: "bg-sky-50 text-sky-700 border-sky-200" },
  { value: "open", label: "Open / Live", chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "expected", label: "Expected", chip: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "closed", label: "Closed", chip: "bg-stone-100 text-stone-500 border-stone-200" },
] as const;

export default function ExamsTab({ getAuthHeaders }: ExamsTabProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [formData, setFormData] = useState<Partial<Exam>>({
    category_id: "",
    name: "",
    short_name: "",
    board: "",
    description: "",
    status: "expected",
    priority: 1,
    is_active: true,
    course_ids: [],
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Exam["status"]>("all");

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

  useEffect(() => {
    startTransition(() => {
      fetchData();
    });
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const openCreateModal = () => {
    setEditingExam(null);
    setFormData({
      category_id: categories[0]?.id || "",
      name: "",
      short_name: "",
      board: "",
      description: "",
      status: "expected",
      priority: exams.length + 1,
      is_active: true,
      course_ids: [],
    });
    setLogoFile(null);
    setLogoPreview(null);
    setShowModal(true);
  };

  const openEditModal = (exam: Exam) => {
    setEditingExam(exam);
    setFormData({ ...exam });
    setLogoFile(null);
    setLogoPreview(exam.logo_url || null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingExam(null);
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => {
        if (k === "course_ids") fd.append(k, JSON.stringify(v || []));
        else if (v !== undefined && v !== null) fd.append(k, String(v));
      });
      if (logoFile) fd.append("logo", logoFile);

      const url = editingExam ? `/api/admin/exams/${editingExam.id}` : "/api/admin/exams";
      const res = await fetch(url, {
        method: editingExam ? "PUT" : "POST",
        headers: { Authorization: getAuthHeaders().Authorization },
        body: fd,
      });

      if (res.ok) {
        setMessage({ type: "success", text: editingExam ? "Exam updated!" : "Exam created!" });
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
    if (!confirm("Delete this exam?")) return;
    try {
      await fetch(`/api/admin/exams/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      fetchData();
      setMessage({ type: "success", text: "Exam deleted" });
    } catch {
      setMessage({ type: "error", text: "Delete failed" });
    }
  };

  const handleToggleActive = async (exam: Exam) => {
    try {
      await fetch(`/api/admin/exams/${exam.id}`, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !exam.is_active }),
      });
      fetchData();
    } catch {
      console.error("Toggle failed");
    }
  };

  if (loading)
    return (
      <div className="py-12 text-center text-stone-500 bg-white rounded-2xl border border-stone-200">
        Loading exams...
      </div>
    );

  const getCategoryName = (catId: string) => categories.find((c) => c.id === catId)?.name || catId;
  const getStatusChip = (status: Exam["status"]) => STATUS_OPTIONS.find((s) => s.value === status)?.chip || "";

  const filteredExams = exams
    .filter((e) => statusFilter === "all" || e.status === statusFilter)
    .filter((e) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        e.name.toLowerCase().includes(q) ||
        e.short_name.toLowerCase().includes(q) ||
        e.board.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a.priority - b.priority);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900">Exams</h2>
          <p className="text-stone-500 text-sm">Manage exams under each issuing body with status, dates, and logos.</p>
        </div>
        <button onClick={openCreateModal} className="self-start sm:self-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl">
          + Add Exam
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-xl border text-sm ${message.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-2xl p-3 flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exams..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-4 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
        >
          <option value="all">All Status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="p-4 text-left">Exam</th>
              <th className="p-4 text-left">Category</th>
              <th className="p-4 text-left">Board</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-left">Dates</th>
              <th className="p-4 text-center">Posts</th>
              <th className="p-4 text-center">Active</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredExams.map((exam) => (
              <tr key={exam.id} className="hover:bg-stone-50">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {exam.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={exam.logo_url} alt={exam.name} className="w-10 h-10 rounded-xl object-cover border border-stone-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 text-xs font-bold">EX</div>
                    )}
                    <div>
                      <p className="font-bold text-stone-900 text-sm">{exam.name}</p>
                      <p className="text-[11px] text-stone-500">{exam.short_name}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-sm text-stone-700">{getCategoryName(exam.category_id)}</td>
                <td className="p-4 text-sm text-stone-600">{exam.board}</td>
                <td className="p-4 text-center">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusChip(exam.status)}`}>
                    {STATUS_OPTIONS.find((s) => s.value === exam.status)?.label}
                  </span>
                </td>
                <td className="p-4 text-xs text-stone-600">
                  {exam.form_start && <div>Form: {exam.form_start}</div>}
                  {exam.last_date && <div>Last: {exam.last_date}</div>}
                  {exam.expected_notification && <div>Exp: {exam.expected_notification}</div>}
                </td>
                <td className="p-4 text-center text-sm font-bold text-stone-900">{exam.total_posts || "—"}</td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => handleToggleActive(exam)}
                    className={`px-3 py-1 rounded-full text-xs font-bold ${exam.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-stone-100 text-stone-500 border border-stone-200"}`}
                  >
                    {exam.is_active ? "Active" : "Off"}
                  </button>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEditModal(exam)} className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg">Edit</button>
                    <button onClick={() => handleDelete(exam.id)} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-semibold rounded-lg">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredExams.length === 0 && (
          <div className="p-12 text-center text-stone-400 text-sm">No exams match your filters.</div>
        )}
      </div>

      {/* Mobile card list */}
      <div className="lg:hidden space-y-3">
        {filteredExams.map((exam) => (
          <div key={exam.id} className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              {exam.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={exam.logo_url} alt={exam.name} className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 text-xs font-bold shrink-0">EX</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-stone-900 text-sm line-clamp-2">{exam.name}</p>
                <p className="text-xs text-stone-500 truncate">{getCategoryName(exam.category_id)} • {exam.board}</p>
              </div>
              <button
                onClick={() => handleToggleActive(exam)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${exam.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-stone-100 text-stone-500 border border-stone-200"}`}
              >
                {exam.is_active ? "Active" : "Off"}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`px-2.5 py-1 rounded-full font-bold border ${getStatusChip(exam.status)}`}>
                {STATUS_OPTIONS.find((s) => s.value === exam.status)?.label}
              </span>
              {exam.total_posts ? (
                <span className="px-2.5 py-1 rounded-full font-bold bg-stone-100 text-stone-700 border border-stone-200">
                  {exam.total_posts} posts
                </span>
              ) : null}
              {exam.form_start && (
                <span className="text-stone-500">Form: {exam.form_start}</span>
              )}
              {exam.last_date && (
                <span className="text-stone-500">Last: {exam.last_date}</span>
              )}
              {exam.expected_notification && (
                <span className="text-stone-500">Exp: {exam.expected_notification}</span>
              )}
            </div>
            <div className="flex gap-2 pt-2 border-t border-stone-100">
              <button onClick={() => openEditModal(exam)} className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg">
                Edit
              </button>
              <button onClick={() => handleDelete(exam.id)} className="flex-1 py-2 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg">
                Delete
              </button>
            </div>
          </div>
        ))}
        {filteredExams.length === 0 && (
          <div className="p-12 text-center text-stone-400 text-sm bg-white border border-stone-200 rounded-2xl">
            No exams match your filters.
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={closeModal} />
          <div className="relative bg-white border border-stone-200 rounded-t-3xl sm:rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden z-10 flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-stone-200">
              <h3 className="text-lg font-bold text-stone-900">
                {editingExam ? "Edit Exam" : "New Exam"}
              </h3>
              <button onClick={closeModal} className="w-9 h-9 rounded-lg hover:bg-stone-100 text-stone-500 flex items-center justify-center">✕</button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">Category *</label>
                  <select
                    value={formData.category_id || ""}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">Status *</label>
                  <select
                    value={formData.status || "expected"}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Exam["status"] })}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">Short Name *</label>
                  <input
                    type="text"
                    value={formData.short_name || ""}
                    onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">Board / Organization *</label>
                <input
                  type="text"
                  value={formData.board || ""}
                  onChange={(e) => setFormData({ ...formData, board: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">Description</label>
                <textarea
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">Form Start Date</label>
                  <input
                    type="date"
                    value={formData.form_start || ""}
                    onChange={(e) => setFormData({ ...formData, form_start: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">Last Date</label>
                  <input
                    type="date"
                    value={formData.last_date || ""}
                    onChange={(e) => setFormData({ ...formData, last_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">Expected Notification</label>
                  <input
                    type="text"
                    value={formData.expected_notification || ""}
                    onChange={(e) => setFormData({ ...formData, expected_notification: e.target.value })}
                    placeholder="e.g. 2026 Q3"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">Total Posts</label>
                  <input
                    type="number"
                    value={formData.total_posts || ""}
                    onChange={(e) => setFormData({ ...formData, total_posts: Number(e.target.value) || undefined })}
                    min={0}
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

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">Logo Image</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="text-xs text-stone-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-amber-600 file:text-white file:font-bold file:cursor-pointer"
                  />
                  {logoPreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoPreview} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-stone-200" />
                  )}
                </div>
                <p className="text-[11px] text-stone-400 mt-1">200×200px, max 500KB</p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-stone-200">
                <button type="button" onClick={closeModal} className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 font-semibold text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm disabled:opacity-50">
                  {saving ? "Saving..." : editingExam ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
