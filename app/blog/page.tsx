"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SparklesIcon, ArrowRightIcon } from "@/components/icons";
import Link from "next/link";

const POSTS = [
  {
    title: "CET 2026: कैसे तैयारी करें — 90 दिनों का प्लान",
    excerpt:
      "CET Graduation Level 2026 के लिए comprehensive 90-day preparation strategy। Subjects, mock tests और time management।",
    category: "Strategy",
    date: "Coming Soon",
    href: "#",
  },
  {
    title: "Rajasthan GK — 50 नए जिलों का Update",
    excerpt:
      "नए जिलों के साथ-साथ कला-संस्कृति, इतिहास और भूगोल का complete coverage।",
    category: "Rajasthan GK",
    date: "Coming Soon",
    href: "#",
  },
  {
    title: "REET Level 1 vs Level 2 — कौन सा चुनें?",
    excerpt:
      "दोनों levels के बीच का difference, syllabus overlap, और best fit for your career।",
    category: "Teaching",
    date: "Coming Soon",
    href: "#",
  },
];

export default function BlogPage() {
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          {POSTS.map((post) => (
            <article key={post.title} className="card-base p-5">
              <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">
                {post.category}
              </span>
              <h2 className="font-bold text-slate-900 text-base mt-3 leading-snug">
                {post.title}
              </h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed line-clamp-3">
                {post.excerpt}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-semibold">{post.date}</span>
                <Link
                  href={post.href}
                  className="text-xs font-bold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1"
                >
                  Read <ArrowRightIcon size={12} />
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="card-base p-8 mt-8 text-center">
          <SparklesIcon size={32} className="text-amber-700 mx-auto" />
          <h3 className="font-bold text-slate-900 mt-3">More posts coming soon</h3>
          <p className="text-xs text-slate-500 mt-1">
            Subscribe to our newsletter to get latest exam updates.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
