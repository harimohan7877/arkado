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

export async function GET(req: NextRequest) {
  if (!(await verifyAdminSession(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const posts = await readPosts();
    return NextResponse.json({ posts }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
  } catch {
    return NextResponse.json({ posts: [] });
  }
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdminSession(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const title = String(body.title || "").trim();
    if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

    const posts = await readPosts();
    const now = new Date().toISOString();
    let slug = slugifyBlogTitle(String(body.slug || title));
    // ensure unique slug
    let n = 2;
    const base = slug;
    while (posts.some((p) => p.slug === slug)) slug = `${base}-${n++}`;

    const post: BlogPost = {
      id: `blog_${Date.now()}`,
      title,
      slug,
      category: String(body.category || "General").trim() || "General",
      excerpt: String(body.excerpt || "").trim().slice(0, 300),
      content: String(body.content || "").trim(),
      cover_image: String(body.cover_image || "").trim() || undefined,
      is_active: body.is_active !== false,
      created_at: now,
      updated_at: now,
    };

    posts.unshift(post);
    await setStoreData(BLOG_KEY, BLOG_FILE, posts);
    return NextResponse.json({ success: true, post });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create post" }, { status: 500 });
  }
}
