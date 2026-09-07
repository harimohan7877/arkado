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

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"dashboard" | "categories" | "exams" | "courses" | "orders" | "settings">("dashboard");
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    totalRevenue: 0,
    pendingDelivery: 0,
    activeCourses: 0,
    activeExams: 0,
    activeCategories: 0
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const getPasscode = () => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("arkado-admin-verified") || "";
    }
    return "";
  };

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    "Authorization": getPasscode(),
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
    setLoadingOrders(true);
    try {
      const res = await fetch("/api/admin/orders", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    startTransition(() => {
      fetchStats();
    });
  }, []);

  useEffect(() => {
    if (activeTab === "orders") fetchOrders();
  }, [activeTab]);

  const handleLogout = () => {
    document.cookie = "arkado-admin-verified=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    sessionStorage.removeItem("arkado-admin-verified");
    router.push("/admin/login");
  };

  const tabs = [
    { id: "dashboard", label: "📊 Dashboard", icon: "📊" },
    { id: "categories", label: "📂 Categories", icon: "📂" },
    { id: "exams", label: "📋 Exams", icon: "📋" },
    { id: "courses", label: "📦 Courses", icon: "📦" },
    { id: "orders", label: "🛒 Orders", icon: "🛒" },
    { id: "settings", label: "⚙️ Settings", icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex">
      {/* Side Navigation */}
      <aside className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col">
        <div className="p-6 border-b border-neutral-800">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-neutral-900 via-neutral-800 to-amber-500 flex items-center justify-center text-white font-black text-xl">A</span>
            Arkado
          </h1>
          <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full mt-1.5 inline-block">
            Admin Panel
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25"
                  : "hover:bg-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-800">
          <button
            onClick={handleLogout}
            className="w-full h-11 bg-red-950/30 hover:bg-red-950/60 border border-red-500/20 hover:border-red-500/40 text-red-400 text-sm font-semibold rounded-xl transition-all"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 p-8 overflow-y-auto">
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Dashboard</h2>
              <p className="text-neutral-400 text-sm">System overview and key metrics.</p>
            </div>

            {loadingStats ? (
              <div className="py-12 text-center text-neutral-500">Loading analytics...</div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <StatCard label="Total Orders" value={stats.totalOrders} icon="🛒" color="blue" />
                  <StatCard label="Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`} icon="💰" color="emerald" />
                  <StatCard label="Pending Delivery" value={stats.pendingDelivery} icon="📦" color="amber" />
                  <StatCard label="Active Courses" value={stats.activeCourses} icon="📦" color="purple" />
                  <StatCard label="Active Exams" value={stats.activeExams} icon="📋" color="indigo" />
                  <StatCard label="Categories" value={stats.activeCategories} icon="📂" color="orange" />
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <QuickActionBtn label="Add Category" icon="➕" href="#categories" />
                    <QuickActionBtn label="Add Exam" icon="📋" href="#exams" />
                    <QuickActionBtn label="Add Course" icon="📦" href="#courses" />
                    <QuickActionBtn label="View Orders" icon="🛒" href="#orders" />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "categories" && <CategoriesTab getAuthHeaders={getAuthHeaders} />}
        {activeTab === "exams" && <ExamsTab getAuthHeaders={getAuthHeaders} />}
        {activeTab === "courses" && <CoursesTab getAuthHeaders={getAuthHeaders} />}
        {activeTab === "orders" && <OrdersTab getAuthHeaders={getAuthHeaders} orders={orders} />}
        {activeTab === "settings" && <SettingsTab getAuthHeaders={getAuthHeaders} />}
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  const colors = {
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    indigo: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
    orange: "bg-orange-500/10 border-orange-500/20 text-orange-400",
  };
  return (
    <div className={`bg-neutral-900 border rounded-2xl p-5 ${colors[color as keyof typeof colors]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">{label}</p>
          <h3 className="text-2xl font-black text-white mt-1">{value}</h3>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}

function QuickActionBtn({ label, icon, href }: { label: string; icon: string; href: string }) {
  return (
    <button
      onClick={() => document.getElementById(href.replace("#", ""))?.scrollIntoView({ behavior: "smooth" })}
      className="bg-neutral-900 border border-neutral-800 hover:border-emerald-500/50 rounded-xl p-4 text-left transition-all group"
    >
      <div className="text-2xl mb-2">{icon}</div>
      <p className="font-semibold text-white group-hover:text-emerald-400 transition-colors">{label}</p>
    </button>
  );
}