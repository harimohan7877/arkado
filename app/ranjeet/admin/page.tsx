"use client";

import { useState, useEffect, startTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import CategoriesTab from "@/app/admin/components/CategoriesTab";
import ExamsTab from "@/app/admin/components/ExamsTab";
import CoursesTab from "@/app/admin/components/CoursesTab";
import OrdersTab from "@/app/admin/components/OrdersTab";
import SettingsTab from "@/app/admin/components/SettingsTab";

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  delivery_mode: "whatsapp" | "gmail";
  utr: string;
  amount: number;
  course_id: string;
  course_title: string;
  exam_name: string;
  payment_status: "pending" | "paid" | "failed";
  delivery_status: "pending" | "delivered";
  order_id: string;
  created_at: string;
}

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  pendingDelivery: number;
  activeCourses: number;
  activeExams: number;
  activeCategories: number;
}

const NAV_ITEMS = [
  { id: "dashboard", label: "डैशबोर्ड (Overview)", short: "Home" },
  { id: "categories", label: "श्रेणियाँ (Categories)", short: "Categories" },
  { id: "exams", label: "परीक्षाएं (Exams)", short: "Exams" },
  { id: "courses", label: "कोर्सेस व नोट्स (Notes)", short: "Courses" },
  { id: "orders", label: "ऑर्डर्स व पेमेंट्स (Orders)", short: "Orders" },
  { id: "settings", label: "सेटिंग्स व UPI (Settings)", short: "Settings" },
] as const;

type TabId = (typeof NAV_ITEMS)[number]["id"];

export default function RanjeetAdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    totalRevenue: 0,
    pendingDelivery: 0,
    activeCourses: 0,
    activeExams: 0,
    activeCategories: 0,
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  const getPasscode = () => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("arkado-admin-verified") || "";
    }
    return "";
  };

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: getPasscode(),
  });

  useEffect(() => {
    const isVerified = document.cookie.includes("arkado-admin-verified=");
    if (!isVerified) {
      router.push("/ranjeet/admin/login");
    }
  }, [router]);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/admin/stats", { headers: getAuthHeaders() });
      if (res.status === 401) {
        router.push("/ranjeet/admin/login");
        return;
      }
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/admin/orders", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    startTransition(() => {
      fetchStats();
    });
  }, []);

  useEffect(() => {
    if (activeTab === "orders") {
      startTransition(() => {
        fetchOrders();
      });
    }
  }, [activeTab]);

  const handleLogout = () => {
    document.cookie = "arkado-admin-verified=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    sessionStorage.removeItem("arkado-admin-verified");
    router.push("/ranjeet/admin/login");
  };

  const handleTabChange = (id: TabId) => {
    setActiveTab(id);
    setDrawerOpen(false);
  };

  const activeLabel = NAV_ITEMS.find((n) => n.id === activeTab)?.label || "Admin";

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex font-sans">
      {/* Sidebar (Desktop) */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-stone-200 flex-col shrink-0 sticky top-0 h-screen shadow-xs">
        <div className="p-5 border-b border-stone-200 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative h-8 w-28 flex items-center">
              <Image
                src="/logo.svg"
                alt="Arkado"
                width={120}
                height={37}
                priority
                unoptimized
                className="object-contain w-full h-full"
              />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
              Admin
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer ${
                activeTab === item.id
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              }`}
            >
              <NavIcon
                id={item.id}
                className={activeTab === item.id ? "text-white" : "text-stone-400"}
              />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Sidebar Footer Actions */}
        <div className="p-3 border-t border-stone-200 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="w-full h-9 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <span>🏪</span>
            <span>वेबसाइट देखें (Store) ↗</span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full h-9 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogoutIcon />
            लॉग आउट (Logout)
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-stone-900/50 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-stone-200 flex flex-col transform transition-transform duration-200 ease-out ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative h-7 w-24 flex items-center">
              <Image
                src="/logo.svg"
                alt="Arkado"
                width={120}
                height={37}
                unoptimized
                className="object-contain w-full h-full"
              />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
              Admin
            </span>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-9 h-9 rounded-lg hover:bg-stone-100 text-stone-500 flex items-center justify-center cursor-pointer"
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer ${
                activeTab === item.id
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              }`}
            >
              <NavIcon
                id={item.id}
                className={activeTab === item.id ? "text-white" : "text-stone-400"}
              />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-stone-200 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="w-full h-9 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <span>🏪</span>
            <span>वेबसाइट देखें (Store) ↗</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full h-9 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogoutIcon />
            लॉग आउट (Logout)
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-stone-200 px-4 h-14 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setDrawerOpen(true)}
              className="w-9 h-9 rounded-lg hover:bg-stone-100 text-stone-700 flex items-center justify-center cursor-pointer"
              aria-label="Open menu"
            >
              <MenuIcon />
            </button>
            <div className="relative h-6 w-20 flex items-center">
              <Image
                src="/logo.svg"
                alt="Arkado"
                width={100}
                height={31}
                unoptimized
                className="object-contain w-full h-full"
              />
            </div>
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
              Admin
            </span>
          </div>
          <span className="text-xs font-bold text-stone-700 truncate max-w-[120px]">{activeLabel}</span>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
                    Arkado Admin Overview
                  </h2>
                  <p className="text-stone-500 text-xs sm:text-sm mt-0.5">
                    सिस्टम मैट्रिक्स, लाइव ऑर्डर्स व अध्ययन सामग्री नियंत्रण
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-mono font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live System Active
                  </span>
                </div>
              </div>

              {loadingStats ? (
                <div className="py-16 text-center text-stone-400 bg-white rounded-2xl border border-stone-200">
                  <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs font-mono font-bold">एनालिटिक्स लोड हो रहा है...</p>
                </div>
              ) : (
                <>
                  {/* Metric Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <StatCard label="कुल ऑर्डर्स (Orders)" value={stats.totalOrders} accent="blue" />
                    <StatCard
                      label="कुल कमाई (Revenue)"
                      value={`₹${stats.totalRevenue.toLocaleString("hi-IN")}`}
                      accent="amber"
                    />
                    <StatCard
                      label="लंबित डिलीवरी (Pending)"
                      value={stats.pendingDelivery}
                      accent="rose"
                    />
                    <StatCard
                      label="सक्रिय नोट्स (Courses)"
                      value={stats.activeCourses}
                      accent="emerald"
                    />
                    <StatCard
                      label="परीक्षाएं (Exams)"
                      value={stats.activeExams}
                      accent="indigo"
                    />
                    <StatCard
                      label="श्रेणियाँ (Categories)"
                      value={stats.activeCategories}
                      accent="stone"
                    />
                  </div>

                  {/* Quick Actions Card */}
                  <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
                    <h3 className="text-sm font-bold text-stone-900 mb-3">
                      ⚡ Quick Management Actions
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <QuickActionBtn
                        icon="📁"
                        label="+ Add Category"
                        desc="नई श्रेणी जोड़ें"
                        onClick={() => handleTabChange("categories")}
                      />
                      <QuickActionBtn
                        icon="📝"
                        label="+ Add Exam"
                        desc="नई परीक्षा जोड़ें"
                        onClick={() => handleTabChange("exams")}
                      />
                      <QuickActionBtn
                        icon="📚"
                        label="+ Add Course / Notes"
                        desc="नए नोट्स/PDF जोड़ें"
                        onClick={() => handleTabChange("courses")}
                      />
                      <QuickActionBtn
                        icon="📦"
                        label="Manage Orders"
                        desc="ऑर्डर्स व WhatsApp भेजें"
                        onClick={() => handleTabChange("orders")}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "categories" && <CategoriesTab getAuthHeaders={getAuthHeaders} />}
          {activeTab === "exams" && <ExamsTab getAuthHeaders={getAuthHeaders} />}
          {activeTab === "courses" && <CoursesTab getAuthHeaders={getAuthHeaders} />}
          {activeTab === "orders" && (
            <OrdersTab getAuthHeaders={getAuthHeaders} orders={orders} />
          )}
          {activeTab === "settings" && <SettingsTab getAuthHeaders={getAuthHeaders} />}
        </main>
      </div>
    </div>
  );
}

function NavIcon({ id, className }: { id: TabId; className?: string }) {
  const cls = `w-4 h-4 shrink-0 ${className ?? ""}`;
  switch (id) {
    case "dashboard":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      );
    case "categories":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      );
    case "exams":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="13" y2="17" />
        </svg>
      );
    case "courses":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      );
    case "orders":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      );
    case "settings":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
  }
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: "blue" | "amber" | "rose" | "emerald" | "indigo" | "stone";
}) {
  const accents = {
    blue: "bg-blue-50/70 border-blue-200 text-blue-800",
    amber: "bg-amber-50/70 border-amber-200 text-amber-800",
    rose: "bg-rose-50/70 border-rose-200 text-rose-800",
    emerald: "bg-emerald-50/70 border-emerald-200 text-emerald-800",
    indigo: "bg-indigo-50/70 border-indigo-200 text-indigo-800",
    stone: "bg-stone-50 border-stone-200 text-stone-800",
  };
  return (
    <div className={`bg-white border rounded-2xl p-4 shadow-xs ${accents[accent]}`}>
      <p className="text-[10px] uppercase tracking-wider font-mono font-bold text-stone-500">
        {label}
      </p>
      <p className="text-xl font-bold mt-1 text-stone-900 truncate">{value}</p>
    </div>
  );
}

function QuickActionBtn({
  icon,
  label,
  desc,
  onClick,
}: {
  icon: string;
  label: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-stone-50/60 hover:bg-amber-50/60 border border-stone-200 hover:border-amber-300 rounded-xl p-3.5 text-left transition-all group cursor-pointer shadow-2xs"
    >
      <span className="text-xl block mb-1">{icon}</span>
      <p className="text-xs font-bold text-stone-900 group-hover:text-amber-800">
        {label}
      </p>
      <p className="text-[10px] text-stone-500 mt-0.5">{desc}</p>
    </button>
  );
}
