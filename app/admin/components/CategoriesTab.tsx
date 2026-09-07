"use client";

import { useState, useEffect, startTransition } from "react";

interface Exam {
  id: string;
  category_id: string;
  name: string;
  short_name: string;
  board: string;
  logo_url?: string;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
  name_hi?: string;
  icon: string;
  logo_url?: string;
  color: string;
  priority: number;
  is_active: boolean;
  exam_ids: string[];
  created_at: string;
  updated_at: string;
}

interface CategoriesTabProps {
  getAuthHeaders: () => Record<string, string>;
}

const COLOR_CHOICES = [
  { value: "bg-indigo-600", label: "Indigo" },
  { value: "bg-rose-600", label: "Rose" },
  { value: "bg-amber-600", label: "Amber" },
  { value: "bg-emerald-600", label: "Emerald" },
  { value: "bg-sky-600", label: "Sky" },
  { value: "bg-violet-600", label: "Violet" },
  { value: "bg-slate-700", label: "Slate" },
  { value: "bg-teal-700", label: "Teal" },
];

const ICON_CHOICES = ["🏛️", "🛡️", "📚", "🚂", "⚖️", "🏦", "💻", "🌾", "🏥", "✈️", "🚢", "📊", "🎓", "🏫", "📋"];

export default function CategoriesTab({ getAuthHeaders }: CategoriesTabProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<Partial<Category>>({
    name: "",
    name_hi: "",
    icon: "🏛️",
    color: "bg-indigo-600",
    priority: 1,
    is_active: true,
    exam_ids: [],
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [search, setSearch] = useState("");
  const [examSearch, setExamSearch] = useState("");

  const fetchAll = async () => {
    try {
      const [catRes, examRes] = await Promise.all([
        fetch("/api/admin/categories", { headers: getAuthHeaders() }),
        fetch("/api/admin/exams", { headers: getAuthHeaders() }),
      ]);
      if (catRes.ok) setCategories(await catRes.json());
      if (examRes.ok) setAllExams(await examRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startTransition(() => {
      fetchAll();
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
    setEditingCategory(null);
    setFormData({
      name: "",
      name_hi: "",
      icon: "🏛️",
      color: "bg-indigo-600",
      priority: categories.length + 1,
      is_active: true,
      exam_ids: [],
    });
    setLogoFile(null);
    setLogoPreview(null);
    setExamSearch("");
    setShowModal(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({ ...cat });
    setLogoFile(null);
    setLogoPreview(cat.logo_url || null);
    setExamSearch("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setLogoFile(null);
    setLogoPreview(null);
    setExamSearch("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === "exam_ids") fd.append(key, JSON.stringify(value || []));
        else if (value !== undefined && value !== null) fd.append(key, String(value));
      });
      if (logoFile) fd.append("logo", logoFile);

      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : "/api/admin/categories";

      const res = await fetch(url, {
        method: editingCategory ? "PUT" : "POST",
        headers: { Authorization: getAuthHeaders().Authorization },
        body: fd,
      });

      if (res.ok) {
        setMessage({ type: "success", text: editingCategory ? "Category updated!" : "Category created!" });
        fetchAll();
        closeModal();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category? Exams will not be deleted but will lose their category link.")) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        fetchAll();
        setMessage({ type: "success", text: "Category deleted" });
      }
    } catch {
      setMessage({ type: "error", text: "Delete failed" });
    }
  };

  const handleToggleActive = async (cat: Category) => {
    try {
      await fetch(`/api/admin/categories/${cat.id}`, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !cat.is_active }),
      });
      fetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleExam = (examId: string) => {
    const current = formData.exam_ids || [];
    if (current.includes(examId)) {
      setFormData({ ...formData, exam_ids: current.filter((id) => id !== examId) });
    } else {
      setFormData({ ...formData, exam_ids: [...current, examId] });
    }
  };

  const filteredCategories = categories
    .filter((c) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.name_hi || "").toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a.priority - b.priority);

  const filteredExams = allExams.filter((e) => {
    if (!examSearch.trim()) return true;
    const q = examSearch.toLowerCase();
    return e.name.toLowerCase().includes(q) || e.short_name.toLowerCase().includes(q) || e.board.toLowerCase().includes(q);
  });

  if (loading) return <div className="py-12 text-center text-stone-500 bg-white rounded-2xl border border-stone-200">Loading categories...</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900">Categories</h2>
          <p className="text-stone-500 text-sm">Manage exam-issuing bodies. Each category links to one or more exams.</p>
        </div>
        <button onClick={openCreateModal} className="self-start sm:self-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl transition-all">
          + Add Category
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
          placeholder="Search categories..."
          className="w-full px-4 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
        />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="p-4 text-left">Category</th>
              <th className="p-4 text-left">Body / Organization</th>
              <th className="p-4 text-center">Exams</th>
              <th className="p-4 text-center">Order</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredCategories.map((cat) => (
              <tr key={cat.id} className="hover:bg-stone-50">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {cat.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cat.logo_url} alt={cat.name} className="w-10 h-10 rounded-xl object-cover border border-stone-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-xl">
                        {cat.icon}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-stone-900 text-sm">{cat.name}</p>
                      <p className="text-[11px] text-stone-400 font-mono">{cat.id}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-sm text-stone-700">{cat.name_hi || "—"}</td>
                <td className="p-4 text-center">
                  <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                    {cat.exam_ids.length}
                  </span>
                </td>
                <td className="p-4 text-center text-sm font-semibold text-stone-700">{cat.priority}</td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => handleToggleActive(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-bold ${cat.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-stone-100 text-stone-500 border border-stone-200"}`}
                  >
                    {cat.is_active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEditModal(cat)} className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(cat.id)} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-semibold rounded-lg">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredCategories.length === 0 && (
          <div className="p-12 text-center text-stone-400 text-sm">
            No categories found.
          </div>
        )}
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {filteredCategories.map((cat) => (
          <div key={cat.id} className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              {cat.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cat.logo_url} alt={cat.name} className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-2xl shrink-0">
                  {cat.icon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-stone-900 text-sm">{cat.name}</p>
                <p className="text-xs text-stone-500 line-clamp-2">{cat.name_hi || cat.id}</p>
              </div>
              <button
                onClick={() => handleToggleActive(cat)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${cat.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-stone-100 text-stone-500 border border-stone-200"}`}
              >
                {cat.is_active ? "Active" : "Off"}
              </button>
            </div>
            <div className="flex items-center gap-4 text-xs text-stone-600">
              <span>
                <strong className="text-stone-900">{cat.exam_ids.length}</strong> exams
              </span>
              <span>
                Order: <strong className="text-stone-900">{cat.priority}</strong>
              </span>
            </div>
            <div className="flex gap-2 pt-2 border-t border-stone-100">
              <button onClick={() => openEditModal(cat)} className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg">
                Edit
              </button>
              <button onClick={() => handleDelete(cat.id)} className="flex-1 py-2 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg">
                Delete
              </button>
            </div>
          </div>
        ))}
        {filteredCategories.length === 0 && (
          <div className="p-12 text-center text-stone-400 text-sm bg-white border border-stone-200 rounded-2xl">
            No categories found.
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
                {editingCategory ? "Edit Category" : "New Category"}
              </h3>
              <button onClick={closeModal} className="w-9 h-9 rounded-lg hover:bg-stone-100 text-stone-500 flex items-center justify-center">
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">Name (English) *</label>
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g. RSMSSB"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">Body / Organization (Hindi)</label>
                  <input
                    type="text"
                    value={formData.name_hi || ""}
                    onChange={(e) => setFormData({ ...formData, name_hi: e.target.value })}
                    placeholder="राजस्थान कर्मचारी चयन बोर्ड, जयपुर"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-2">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {ICON_CHOICES.map((ic) => (
                    <button
                      type="button"
                      key={ic}
                      onClick={() => setFormData({ ...formData, icon: ic })}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center border-2 transition ${
                        formData.icon === ic ? "border-amber-500 bg-amber-50" : "border-stone-200 hover:border-stone-300 bg-white"
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-2">Color Theme</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_CHOICES.map((c) => (
                    <button
                      type="button"
                      key={c.value}
                      onClick={() => setFormData({ ...formData, color: c.value })}
                      className={`px-3 h-9 rounded-xl text-xs font-bold border-2 transition ${
                        formData.color === c.value ? "border-amber-500 bg-amber-50 text-amber-700" : "border-stone-200 text-stone-600 hover:border-stone-300 bg-white"
                      }`}
                    >
                      <span className={`inline-block w-3 h-3 rounded-full ${c.value} mr-1.5 align-middle`} />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">Priority (Order)</label>
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
                <label className="block text-xs font-bold text-stone-600 mb-1">Logo Image (Optional)</label>
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
                <p className="text-[11px] text-stone-400 mt-1">200×200px recommended, max 500KB</p>
              </div>

              {/* Exam linking */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-stone-600">Linked Exams ({formData.exam_ids?.length || 0})</label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, exam_ids: filteredExams.map((e) => e.id) })}
                    className="text-[11px] text-amber-700 font-bold hover:underline"
                  >
                    Select all visible
                  </button>
                </div>
                <input
                  type="text"
                  value={examSearch}
                  onChange={(e) => setExamSearch(e.target.value)}
                  placeholder="Search exams by name, short name, board..."
                  className="w-full px-3.5 py-2 mb-2 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
                />
                <div className="border border-stone-200 rounded-xl max-h-56 overflow-y-auto divide-y divide-stone-100">
                  {filteredExams.length === 0 ? (
                    <div className="p-4 text-center text-stone-400 text-xs">No exams found</div>
                  ) : (
                    filteredExams.map((exam) => {
                      const checked = (formData.exam_ids || []).includes(exam.id);
                      return (
                        <label
                          key={exam.id}
                          className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-stone-50 ${checked ? "bg-amber-50" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleExam(exam.id)}
                            className="w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-stone-900 truncate">{exam.name}</p>
                            <p className="text-[11px] text-stone-500 truncate">
                              {exam.short_name} • {exam.board}
                            </p>
                          </div>
                          {!exam.is_active && (
                            <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">Inactive</span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 font-semibold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingCategory ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
