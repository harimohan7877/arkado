import { getStoreData } from "@/lib/store-data";

export interface BlogPost {
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

const BLOG_KEY = "blog_posts";
const BLOG_FILE = "data/blog.json";

/** URL-safe slug from a title. Never throws. */
export function slugifyBlogTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    // keep latin + devanagari letters/numbers, drop the rest
    .replace(/[^a-z0-9\u0900-\u097f\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || `post-${Date.now()}`;
}

/** Server-side fetch of all blog posts. Never throws. */
export async function fetchBlogPostsServer(): Promise<BlogPost[]> {
  try {
    const posts = await getStoreData<BlogPost[]>(BLOG_KEY, BLOG_FILE, []);
    return Array.isArray(posts) ? posts : [];
  } catch {
    return [];
  }
}

/** Active posts only, newest first. */
export async function fetchActiveBlogPostsServer(): Promise<BlogPost[]> {
  const posts = await fetchBlogPostsServer();
  return posts
    .filter((p) => p.is_active !== false)
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
}

export async function fetchBlogPostBySlugServer(slug: string): Promise<BlogPost | null> {
  const posts = await fetchActiveBlogPostsServer();
  return posts.find((p) => p.slug === slug) || null;
}

/** Split plain-text content into paragraphs (blank-line separated). */
export function blogContentToParagraphs(content: string): string[] {
  return (content || "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
