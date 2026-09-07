"use client";

import { useState, useEffect, startTransition } from "react";
import { useRouter } from "next/navigation";
import CategoriesTab from "./components/CategoriesTab";
import ExamsTab from "./components/ExamsTab";
import CoursesTab from "./components/CoursesTab";
import OrdersTab from "./components/OrdersTab";
import SettingsTab from "./components/SettingsTab";

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
  { id: "dashboard", label: "Dashboard", short: "Home" },
  { id: "categories", label: "Categories", short: "Categories" },
  { id: "exams", label: "Exams", short: "Exams" },
  { id: "courses", label: "Courses", short: "Courses" },
  { id: "orders", label: "Orders", short: "Orders" },
  { id: "settings", label: "Settings", short: "Settings" },
] as const;

type TabId = (typeof NAV_ITEMS)[number]["id"];

export default function AdminDashboard() {
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
    const isVerified = document.cookie.includes("arkado-admin-verified=true");
    if (!isVerified) {
      router.push("/admin/login");
    }
  }, [router]);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/admin/stats", { headers: getAuthHeaders() });
      if (res.status === 401) {
        router.push("/admin/login");
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
    router.push("/admin/login");
  };

  const handleTabChange = (id: TabId) => {
    setActiveTab(id);
    setDrawerOpen(false);
  };

  const activeLabel = NAV_ITEMS.find((n) => n.id === activeTab)?.label || "Admin";

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-stone-200 flex-col shrink-0 sticky top-0 h-screen">
        <div className="p-5 border-b border-stone-200">
          <div className="flex items-center gap-2.5">
            <span
              className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800 flex items-center justify-center text-white font-black text-xl shadow-md"
              style={{ fontFamily: "Georgia, serif" }}
            >
              A
            </span>
            <div className="leading-tight">
              <h1 className="text-base font-black text-stone-900">Arkado</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                Admin Panel
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-3 ${
                activeTab === item.id
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              }`}
            >
              <NavIcon
                id={item.id}
                className={activeTab === item.id ? "text-white" : "text-stone-400"}
              />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-stone-200">
          <button
            onClick={handleLogout}
            className="w-full h-10 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <LogoutIcon />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-stone-900/50 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-stone-200 flex flex-col transform transition-transform duration-200 ease-out ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800 flex items-center justify-center text-white font-black text-xl shadow-md"
              style={{ fontFamily: "Georgia, serif" }}
            >
              A
            </span>
            <div className="leading-tight">
              <h1 className="text-base font-black text-stone-900">Arkado</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                Admin
              </span>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-9 h-9 rounded-lg hover:bg-stone-100 text-stone-500 flex items-center justify-center"
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
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-3 ${
                activeTab === item.id
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              }`}
            >
              <NavIcon
                id={item.id}
                className={activeTab === item.id ? "text-white" : "text-stone-400"}
              />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-stone-200">
          <button
            onClick={handleLogout}
            className="w-full h-10 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <LogoutIcon />
            Logout
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-stone-200 px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setDrawerOpen(true)}
              className="w-9 h-9 rounded-lg hover:bg-stone-100 text-stone-700 flex items-center justify-center"
              aria-label="Open menu"
            >
              <MenuIcon />
            </button>
            <div className="flex items-center gap-2">
              <span
                className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800 flex items-center justify-center text-white font-black text-sm shadow"
                style={{ fontFamily: "Georgia, serif" }}
              >
                A
              </span>
              <span className="font-black text-stone-900">Arkado</span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                Admin
              </span>
            </div>
          </div>
          <span className="text-sm font-semibold text-stone-700">{activeLabel}</span>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="hidden lg:block">
                <h2 className="text-2xl font-bold text-stone-900">Dashboard</h2>
                <p className="text-stone-500 text-sm">System overview and key metrics.</p>
              </div>

              {loadingStats ? (
                <div className="py-12 text-center text-stone-400 bg-white rounded-2xl border border-stone-200">
                  Loading analytics...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <StatCard label="Orders" value={stats.totalOrders} accent="blue" />
                    <StatCard
                      label="Revenue"
                      value={`₹${stats.totalRevenue.toLocaleString()}`}
                      accent="amber"
                    />
                    <StatCard
                      label="Pending"
                      value={stats.pendingDelivery}
                      accent="rose"
                    />
                    <StatCard
                      label="Courses"
                      value={stats.activeCourses}
                      accent="emerald"
                    />
                    <StatCard
                      label="Exams"
                      value={stats.activeExams}
                      accent="indigo"
                    />
                    <StatCard
                      label="Categories"
                      value={stats.activeCategories}
                      accent="stone"
                    />
                  </div>

                  <div className="bg-white border border-stone-200 rounded-2xl p-5">
                    <h3 className="text-base font-bold text-stone-900 mb-4">
                      Quick Actions
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <QuickActionBtn
                        label="Add Category"
                        onClick={() => handleTabChange("categories")}
                      />
                      <QuickActionBtn
                        label="Add Exam"
                        onClick={() => handleTabChange("exams")}
                      />
                      <QuickActionBtn
                        label="Add Course"
                        onClick={() => handleTabChange("courses")}
                      />
                      <QuickActionBtn
                        label="View Orders"
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
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    rose: "bg-rose-50 border-rose-200 text-rose-700",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
    stone: "bg-stone-100 border-stone-200 text-stone-700",
  };
  return (
    <div className={`bg-white border rounded-2xl p-4 ${accents[accent]}`}>
      <p className="text-[10px] uppercase tracking-wider font-bold text-stone-500">
        {label}
      </p>
      <p className="text-xl sm:text-2xl font-black mt-1 text-stone-900 break-all">
        {value}
      </p>
    </div>
  );
}

function QuickActionBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-white border border-stone-200 hover:border-amber-400 rounded-xl p-4 text-left transition-all group"
    >
      <p className="text-sm font-bold text-stone-900 group-hover:text-amber-700">
        {label}
      </p>
    </button>
  );
}
