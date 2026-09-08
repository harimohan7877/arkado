"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Category } from "@/lib/store-types";
import { Settings } from "@/lib/store-types";
import { supabase } from "@/lib/supabase";
import {
  SearchIcon,
  CloseIcon,
  MenuIcon,
  CartIcon,
  UserIcon,
  ChevronDownIcon,
  GridIcon,
  PhoneIcon,
  MessageCircleIcon,
} from "@/components/icons";

interface NavbarProps {
  cartCount?: number;
  onCartClick?: () => void;
}

export default function Navbar({ cartCount = 0, onCartClick }: NavbarProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);

  useEffect(() => {
    fetch("/api/categories?scope=public")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {});

    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user) {
        setUser(data.session.user);
      }
    });

    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (showMobileMenu) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showMobileMenu]);

  const logoText = settings?.brand?.logo_text || settings?.site_name || "Arkado";
  const tagline = settings?.brand?.tagline || "Pattern-decoded notes for Rajasthan exams";

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-stone-200">
        {/* Main header container matching max-w-7xl */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center gap-2 sm:gap-4">
          {/* Mobile menu trigger */}
          <button
            onClick={() => setShowMobileMenu(true)}
            className="md:hidden w-10 h-10 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-700 cursor-pointer shrink-0"
            aria-label="Open menu"
          >
            <MenuIcon size={22} />
          </button>

          {/* Brand - Arkado Wordmark Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 shrink-0 group">
            <div className="relative h-9 sm:h-10 lg:h-11 w-32 sm:w-36 lg:w-44 flex items-center">
              <Image
                src="/logo.svg"
                alt="Arkado"
                width={180}
                height={56}
                priority
                unoptimized
                className="object-contain w-full h-full"
              />
            </div>
            <p className="text-[9px] sm:text-[10px] text-stone-500 hidden xl:block font-medium border-l border-stone-200 pl-2.5 py-0.5 truncate max-w-[200px]">
              {tagline}
            </p>
          </Link>

          {/* Search bar (desktop) */}
          <form
            action="/search"
            method="GET"
            className="hidden md:flex flex-1 max-w-2xl mx-2 lg:mx-auto"
          >
            <div className="relative flex w-full">
              <input
                name="q"
                type="text"
                placeholder="Search exam (CET, Patwari, Police, SSC, UPSC, Banking)..."
                className="flex-1 px-4 py-2.5 rounded-l-lg border border-stone-300 text-sm placeholder:text-stone-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
              />
              <button
                type="submit"
                className="px-5 bg-stone-800 hover:bg-stone-900 text-white rounded-r-lg flex items-center justify-center transition cursor-pointer"
                aria-label="Search"
              >
                <SearchIcon size={18} />
              </button>
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-1 sm:gap-2 ml-auto shrink-0">
            {/* Mobile search trigger */}
            <button
              onClick={() => setShowSearch(true)}
              className="md:hidden w-10 h-10 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-700 cursor-pointer"
              aria-label="Search"
            >
              <SearchIcon size={20} />
            </button>

            {/* Login / Account / Dashboard - visible on all screens */}
            {user ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/70 transition"
                aria-label="Dashboard"
              >
                <div className="relative shrink-0">
                  <UserIcon size={18} className="text-amber-800" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
                </div>
                <div className="text-left leading-tight hidden sm:block">
                  <span className="text-[11px] font-bold text-amber-900 block truncate max-w-[90px] md:max-w-[120px]">
                    {user.email?.split("@")[0]}
                  </span>
                  <span className="text-[9px] text-emerald-700 font-bold block">
                    डैशबोर्ड (Active)
                  </span>
                </div>
              </Link>
            ) : (
              <Link
                href="/auth"
                className="flex flex-col items-center justify-center w-9 h-9 sm:w-auto sm:px-2.5 sm:py-1 rounded-lg hover:bg-stone-100 text-stone-700 transition"
                aria-label="Account"
              >
                <UserIcon size={20} />
                <span className="text-[10px] font-bold mt-0.5 hidden sm:block">लॉगिन (Account)</span>
              </Link>
            )}

            <button
              onClick={onCartClick}
              className="relative flex flex-col items-center px-2 sm:px-3 py-1 rounded-md hover:bg-stone-100 text-stone-700 transition cursor-pointer"
              aria-label="View cart"
            >
              <div className="relative">
                <CartIcon size={20} />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-600 text-white font-black text-[9px] flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="text-[9px] sm:text-[10px] font-semibold mt-0.5 hidden lg:block">My cart</span>
            </button>
          </div>
        </div>

        {/* Secondary nav (desktop) */}
        <div className="hidden md:block border-t border-stone-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-11 flex items-center gap-1">
            {/* Categories dropdown trigger */}
            <div
              className="relative"
              onMouseEnter={() => setShowCatDropdown(true)}
              onMouseLeave={() => setShowCatDropdown(false)}
            >
              <button className="h-9 my-1 px-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-all rounded-xl border border-stone-300 hover:border-stone-400">
                <GridIcon size={15} className="text-stone-500" />
                <span>All Categories</span>
                <ChevronDownIcon size={13} className="text-stone-400" />
              </button>

              {showCatDropdown && categories.length > 0 && (
                <div className="absolute left-0 top-full w-80 bg-white border border-stone-200 rounded-md shadow-xl z-50 anim-slide-down overflow-hidden">
                  <Link
                    href="/exams"
                    className="block px-4 py-2.5 text-sm font-bold text-amber-900 hover:bg-amber-100 border-b border-stone-200 transition bg-amber-50/70"
                  >
                    📋 View All Categories ({categories.length})
                  </Link>
                  <div className="max-h-96 overflow-y-auto divide-y divide-stone-100">
                    {categories.slice(0, 10).map((cat) => (
                      <Link
                        key={cat.id}
                        href={`/category/${cat.id}`}
                        className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-amber-50 hover:text-amber-800 transition"
                      >
                        {cat.logo_url ? (
                          <img src={cat.logo_url} alt={cat.name} className="w-6 h-6 rounded-full object-contain border border-stone-200" />
                        ) : (
                          <span className="text-base">{cat.icon}</span>
                        )}
                        <span className="truncate">{cat.name}</span>
                      </Link>
                    ))}
                  </div>
                  <Link
                    href="/exams"
                    className="block px-4 py-2 text-center text-xs font-bold text-amber-700 hover:text-amber-800 bg-stone-50 border-t border-stone-200 transition"
                  >
                    Browse All {categories.length} Categories →
                  </Link>
                </div>
              )}
            </div>

            <Link
              href="/"
              className="h-11 px-3 flex items-center text-sm font-semibold text-stone-700 hover:text-amber-700 transition"
            >
              Home
            </Link>
            <Link
              href="/#deals"
              className="h-11 px-3 flex items-center text-sm font-semibold text-stone-700 hover:text-amber-700 transition"
            >
              {settings?.homepage?.hot_deals_title || "Today's Hot Deals"}
            </Link>
            <Link
              href="/exams"
              className="h-11 px-3 flex items-center text-sm font-semibold text-stone-700 hover:text-amber-700 transition"
            >
              All Exams
            </Link>
            <Link
              href="/#new"
              className="h-11 px-3 flex items-center text-sm font-semibold text-stone-700 hover:text-amber-700 transition"
            >
              {settings?.homepage?.new_arrivals_title || "New Arrivals"}
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile search overlay */}
      {showSearch && (
        <div className="fixed inset-0 z-[70] bg-white anim-fade-in-up md:hidden">
          <div className="p-4 flex items-center gap-2 border-b border-stone-200">
            <form action="/search" method="GET" className="flex-1 flex">
              <input
                name="q"
                type="text"
                autoFocus
                placeholder="Search exam..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-l-lg border border-stone-300 text-sm focus:outline-none focus:border-amber-600"
              />
              <button
                type="submit"
                className="px-4 bg-stone-800 text-white rounded-r-lg"
              >
                <SearchIcon size={18} />
              </button>
            </form>
            <button
              onClick={() => setShowSearch(false)}
              className="w-9 h-9 rounded-md hover:bg-stone-100 flex items-center justify-center cursor-pointer"
              aria-label="Close search"
            >
              <CloseIcon size={20} />
            </button>
          </div>
          <div className="p-4 space-y-2 text-sm text-stone-600">
            <p className="font-semibold text-stone-500 uppercase text-xs mb-2">Trending searches</p>
            {["CET 2026", "Patwari", "REET Level 1", "Police Constable", "SSC CGL", "Banking", "UPSC CSE"].map(
              (q) => (
                <Link
                  key={q}
                  href={`/search?q=${encodeURIComponent(q)}`}
                  onClick={() => setShowSearch(false)}
                  className="block py-2 border-b border-stone-100 hover:text-amber-700"
                >
                  {q}
                </Link>
              )
            )}
          </div>
        </div>
      )}

      {/* Mobile menu drawer */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-[70] md:hidden">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setShowMobileMenu(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col anim-slide-down">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between">
              <Link href="/" onClick={() => setShowMobileMenu(false)} className="relative h-10 w-36 flex items-center">
                <Image
                  src="/logo.svg"
                  alt="Arkado"
                  width={140}
                  height={44}
                  unoptimized
                  className="object-contain w-full h-full"
                />
              </Link>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="w-9 h-9 rounded-md hover:bg-stone-100 flex items-center justify-center cursor-pointer"
                aria-label="Close menu"
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {user ? (
                <div className="p-3 mb-3 bg-amber-50/80 rounded-xl border border-amber-200/70">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <p className="text-[11px] font-mono text-amber-900 font-bold truncate">
                      {user.email || "Active User"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-amber-200/50">
                    <Link
                      href="/dashboard"
                      onClick={() => setShowMobileMenu(false)}
                      className="text-xs font-bold text-amber-900 hover:underline"
                    >
                      My Dashboard →
                    </Link>
                    <button
                      onClick={async () => {
                        await supabase.auth.signOut();
                        localStorage.clear();
                        sessionStorage.clear();
                        setUser(null);
                        setShowMobileMenu(false);
                        window.location.href = "/";
                      }}
                      className="text-xs text-stone-500 hover:text-red-600 font-medium cursor-pointer"
                    >
                      Log out
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  href="/auth"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg font-bold text-xs text-amber-900 bg-amber-50 border border-amber-200/60 mb-3"
                >
                  <span>🔑 Log in / Sign up</span>
                  <span>→</span>
                </Link>
              )}

              <Link
                href="/"
                onClick={() => setShowMobileMenu(false)}
                className="block px-3 py-2.5 rounded-md font-semibold text-stone-700 hover:bg-stone-100"
              >
                Home
              </Link>
              <Link
                href="/exams"
                onClick={() => setShowMobileMenu(false)}
                className="block px-3 py-2.5 rounded-md font-semibold text-stone-700 hover:bg-stone-100"
              >
                All Categories
              </Link>
              <Link
                href="/#deals"
                onClick={() => setShowMobileMenu(false)}
                className="block px-3 py-2.5 rounded-md font-semibold text-stone-700 hover:bg-stone-100"
              >
                {settings?.homepage?.hot_deals_title || "Today's Hot Deals"}
              </Link>

              <div className="pt-3 pb-1">
                <p className="px-3 text-xs font-bold text-stone-400 uppercase tracking-wider">
                  Categories
                </p>
              </div>
              {categories.slice(0, 6).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.id}`}
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium text-stone-600 hover:bg-amber-50 hover:text-amber-800"
                >
                  {cat.logo_url ? (
                    <img src={cat.logo_url} alt={cat.name} className="w-6 h-6 rounded-full object-contain border border-stone-200" />
                  ) : (
                    <span className="text-base">{cat.icon}</span>
                  )}
                  <span className="truncate">{cat.name}</span>
                </Link>
              ))}
              <Link
                href="/exams"
                onClick={() => setShowMobileMenu(false)}
                className="block px-3 py-2 text-xs font-bold text-amber-700 hover:underline"
              >
                View all {categories.length} categories →
              </Link>

              <div className="pt-3 pb-1">
                <p className="px-3 text-xs font-bold text-stone-400 uppercase tracking-wider">
                  Support
                </p>
              </div>
              <a
                href="tel:+917852004401"
                className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium text-stone-700 hover:bg-stone-100"
              >
                <PhoneIcon size={16} />
                Call: 7852004401
              </a>
              <a
                href="https://wa.me/917852004401"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
              >
                <MessageCircleIcon size={16} />
                WhatsApp Support
              </a>
            </div>
          </div>
        </div>
      )}

    </>
  );
}