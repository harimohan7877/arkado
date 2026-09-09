"use client";

import { useState, useEffect, startTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import CategoriesTab from "@/app/admin/components/CategoriesTab";
import FeaturedTab from "@/app/admin/components/FeaturedTab";
import ExamsTab from "@/app/admin/components/ExamsTab";
import CoursesTab from "@/app/admin/components/CoursesTab";
import OrdersTab from "@/app/admin/components/OrdersTab";
import SettingsTab from "@/app/admin/components/SettingsTab";

interface MarketplaceOrder {
  id: string;
  customer_name: string;
  customer_email: string;
  amount: number;
  payment_status: string;
  delivery_status: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
  product: { title: string; exam_name: string } | null;
}

interface Stats {
  totalUsers: number;
  totalPaidUsers: number;
  totalGuests: number;
  totalChats: number;
  totalRevenue: number;
  warning?: string;
}

type TabType = "dashboard" | "categories" | "featured" | "exams" | "courses" | "orders" | "settings";

const NAV_ITEMS: { id: TabType; label: string; short: string; icon: string }[] = [
  { id: "dashboard", label: "डैशबोर्ड (Overview)", short: "Dashboard", icon: "📊" },
  { id: "categories", label: "श्रेणियाँ (Categories)", short: "Categories", icon: "📁" },
  { id: "featured", label: "🌟 फीचर्ड एवं न्यू अराइवल्स", short: "Featured", icon: "🌟" },
  { id: "exams", label: "परीक्षाएं फोल्डर (Exams)", short: "Exams", icon: "📑" },
  { id: "courses", label: "कोर्सेज़ (Courses)", short: "Courses", icon: "📚" },
  { id: "orders", label: "ऑर्डर्स (Orders)", short: "Orders", icon: "🛍️" },
  { id: "settings", label: "सेटिंग्स (Settings)", short: "Settings", icon: "⚙️" },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("categories");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);

  const getPasscode = () => {
    if (typeof window !== "undefined") {
      const session = sessionStorage.getItem("arkado-admin-verified");
      if (session) return session;
      const match = document.cookie.match(/arkado-admin-verified=([^;]+)/);
      if (match) return decodeURIComponent(match[1]);
    }
    return "";
  };

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: getPasscode(),
  });

  useEffect(() => {
    const passcode = getPasscode();
    if (!passcode) {
      router.push("/ranjeet/admin/login");
    }
  }, [router]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("arkado-admin-verified");
      sessionStorage.removeItem("sarkari-saathi-admin-verified");
      document.cookie = "arkado-admin-verified=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      document.cookie = "sarkari-saathi-admin-verified=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      router.push("/ranjeet/admin/login");
    }
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/admin/stats", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
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
    } catch {}
  };

  useEffect(() => {
    startTransition(() => {
      if (activeTab === "dashboard") {
        fetchStats();
      } else if (activeTab === "orders") {
        fetchOrders();
      }
    });
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative h-9 w-32">
              <Image
                src="/logo.svg"
                alt="Arkado"
                fill
                priority
                unoptimized
                className="object-contain"
              />
            </div>
            <span className="hidden sm:inline-block px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-full">
              एडमिन पोर्टल
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1"
            >
              <span>🌐</span>
              <span>वेबसाइट देखें</span>
            </a>
            <button
              onClick={handleLogout}
              className="text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>🔒</span>
              <span>लॉगआउट</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto gap-1 py-1 scrollbar-none">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === item.id
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6">
        {activeTab === "categories" && <CategoriesTab getAuthHeaders={getAuthHeaders} />}
        {activeTab === "featured" && <FeaturedTab getAuthHeaders={getAuthHeaders} />}
        {activeTab === "exams" && <ExamsTab getAuthHeaders={getAuthHeaders} />}
        {activeTab === "courses" && <CoursesTab getAuthHeaders={getAuthHeaders} />}
        {activeTab === "settings" && <SettingsTab getAuthHeaders={getAuthHeaders} />}

        {activeTab === "dashboard" && (
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-extrabold text-stone-900">प्लेटफ़ॉर्म ओवरव्यू</h2>
            {loadingStats ? (
              <p className="text-xs text-stone-500">आंकड़े लोड हो रहे हैं...</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                  <div className="text-xl font-extrabold text-stone-900">{stats?.totalUsers || 0}</div>
                  <div className="text-xs text-stone-500 mt-1">कुल उपयोगकर्ता</div>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="text-xl font-extrabold text-emerald-800">₹{stats?.totalRevenue || 0}</div>
                  <div className="text-xs text-emerald-600 mt-1">कुल आय</div>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="text-xl font-extrabold text-amber-800">{orders.length}</div>
                  <div className="text-xs text-amber-600 mt-1">कुल ऑर्डर्स</div>
                </div>
                <div className="p-4 bg-sky-50 rounded-xl border border-sky-200">
                  <div className="text-xl font-extrabold text-sky-800">{stats?.totalChats || 0}</div>
                  <div className="text-xs text-sky-600 mt-1">AI वार्ताएं</div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "orders" && <OrdersTab getAuthHeaders={getAuthHeaders} orders={orders as any} />}
      </main>
    </div>
  );
}
