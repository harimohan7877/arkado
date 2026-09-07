"use client";

import { useState } from "react";
import Image from "next/image";

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

export default function CategoriesTab({ getAuthHeaders }: CategoriesTabProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<Partial<Category>>({
    name: "", name_hi: "", icon: "📁", color: "bg-blue-600", priority: 1, is_active: true, exam_ids: []
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const COLORS = [
    "bg-indigo-600", "bg-red-600", "bg-purple-600", "bg-orange-600",
    "bg-emerald-600", "bg-blue-700", "bg-amber-600", "bg-pink-600"
  ];

  const ICONS = ["🏛️", "🛡️", "📚", "🚂", "⚖️", "🏦", "💻", "🌾", "🏥", "✈️", "🚢", "📊"];

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/admin/categories", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({ name: "", name_hi: "", icon: "📁", color: "bg-blue-600", priority: categories.length + 1, is_active: true, exam_ids: [] });
    setLogoFile(null);
    setLogoPreview(null);
    setShowModal(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({ ...cat });
    setLogoFile(null);
    setLogoPreview(cat.logo_url || null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === "exam_ids") {
          formDataToSend.append(key, JSON.stringify(value || []));
        } else if (value !== undefined && value !== null) {
          formDataToSend.append(key, String(value));
        }
      });
      if (logoFile) formDataToSend.append("logo", logoFile);

      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : "/api/admin/categories";

      const res = await fetch(url, {
        method: editingCategory ? "PUT" : "POST",
        headers: { Authorization: getAuthHeaders().Authorization },
        body: formDataToSend,
      });

      if (res.ok) {
        setMessage({ type: "success", text: editingCategory ? "Category updated!" : "Category created!" });
        fetchCategories();
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
    if (!confirm("Delete this category? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        fetchCategories();
        setMessage({ type: "success", text: "Category deleted" });
      }
    } catch (err) {
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
      fetchCategories();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="py-12 text-center text-neutral-500">Loading categories...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Categories Management</h2>
          <p className="text-neutral-400 text-sm">Manage exam categories with icons, colors, and logos.</p>
        </div>
        <button onClick={openCreateModal} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all">
          + Add Category
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
              <th className="p-4 text-left">Icon / Color</th>
              <th className="p-4 text-left">Priority</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-left">Exams</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-neutral-950/50">
                <td className="p-4">
                  {cat.logo_url ? (
                    <img src={cat.logo_url} alt={cat.name} className="w-12 h-12 rounded-xl object-cover border border-neutral-700" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-2xl">
                      {cat.icon}
                    </div>
                  )}
                </td>
                <td className="p-4">
                  <p className="font-semibold text-white">{cat.name}</p>
                  {cat.name_hi && <p className="text-xs text-neutral-500">{cat.name_hi}</p>}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cat.icon}</span>
                    <div className={`w-6 h-6 rounded-lg ${cat.color}`}></div>
                  </div>
                </td>
                <td className="p-4 text-sm font-medium text-neutral-300">{cat.priority}</td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => handleToggleActive(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-bold ${cat.is_active ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-neutral-800 text-neutral-500 border border-neutral-700"}`}
                  >
                    {cat.is_active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="p-4 text-sm text-neutral-400">{cat.exam_ids.length} exams</td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEditModal(cat)} className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium rounded-lg transition">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(cat.id)} className="px-3 py-1.5 bg-red-950/30 hover:bg-red-950/50 border border-red-500/20 text-red-400 text-xs font-medium rounded-lg transition">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {categories.length === 0 && (
          <div className="p-12 text-center text-neutral-500">
            No categories yet. Click "Add Category" to create one.
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={closeModal} />
          <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">{editingCategory ? "Edit Category" : "New Category"}</h3>
              <button onClick={closeModal} className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 flex items-center justify-center">✕</button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Name (English) *</label>
                  <input type="text" value={formData.name || ""} onChange={e => setFormData({ ...formData, name: e.target.value })} required className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Name (Hindi)</label>
                  <input type="text" value={formData.name_hi || ""} onChange={e => setFormData({ ...formData, name_hi: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Icon</label>
                  <div className="flex flex-wrap gap-2">
                    {ICONS.map(ic => (
                      <button type="button" key={ic} onClick={() => setFormData({ ...formData, icon: ic })} className={`w-10 h-10 rounded-xl text-2xl flex items-center justify-center border-2 transition ${formData.icon === ic ? "border-emerald-500 bg-emerald-500/10" : "border-neutral-700 hover:border-neutral-600"}`}>
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Color Theme</label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map(c => (
                      <button type="button" key={c} onClick={() => setFormData({ ...formData, color: c })} className={`w-10 h-10 rounded-xl border-2 transition ${formData.color === c ? "border-emerald-500 scale-110" : "border-neutral-700 hover:border-neutral-600"} ${c}`}></button>
                    ))}
                  </div>
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
                  {logoPreview && (
                    <img src={logoPreview} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-neutral-700" />
                  )}
                  {formData.logo_url && !logoPreview && !logoFile && (
                    <img src={formData.logo_url} alt="Current" className="w-16 h-16 rounded-xl object-cover border border-neutral-700 opacity-60" />
                  )}
                </div>
                <p className="text-xs text-neutral-500 mt-1">Recommended: 200x200px, PNG/JPG/WebP, max 500KB</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                <button type="button" onClick={closeModal} className="px-5 py-2.5 rounded-xl border border-neutral-700 text-neutral-300 hover:bg-neutral-800 font-medium transition">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black transition disabled:opacity-50">
                  {saving ? "Saving..." : (editingCategory ? "Update" : "Create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}