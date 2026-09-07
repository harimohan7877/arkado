"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CourseCard from "@/components/CourseCard";
import CartDrawer from "@/components/CartDrawer";
import SampleModal from "@/components/SampleModal";
import { Course } from "@/lib/store-types";
import { CourseBundle } from "@/lib/courses";
import { SearchIcon, WhatsappIcon } from "@/components/icons";

function SearchPageInner() {
  const params = useSearchParams();
  const q = params.get("q") || "";
  const [results, setResults] = useState<CourseBundle[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [cart, setCart] = useState<Course[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isSampleOpen, setIsSampleOpen] = useState(false);

  useEffect(() => {
    const signal = { cancelled: false };
    const loadCourses = async () => {
      try {
        const r = await fetch("/api/courses");
        const data: CourseBundle[] = await r.json();
        if (signal.cancelled) return;
        const query = q.toLowerCase().trim();
        if (!query) {
          setResults(data);
        } else {
          setResults(
            data.filter(
              (c) =>
                c.title.toLowerCase().includes(query) ||
                c.short_description.toLowerCase().includes(query) ||
                c.subjects.some((s) => s.toLowerCase().includes(query))
            )
          );
        }
        setHasLoaded(true);
      } catch {
        if (!signal.cancelled) setHasLoaded(true);
      }
    };
    void loadCourses();
    return () => {
      signal.cancelled = true;
    };
  }, [q]);

  const loading = !hasLoaded;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar cartCount={cart.length} onCartClick={() => setIsCartOpen(true)} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <div className="mb-5">
          <h1 className="text-2xl font-black text-slate-900">
            {q ? `Search results for "${q}"` : "All Products"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {loading ? "Searching..." : `${results.length} products found`}
          </p>
        </div>

        <form action="/search" method="GET" className="mb-6 flex max-w-2xl">
          <input
            name="q"
            type="text"
            defaultValue={q}
            placeholder="Search exam (CET, Patwari, Police, SSC)..."
            className="flex-1 px-4 py-2.5 rounded-l-md border border-slate-300 text-sm focus:outline-none focus:border-amber-700"
          />
          <button
            type="submit"
            className="px-5 bg-amber-700 hover:bg-amber-800 text-white rounded-r-md flex items-center justify-center transition"
          >
            <SearchIcon size={18} />
          </button>
        </form>

        {loading ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-amber-700 animate-spin mx-auto" />
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16 card-base">
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <SearchIcon size={22} />
            </div>
            <h3 className="font-bold text-slate-800 text-base">No products found</h3>
            <p className="text-xs text-slate-500 mt-1">Try different keywords.</p>
            <Link href="/" className="btn-primary mt-4 inline-flex">
              Browse All Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {results.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onBuyNow={(c) => {
                  setCart([c]);
                  setIsCartOpen(true);
                }}
                onOpenSample={(c) => {
                  setSelectedCourse(c);
                  setIsSampleOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </main>

      <SampleModal
        course={selectedCourse}
        isOpen={isSampleOpen}
        onClose={() => {
          setIsSampleOpen(false);
          setSelectedCourse(null);
        }}
        onBuyNow={(c) => {
          setCart([c]);
          setIsCartOpen(true);
        }}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onRemoveItem={(id) => setCart((p) => p.filter((i) => i.id !== id))}
      />

      <a
        href="https://wa.me/917852004401"
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-fab"
        aria-label="WhatsApp us"
      >
        <WhatsappIcon size={26} />
      </a>

      <Footer />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageInner />
    </Suspense>
  );
}
