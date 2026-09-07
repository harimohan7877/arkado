"use client";

import { useState, useEffect, startTransition } from "react";

interface ProductData {
  id: string;
  title: string;
  exam_name: string;
  group_id: string | null;
  group: { name: string } | null;
  type: string;
  price: number;
  sale_price: number;
  pages: number | null;
  language: string;
  file_url: string | null;
  cover_image: string | null;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
}

interface ProductFormData {
  id: string;
  title: string;
  exam_name: string;
  group_id: string;
  type: string;
  price: string;
  sale_price: string;
  pages: string;
  language: string;
  file_url: string;
  cover_image: string;
  is_active: boolean;
  is_featured: boolean;
}

export default function ProductsTab({ getAuthHeaders }: { getAuthHeaders: () => Record<string, string> }) {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState<ProductFormData>({
    id: '', title: '', exam_name: '', group_id: '', type: 'Notes',
    price: '', sale_price: '', pages: '', language: 'Hindi',
    file_url: '', cover_image: '', is_active: true, is_featured: false,
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const [prodRes, groupRes] = await Promise.all([
        fetch('/api/admin/products', { headers: getAuthHeaders() }),
        fetch('/api/admin/groups', { headers: getAuthHeaders() }),
      ]);
      if (prodRes.ok) setProducts(await prodRes.json());
      if (groupRes.ok) setGroups(await groupRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { startTransition(() => { fetchProducts(); }); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const openDrawer = (p?: ProductData) => {
    if (p) {
      setForm({
        id: p.id,
        title: p.title,
        exam_name: p.exam_name || '',
        group_id: p.group_id || '',
        type: p.type,
        price: String(p.price),
        sale_price: String(p.sale_price),
        pages: p.pages ? String(p.pages) : '',
        language: p.language,
        file_url: p.file_url || '',
        cover_image: p.cover_image || '',
        is_active: p.is_active,
        is_featured: p.is_featured,
      });
    } else {
      setForm({
        id: '', title: '', exam_name: '', group_id: '', type: 'Notes',
        price: '', sale_price: '', pages: '', language: 'Hindi',
        file_url: '', cover_image: '', is_active: true, is_featured: false,
      });
    }
    setDrawerOpen(true);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id || !form.title) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...form,
          price: parseFloat(form.price) || 0,
          sale_price: parseFloat(form.sale_price) || 0,
          pages: form.pages ? parseInt(form.pages) : null,
        }),
      });
      if (res.ok) {
        showMsg('success', 'Product saved!');
        closeDrawer();
        fetchProducts();
      } else {
        const err = await res.json();
        showMsg('error', 'Error: ' + (err.error || 'Unknown'));
      }
    } catch {
      showMsg('error', 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Delete this product?')) return;
    try {
      const res = await fetch('/api/admin/products', {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ productId }),
      });
      if (res.ok) {
        showMsg('success', 'Product deleted!');
        fetchProducts();
      }
    } catch {
      showMsg('error', 'Delete failed');
    }
  };

  const handleToggleActive = async (p: ProductData) => {
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...p, is_active: !p.is_active }),
      });
      if (res.ok) fetchProducts();
    } catch {
      showMsg('error', 'Toggle failed');
    }
  };

  const handleToggleFeatured = async (p: ProductData) => {
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...p, is_featured: !p.is_featured }),
      });
      if (res.ok) fetchProducts();
    } catch {
      showMsg('error', 'Toggle failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">📦 Study Materials (Products)</h2>
          <p className="text-gray-400 text-sm">Manage Notes, MCQs, and Mock Test products.</p>
        </div>
        <button onClick={() => openDrawer()}
          className="bg-[#10b981] hover:bg-[#059669] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all">
          + New Product
        </button>
      </div>

      {message && (
        <div className={`p-3.5 rounded-xl text-sm border ${
          message.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400' : 'bg-red-950/40 border-red-500/20 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-2xl p-8 text-center text-gray-500">
          No products found. Create your first product!
        </div>
      ) : (
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-[#12151f] text-gray-400 text-xs border-b border-[#2a2d3a]">
                <th className="p-4 w-10">SL</th>
                <th className="p-4">Product Name</th>
                <th className="p-4">Type</th>
                <th className="p-4 text-right">Unit Price</th>
                <th className="p-4 text-center">Featured</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2d3a]">
              {products.map((p, i) => (
                <tr key={p.id} className="hover:bg-[#1f2330]">
                  <td className="p-4 text-gray-500 text-xs font-mono">{i + 1}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {(p.cover_image || p.title) && (
                        <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-[#0f1117] border border-[#2a2d3a] flex items-center justify-center text-xs text-gray-500">
                          {p.cover_image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.cover_image} alt={p.title} className="w-full h-full object-contain" />
                          ) : (
                            <span>{p.type === 'Notes' ? '📝' : p.type === 'MCQ' ? '📋' : '🎯'}</span>
                          )}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-white">{p.title}</p>
                        <p className="text-xs text-gray-500">{p.exam_name || p.group?.name || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-xs text-gray-400">{p.type}</span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="font-bold text-white">₹{Number(p.sale_price).toFixed(2)}</span>
                    {Number(p.price) > Number(p.sale_price) && (
                      <span className="text-[10px] text-gray-500 line-through ml-1.5">₹{Number(p.price).toFixed(2)}</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleToggleFeatured(p)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
                        p.is_featured
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-[#2a2d3a] text-gray-500 border border-transparent'
                      }`}
                    >
                      {p.is_featured ? '⭐ Featured' : '—'}
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleToggleActive(p)}
                      className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all ${
                        p.is_active
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-gray-800 text-gray-500 border border-gray-700'
                      }`}
                    >
                      {p.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex gap-1.5 justify-center">
                      <button onClick={() => openDrawer(p)}
                        className="text-[10px] bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 px-2 py-1 rounded-lg transition-all">
                        ✏️
                      </button>
                      <button onClick={() => handleDelete(p.id)}
                        className="text-[10px] bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 px-2 py-1 rounded-lg transition-all">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Right-side Drawer */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={closeDrawer} />
          <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-[#1a1d27] border-l border-[#2a2d3a] shadow-2xl z-50 overflow-y-auto transition-transform">
            <div className="sticky top-0 bg-[#1a1d27] border-b border-[#2a2d3a] p-4 flex justify-between items-center z-10">
              <h3 className="text-sm font-bold text-white">
                {form.id && products.find(p => p.id === form.id) ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={closeDrawer} className="text-gray-400 hover:text-white text-lg leading-none p-1">&times;</button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {/* Product ID */}
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase mb-1">Product ID (slug) <span className="text-red-400">*</span></label>
                  <input value={form.id} onChange={e => setForm({ ...form, id: e.target.value })}
                    placeholder="rsmssb-patwari-notes" required
                    className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#10b981]" />
                </div>
                {/* Type */}
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase mb-1">Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                    className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#10b981]">
                    <option value="Notes">📝 Notes</option>
                    <option value="MCQ">📋 MCQ</option>
                    <option value="Mock Test">🎯 Mock Test</option>
                  </select>
                </div>
                {/* Title */}
                <div className="col-span-2">
                  <label className="block text-[10px] text-gray-400 uppercase mb-1">Title <span className="text-red-400">*</span></label>
                  <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="RSMSSB Patwari Complete Notes" required
                    className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#10b981]" />
                </div>
                {/* Group */}
                <div className="col-span-2">
                  <label className="block text-[10px] text-gray-400 uppercase mb-1">Group</label>
                  <select value={form.group_id} onChange={e => setForm({ ...form, group_id: e.target.value })}
                    className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#10b981]">
                    <option value="">Select group...</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                {/* Exam Name */}
                <div className="col-span-2">
                  <label className="block text-[10px] text-gray-400 uppercase mb-1">Exam Name</label>
                  <input value={form.exam_name} onChange={e => setForm({ ...form, exam_name: e.target.value })}
                    placeholder="RSMSSB Patwari"
                    className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#10b981]" />
                </div>
                {/* Price */}
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase mb-1">Price (₹) <span className="text-red-400">*</span></label>
                  <input value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                    placeholder="399" type="number" step="0.01" required
                    className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#10b981]" />
                </div>
                {/* Sale Price */}
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase mb-1">Sale Price (₹) <span className="text-red-400">*</span></label>
                  <input value={form.sale_price} onChange={e => setForm({ ...form, sale_price: e.target.value })}
                    placeholder="149" type="number" step="0.01" required
                    className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#10b981]" />
                </div>
                {/* Pages */}
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase mb-1">Pages</label>
                  <input value={form.pages} onChange={e => setForm({ ...form, pages: e.target.value })}
                    placeholder="420" type="number"
                    className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#10b981]" />
                </div>
                {/* Language */}
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase mb-1">Language</label>
                  <select value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}
                    className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#10b981]">
                    <option value="Hindi">Hindi</option>
                    <option value="English">English</option>
                    <option value="Bilingual">Bilingual</option>
                  </select>
                </div>
                {/* Cover Image Upload / URL */}
                <div className="col-span-2">
                  <label className="block text-[10px] text-gray-400 uppercase mb-1">Cover Image</label>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-14 h-14 rounded-lg overflow-hidden border border-[#2a2d3a] bg-[#0f1117] flex items-center justify-center flex-shrink-0">
                      {form.cover_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={form.cover_image} alt="cover preview" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-xs text-gray-600">No img</span>
                      )}
                    </div>
                    <label className="cursor-pointer bg-[#2a2d3a] hover:bg-[#3a3d4d] text-gray-300 text-xs px-3 py-2 rounded-xl transition-colors">
                      Upload Image
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const dataUrl = ev.target?.result as string;
                          setForm({ ...form, cover_image: dataUrl });
                        };
                        reader.readAsDataURL(file);
                      }} />
                    </label>
                  </div>
                  <input value={form.cover_image} onChange={e => setForm({ ...form, cover_image: e.target.value })}
                    placeholder="Ya URL daalein: /images/products/patwari-notes.jpg"
                    className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#10b981]" />
                </div>
                {/* Notes Access Link */}
                <div className="col-span-2">
                  <label className="block text-[10px] text-gray-400 uppercase mb-1">
                    Notes Access Link <span className="text-gray-600">(file_url)</span>
                  </label>
                  <input value={form.file_url} onChange={e => setForm({ ...form, file_url: e.target.value })}
                    placeholder="https://drive.google.com/file/d/..."
                    className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#10b981]" />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2 border-t border-[#2a2d3a]">
                {/* Active toggle */}
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={form.is_active}
                      onChange={e => setForm({ ...form, is_active: e.target.checked })}
                      className="sr-only peer" />
                    <div className="w-9 h-5 bg-[#2a2d3a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#10b981]" />
                  </label>
                  <span className="text-sm text-gray-300">
                    {form.is_active ? 'Active (visible on site)' : 'Inactive (hidden)'}
                  </span>
                </div>

                {/* Featured toggle */}
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={form.is_featured}
                      onChange={e => setForm({ ...form, is_featured: e.target.checked })}
                      className="sr-only peer" />
                    <div className="w-9 h-5 bg-[#2a2d3a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
                  </label>
                  <span className="text-sm text-gray-300">
                    {form.is_featured ? '⭐ Show as Featured on Homepage' : 'Show as Featured on Homepage'}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#2a2d3a]">
                <button type="submit" disabled={saving}
                  className="px-5 py-2 bg-[#10b981] hover:bg-[#059669] text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50">
                  {saving ? 'Saving...' : '💾 Save Product'}
                </button>
                <button type="button" onClick={closeDrawer}
                  className="px-5 py-2 bg-[#2a2d3a] text-gray-400 rounded-xl text-sm hover:text-white transition-all">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
