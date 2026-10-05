import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SparklesIcon, ArrowRightIcon } from "@/components/icons";
import Link from "next/link";
import { getSiteUrl, toMetaDescription } from "@/lib/seo";
import { fetchActiveBlogPostsServer } from "@/lib/blog";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  const title = "Blog — Exam Tips, Syllabus Guides & Study Strategy | Arkado";
  const description = toMetaDescription(
    "Arkado blog: SSC, CET, Rajasthan aur teaching exams ke liye syllabus guides, 90-day study plans, preparation strategy aur exam updates."
  );
  return {
    title,
    description,
    alternates: { canonical: `${siteUrl}/blog` },
    openGraph: { title, description, url: `${siteUrl}/blog`, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

export default async function BlogPage() {
  const posts = await fetchActiveBlogPostsServer();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar cartCount={0} onCartClick={() => {}} />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-amber-800 bg-amber-50 border border-amber-100 px-3 py-1 rounded-full">
            <SparklesIcon size={12} />
            Blog
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mt-3">
            Exam Tips & Study Strategies
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Latest exam updates, preparation tips, and study material reviews.
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="card-base p-8 mt-8 text-center">
            <SparklesIcon size={32} className="text-amber-700 mx-auto" />
            <h3 className="font-bold text-slate-900 mt-3">More posts coming soon</h3>
            <p className="text-xs text-slate-500 mt-1">
              Hum exam guides aur strategy articles jald publish karenge.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            {posts.map((post) => (
              <article key={post.id} className="card-base p-5 flex flex-col">
                {post.cover_image && (
                  <img
                    src={post.cover_image}
                    alt={post.title}
                    className="w-full h-36 object-cover rounded-xl mb-3 border border-slate-100"
                    loading="lazy"
                  />
                )}
                <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded w-fit">
                  {post.category}
                </span>
                <h2 className="font-bold text-slate-900 text-base mt-3 leading-snug">
                  <Link href={`/blog/${post.slug}`} className="hover:text-amber-800 transition">
                    {post.title}
                  </Link>
                </h2>
                {post.excerpt && (
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed line-clamp-3">{post.excerpt}</p>
                )}
                <div className="mt-auto pt-3 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold">{fmtDate(post.created_at)}</span>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1"
                  >
                    Read <ArrowRightIcon size={12} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
