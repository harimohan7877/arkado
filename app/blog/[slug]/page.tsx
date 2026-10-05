import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { getSiteUrl, absoluteImageUrl, toMetaDescription } from "@/lib/seo";
import { fetchBlogPostBySlugServer, blogContentToParagraphs } from "@/lib/blog";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }> | { slug: string };
}

async function resolveSlug(params: PageProps["params"]): Promise<string> {
  const resolved = await Promise.resolve(params);
  return resolved.slug;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "";
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  try {
    const slug = await resolveSlug(params);
    const post = await fetchBlogPostBySlugServer(slug);
    if (!post) return {};

    const title = `${post.title} | Arkado Blog`;
    const description = toMetaDescription(post.excerpt || post.title);
    const url = `${siteUrl}/blog/${post.slug}`;
    const image = absoluteImageUrl(post.cover_image);

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        type: "article",
        siteName: "Arkado",
        title,
        description,
        url,
        publishedTime: post.created_at,
        modifiedTime: post.updated_at,
        ...(image ? { images: [{ url: image, alt: post.title }] } : {}),
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        ...(image ? { images: [image] } : {}),
      },
    };
  } catch {
    return {};
  }
}

export default async function BlogArticlePage({ params }: PageProps) {
  const siteUrl = getSiteUrl();
  const slug = await resolveSlug(params);
  const post = await fetchBlogPostBySlugServer(slug);
  if (!post) notFound();

  const image = absoluteImageUrl(post.cover_image);
  const paragraphs = blogContentToParagraphs(post.content);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: toMetaDescription(post.excerpt || post.title, 300),
    ...(image ? { image } : {}),
    author: { "@type": "Organization", name: "Arkado", url: siteUrl },
    publisher: { "@type": "Organization", name: "Arkado", url: siteUrl },
    datePublished: post.created_at,
    dateModified: post.updated_at,
    mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar cartCount={0} onCartClick={() => {}} />

        <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <Link
            href="/blog"
            className="text-xs font-bold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1 mb-6"
          >
            ← Saare articles
          </Link>

          <span className="inline-block text-[10px] font-bold uppercase text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">
            {post.category}
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 mt-3 leading-tight">{post.title}</h1>
          <p className="text-xs text-slate-400 font-semibold mt-2">
            {fmtDate(post.created_at)} • Arkado
          </p>

          {image && (
            <img
              src={image}
              alt={post.title}
              className="w-full rounded-2xl mt-6 border border-slate-100 object-cover max-h-80"
            />
          )}

          {post.excerpt && (
            <p className="text-base sm:text-lg text-slate-700 font-medium leading-relaxed mt-6 border-l-4 border-amber-500 pl-4">
              {post.excerpt}
            </p>
          )}

          <div className="mt-6 space-y-5">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-slate-700 text-sm sm:text-base leading-relaxed">
                {p}
              </p>
            ))}
          </div>

          <div className="mt-10 p-6 rounded-2xl bg-amber-50 border border-amber-100 text-center">
            <p className="font-bold text-slate-900">Taiyaari ko next level par le jao</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Pattern-decoded notes, topic-weightage analysis aur MCQs — seedha WhatsApp par.
            </p>
            <Link
              href="/exams"
              className="inline-block px-6 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-sm font-bold rounded-xl transition"
            >
              Study Material Dekho
            </Link>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
