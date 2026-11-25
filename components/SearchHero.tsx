"use client";

import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import { categoryIconFor } from "@/lib/category-icons";

/**
 * Ticket 10 — search-first hero (WIRED LIVE via the ticket-10 diff,
 * commit 47d7be9 — replaces the hero case's sidebar + rotating banner +
 * mobile chips ribbon with <SearchHero />).
 *
 * Spec (audit ticket 10): one site-purpose H1, descriptive English copy, a
 * working search field, four direct verified category links, and a compact
 * card for one approved real sample. No rotating banner, no giant
 * decorative badges, no promotions above discovery.
 *
 * Phase 1 (2026-11-25): hero converted to full English (H1, sub-line,
 * search label, sample button) — the rest of the site funnel (nav, search
 * placeholder, checkout, product titles) is English, so the Hindi H1 was
 * the odd one out. H1 matches the site title tag.
 * Phase 1 item 7: honest CBT mention only — the sub-line names CBT practice
 * and one compact link points at the real, verified on-site SSC MTS demo
 * (20 questions). NO "Downloadable CBT", NO "Explore CBT Bundles", NO
 * delivery claim: full-CBT fulfillment does not exist (see
 * cbt-full-onsite-spec.md). The demo is a free preview, never presented as
 * a full-kit test or as downloadable.
 *
 * Verified facts behind this component (2026-11-25):
 * - Category links: /category/ssc, /category/rajasthan, /category/railways,
 *   /category/banking — all four exist in data/categories.json (7, 46, 7, 7
 *   exams). "Rajasthan CET" points at the Rajasthan category, which holds
 *   both CET exams (12th level id 1001, graduate level id 1002).
 * - Sample: SSC CGL 2026 English sampler, Drive
 *   1S00asrlGIL_EqsC_SOSc7SdNwVfK_-bi — downloaded + pdftotext-checked:
 *   "SSC CGL" 11×, "SSC MTS" 0×, 8 pages, kit ₹49/₹199
 *   (ssc-cgl-english-1000-mcq-book). Pass different props to feature
 *   another verified sample; never point this card at an unverified file.
 * - Tokens are the ticket's PROPOSED palette (globals.css --hero-*):
 *   paper #FAF7F0, ink #1C1917, secondary #57534E.
 * - ACTION COLOUR (Harimohan's decision, 2026-11-25): the site's EXISTING
 *   action colour #B45309 (amber-700, 5.02:1) is used everywhere in this
 *   component — the proposed #9A3E0A (6.85:1) is NOT used, so the page does
 *   not carry two different oranges. The --hero-action token still exists
 *   in globals.css but nothing on this page references it.
 *   (Current brand #B45309 is 5.02:1 — the 6.85 figure belongs to the
 *   proposed #9A3E0A, not to current code.)
 * - HomeClient renders no other <h1>, so this is the page's only H1.
 * - SearchBar's capsule is 46px tall (spec asks ~48px); left as-is rather
 *   than forking the shared search for 2px.
 */

const POPULAR_CATEGORIES = [
  { id: "ssc", label: "SSC", href: "/category/ssc" },
  { id: "rajasthan", label: "Rajasthan CET", href: "/category/rajasthan" },
  { id: "railways", label: "Railway", href: "/category/railways" },
  { id: "banking", label: "Banking", href: "/category/banking" },
];

const DEFAULT_SAMPLE = {
  title: "SSC CGL 2026 : English Comprehension (अंग्रेजी) 1,000 MCQs Practice Book",
  url: "https://drive.google.com/file/d/1S00asrlGIL_EqsC_SOSc7SdNwVfK_-bi/view",
  price: 49,
  detail: "English Comprehension • 1,000 MCQs • 8-page sampler",
};

interface SearchHeroProps {
  /** Override the featured sample — only with a verified real sample file. */
  sampleTitle?: string;
  sampleUrl?: string;
  samplePrice?: number;
  sampleDetail?: string;
}

export default function SearchHero({
  sampleTitle = DEFAULT_SAMPLE.title,
  sampleUrl = DEFAULT_SAMPLE.url,
  samplePrice = DEFAULT_SAMPLE.price,
  sampleDetail = DEFAULT_SAMPLE.detail,
}: SearchHeroProps) {
  return (
    <section className="bg-hero-paper border-b border-stone-200">
      <div className="max-w-[1200px] mx-auto px-4 py-6 sm:py-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          {/* Left (58% on desktop): purpose + search */}
          <div className="md:col-span-7">
            <h1
              className="text-[28px] sm:text-[30px] lg:text-[42px] leading-[1.3] lg:leading-[1.2] font-black text-hero-ink"
            >
              All-India Exam Notes, MCQs &amp; Mock Tests
            </h1>
            <p className="mt-2 text-base leading-[25px] text-hero-secondary">
              Pattern-decoded notes, solved MCQs, mock tests &amp; CBT practice.
            </p>

            <div className="mt-5">
              <span
                id="hero-search-label"
                className="block text-sm font-bold text-hero-ink mb-2"
              >
                Search by exam
              </span>
              <div className="min-h-[48px]">
                <SearchBar />
              </div>
              <p className="mt-2 text-xs text-hero-secondary">
                Example: SSC CGL, Rajasthan CET
              </p>
              {/* Item 7: honest CBT mention — links the real, verified
                  on-site SSC MTS demo (20 questions, HTTP 200, 2026-11-25).
                  Free preview only: not a full-kit test, not downloadable. */}
              <a
                href="/mock-tests/ssc-mts-20q-demo-cbt-simulator.html"
                className="inline-block mt-2 text-xs font-bold text-amber-700 hover:text-amber-800 transition cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-700 focus-visible:outline-offset-2"
              >
                Try free CBT demo · SSC MTS, 20 questions →
              </a>
            </div>
          </div>

          {/* Right (42% on desktop): one approved real sample.
              On mobile this stacks right after search, before categories. */}
          <div className="md:col-span-5">
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="w-12 h-16 rounded-md bg-hero-paper border border-stone-200 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] font-black text-amber-700">PDF</span>
                  <span className="text-[9px] font-bold text-hero-secondary">8 pages</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                    Free sample — real material
                  </p>
                  <h2 className="text-sm font-bold text-hero-ink leading-snug mt-1 line-clamp-3">
                    {sampleTitle}
                  </h2>
                  <p className="text-xs text-hero-secondary mt-1">{sampleDetail}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 mt-4">
                <span className="text-sm font-black text-hero-ink">
                  Full kit ₹{samplePrice}
                </span>
                <a
                  href={sampleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-full text-sm font-bold transition cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-700 focus-visible:outline-offset-2 active:scale-[0.98]"
                >
                  View Sample PDF
                </a>
              </div>
            </div>
          </div>

          {/* Popular categories — left column on desktop, after the sample on mobile */}
          <div className="md:col-span-7">
            <p className="text-xs font-bold uppercase tracking-wider text-hero-secondary mb-2">
              Popular choices
            </p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_CATEGORIES.map((c) => {
                const ChipIcon = categoryIconFor(c.id);
                return (
                  <Link
                    key={c.href}
                    href={c.href}
                    className="px-4 py-2 rounded-full bg-white border border-stone-200 text-sm font-bold text-hero-ink hover:border-amber-700 hover:text-amber-700 transition cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-700 focus-visible:outline-offset-2 active:scale-[0.98] flex items-center gap-1.5"
                  >
                    <ChipIcon size={15} className="shrink-0" />
                    {c.label}
                  </Link>
                );
              })}
            </div>
            {/* View all categories — /exams is the exam directory (a real
                route that always exists). No separate categories index route
                exists; the in-page #categories section is enabled live but
                can be switched off in admin, so the hero does not anchor to
                it. */}
            <Link
              href="/exams"
              className="inline-block mt-3 text-sm font-bold text-amber-700 hover:text-amber-800 transition cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-700 focus-visible:outline-offset-2 active:scale-[0.98]"
            >
              View all categories →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
