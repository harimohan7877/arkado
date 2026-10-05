"use client";

import { useState, useEffect } from "react";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  cover_image?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface BlogTabProps {
  getAuthHeaders: () => Record<string, string>;
}

const EMPTY_FORM = {
  title: "",
  slug: "",
  category: "General",
  excerpt: "",
  content: "",
  cover_image: "",
  is_active: true,
};

export default function BlogTab({ getAuthHeaders }: BlogTabProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/blog?t=${Date.now()}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(Array.isArray(data.posts) ? data.posts : []);
      }
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flash = (type: "ok" | "err", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  };

  const openEdit = (p: BlogPost) => {
    setEditing(p);
    setForm({
      title: p.title,
      slug: p.slug,
      category: p.category,
      excerpt: p.excerpt,
      content: p.content,
      cover_image: p.cover_image || "",
      is_active: p.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      flash("err", "Title zaroori hai");
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/admin/blog/${editing.id}` : "/api/admin/blog";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      flash("ok", editing ? "Post update ho gaya" : "Naya post jud gaya");
      setShowModal(false);
      load();
    } catch (e: any) {
      flash("err", e.message || "Save nahi hua");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: BlogPost) => {
    try {
      const res = await fetch(`/api/admin/blog/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ is_active: !p.is_active }),
      });
      if (!res.ok) throw new Error("Toggle failed");
      setPosts((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_active: !p.is_active } : x)));
    } catch {
      flash("err", "Status badalne mein dikkat");
    }
  };

  const handleDelete = async (p: BlogPost) => {
    if (!window.confirm(`Kya "${p.title}" ko hamesha ke liye hatana hai?`)) return;
    try {
      const res = await fetch(`/api/admin/blog/${p.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Delete failed");
      setPosts((prev) => prev.filter((x) => x.id !== p.id));
      flash("ok", "Post hata diya");
    } catch {
      flash("err", "Delete nahi hua");
    }
  };

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return "";
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 flex items-center gap-2">
            <span>✍️</span> Blog / SEO Articles
          </h2>
          <p className="text-stone-500 text-xs sm:text-sm mt-0.5">
            Google se organic traffic lao — syllabus guides, strategy articles, exam updates yahin se publish honge.
          </p>
        </div>
        <button
          onClick={openNew}
          className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-sm font-bold rounded-xl transition cursor-pointer"
        >
          + Naya Post
        </button>
      </div>

      {msg && (
        <div
          className={`p-3 rounded-xl text-sm font-semibold border ${
            msg.type === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-sm text-stone-500">Posts load ho rahe hain...</p>
        ) : posts.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-4xl mb-3">📝</p>
            <p className="font-bold text-stone-800">Abhi koi post nahi hai</p>
            <p className="text-xs text-stone-500 mt-1 mb-4">Pehla SEO article likho — "+ Naya Post" dabao.</p>
            <button
              onClick={openNew}
              className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-sm font-bold rounded-xl transition cursor-pointer"
            >
              + Pehla Post Likho
            </button>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {posts.map((p) => (
              <div key={p.id} className="p-4 flex items-start gap-3 hover:bg-stone-50 transition">
                {p.cover_image ? (
                  <img src={p.cover_image} alt="" className="w-16 h-16 rounded-xl object-cover border border-stone-200 shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-2xl shrink-0">
                    📰
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm text-stone-900 truncate">{p.title}</h3>
                    {!p.is_active && (
                      <span className="text-[10px] font-bold bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full">DRAFT</span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5 truncate">
                    /blog/{p.slug} • {p.category} • {fmtDate(p.created_at)}
                  </p>
                  {p.excerpt && <p className="text-xs text-stone-500 mt-1 line-clamp-1">{p.excerpt}</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => toggleActive(p)}
                    title={p.is_active ? "Band karo (draft)" : "Live karo"}
                    className={`w-9 h-9 rounded-lg text-sm font-bold transition cursor-pointer ${
                      p.is_active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-stone-200 text-stone-500 hover:bg-stone-300"
                    }`}
                  >
                    {p.is_active ? "●" : "○"}
                  </button>
                  <button
                    onClick={() => openEdit(p)}
                    className="w-9 h-9 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm transition cursor-pointer"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(p)}
                    className="w-9 h-9 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-sm transition cursor-pointer"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-6" onClick={() => setShowModal(false)}>
          <div
            className="bg-white w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-stone-900">{editing ? "Post Edit Karo" : "Naya Post Likho"}</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 cursor-pointer">✕</button>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700">Title *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. SSC MTS 2026: 90 Din Mein Selection Ka Plan"
                className="mt-1 w-full border border-stone-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700">Slug (URL) — khaali chhodo to auto</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="auto-generate"
                  className="mt-1 w-full border border-stone-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700">Category</label>
                <input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Strategy, Syllabus, Rajasthan GK..."
                  className="mt-1 w-full border border-stone-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700">Excerpt (Google + listing mein dikhega, ~150 akshar)</label>
              <textarea
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                rows={2}
                maxLength={300}
                placeholder="2 line mein batao ye article kis baare mein hai..."
                className="mt-1 w-full border border-stone-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700">Content (paragraphs — khaali line se alag honge)</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={10}
                placeholder={"Pehla paragraph yahan likho...\n\nDoosra paragraph — beech mein ek khaali line chhodo..."}
                className="mt-1 w-full border border-stone-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700">Cover Image URL (optional)</label>
              <input
                value={form.cover_image}
                onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
                placeholder="https://..."
                className="mt-1 w-full border border-stone-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 accent-amber-700"
              />
              Live karo (band = draft, site par nahi dikhega)
            </label>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition cursor-pointer"
              >
                {saving ? "Save ho raha..." : editing ? "Update Karo" : "Publish Karo"}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-3 border border-stone-300 text-stone-700 text-sm font-bold rounded-xl hover:bg-stone-100 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
