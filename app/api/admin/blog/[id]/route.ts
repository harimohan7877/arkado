import { NextRequest, NextResponse } from "next/server";
import { getStoreData, setStoreData } from "@/lib/store-data";
import { verifyAdminSession } from "@/lib/admin-auth";
import { slugifyBlogTitle, type BlogPost } from "@/lib/blog";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BLOG_KEY = "blog_posts";
const BLOG_FILE = "data/blog.json";

async function readPosts(): Promise<BlogPost[]> {
  const posts = await getStoreData<BlogPost[]>(BLOG_KEY, BLOG_FILE, []);
  return Array.isArray(posts) ? posts : [];
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminSession(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const posts = await readPosts();
    const idx = posts.findIndex((p) => p.id === id);
    if (idx === -1) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const updated: BlogPost = {
      ...posts[idx],
      title: body.title !== undefined ? String(body.title).trim() : posts[idx].title,
      category: body.category !== undefined ? String(body.category).trim() || "General" : posts[idx].category,
      excerpt: body.excerpt !== undefined ? String(body.excerpt).trim().slice(0, 300) : posts[idx].excerpt,
      content: body.content !== undefined ? String(body.content).trim() : posts[idx].content,
      cover_image: body.cover_image !== undefined ? String(body.cover_image).trim() || undefined : posts[idx].cover_image,
      is_active: body.is_active !== undefined ? body.is_active !== false : posts[idx].is_active,
      updated_at: new Date().toISOString(),
    };

    if (body.slug !== undefined || body.title !== undefined) {
      let slug = slugifyBlogTitle(String(body.slug || updated.title));
      let n = 2;
      const base = slug;
      while (posts.some((p) => p.slug === slug && p.id !== id)) slug = `${base}-${n++}`;
      updated.slug = slug;
    }

    if (!updated.title) return NextResponse.json({ error: "Title required" }, { status: 400 });

    posts[idx] = updated;
    await setStoreData(BLOG_KEY, BLOG_FILE, posts);
    return NextResponse.json({ success: true, post: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update post" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminSession(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const posts = await readPosts();
    const filtered = posts.filter((p) => p.id !== id);
    if (filtered.length === posts.length) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    await setStoreData(BLOG_KEY, BLOG_FILE, filtered);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete post" }, { status: 500 });
  }
}
