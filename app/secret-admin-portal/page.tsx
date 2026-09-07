"use client";

import { useState, useEffect, startTransition } from "react";
import { useRouter } from "next/navigation";
import CategoriesTab from "./components/CategoriesTab";
import ProductsTab from "./components/ProductsTab";
import ExamsTab from "./components/ExamsTab";
import {
  BarChartIcon,
  SettingsIcon,
  UsersIcon,
  MessageSquareIcon,
  ShoppingBagIcon,
  GridIcon,
  FileTextIcon,
  PackageIcon,
  DatabaseIcon,
  LogOutIcon,
  TrendingUpIcon,
  SparklesIcon,
  UserIcon,
  ZapIcon,
} from "@/components/icons";

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

interface UserProfile {
  id: string;
  name: string | null;
  city: string | null;
  state: string;
  age: number;
  education: string;
  category: string;
  gender: string;
  is_paid: boolean;
  ai_messages_used: number;
  created_at: string;
}

interface ChatMessage {
  id: string;
  user_id: string;
  exam_id: string;
  role: string;
  content: string;
  created_at: string;
}

interface ConfigSettings {
  active_provider: string;
  gemini_key: string;
  openai_key: string;
  claude_key: string;
  openrouter_key: string;
  groq_key: string;
  db_missing_groq?: boolean;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"dashboard" | "ai" | "users" | "chats" | "orders" | "categories" | "products" | "exams" | "schema">("dashboard");
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalPaidUsers: 0, totalGuests: 0, totalChats: 0, totalRevenue: 0 });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  
  // AI Config States
  const [config, setConfig] = useState<ConfigSettings>({ 
    active_provider: "openrouter", 
    gemini_key: "", 
    openai_key: "", 
    claude_key: "", 
    openrouter_key: "",
    groq_key: "",
    db_missing_groq: false
  });
  const [testResult, setTestResult] = useState<{ success?: boolean; text?: string; loading?: boolean }>({});
  const [saveStatus, setSaveStatus] = useState<{ success?: boolean; text?: string; loading?: boolean }>({});
  
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);

  // Get passcode from sessionStorage
  const getPasscode = () => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("sarkari-saathi-admin-verified") || "";
    }
    return "";
  };

  const getAuthHeaders = () => {
    return {
      "Content-Type": "application/json",
      "Authorization": getPasscode(),
    };
  };

  // Check auth
  useEffect(() => {
    const isVerified = document.cookie.includes("sarkari-saathi-admin-verified=true");
    if (!isVerified) {
      router.push("/secret-admin-portal/login");
    }
  }, [router]);

  // Load stats
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/admin/stats", {
        headers: getAuthHeaders(),
      });
      if (res.status === 401) {
        router.push("/secret-admin-portal/login");
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

  // Load config
  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/admin/settings", {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Load users
  const fetchUsers = async (query = "") => {
    setLoadingUsers(true);
    try {
      const url = query ? `/api/admin/users?q=${encodeURIComponent(query)}` : "/api/admin/users";
      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load chats
  const fetchChats = async () => {
    setLoadingChats(true);
    try {
      const res = await fetch("/api/admin/chats", {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setChats(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingChats(false);
    }
  };

  // Load marketplace orders
  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch("/api/admin/orders", {
        headers: getAuthHeaders(),
      });
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

  // Update order delivery status
  const handleUpdateDelivery = async (orderId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "delivered" ? "pending" : "delivered";
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          orderId,
          action: "update_delivery",
          value: nextStatus,
        }),
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update order payment status
  const handleUpdatePayment = async (orderId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "paid" ? "pending" : "paid";
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          orderId,
          action: "update_payment",
          value: nextStatus,
        }),
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    startTransition(() => {
      fetchStats();
      fetchConfig();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    startTransition(() => {
      if (activeTab === "dashboard") fetchStats();
      if (activeTab === "users") fetchUsers(searchQuery);
      if (activeTab === "chats") fetchChats();
      if (activeTab === "orders") fetchOrders();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, searchQuery]);

  // Toggle user paid status
  const handleTogglePaid = async (userId: string, currentPaid: boolean) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          userId,
          action: "toggle_paid",
          isPaid: !currentPaid,
        }),
      });
      if (res.ok) {
        fetchUsers(searchQuery);
        fetchStats(); // Update counters
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Reset user messages count
  const handleResetMessages = async (userId: string) => {
    if (!confirm("क्या आप इस यूज़र के AI संदेशों की गिनती को शून्य (0) करना चाहते हैं?")) return;
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          userId,
          action: "reset_messages",
        }),
      });
      if (res.ok) {
        fetchUsers(searchQuery);
        alert("संदेश काउंटर रीसेट हो गया!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Test API Key
  const handleTestKey = async (provider: string) => {
    setTestResult({ loading: true });
    let key = "";
    if (provider === "gemini") key = config.gemini_key;
    if (provider === "openai") key = config.openai_key;
    if (provider === "claude") key = config.claude_key;
    if (provider === "openrouter") key = config.openrouter_key;
    if (provider === "groq") key = config.groq_key;

    if (!key) {
      setTestResult({ success: false, text: "कृपया पहले कुंजी (API Key) दर्ज करें।" });
      return;
    }

    try {
      const res = await fetch("/api/admin/test-key", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ provider, key }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, text: `सफल! AI जवाब: "${data.response}"` });
      } else {
        setTestResult({ success: false, text: `त्रुटि (Error): ${data.error}` });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setTestResult({ success: false, text: `कनेक्शन विफल: ${message}` });
    }
  };

  // Save AI Config Settings
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus({ loading: true });

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(config),
      });

      if (res.ok) {
        setSaveStatus({ success: true, text: "सेटिंग्स सफलतापूर्वक सेव हो गईं! 🚀" });
        fetchConfig(); // Reload masked keys
        setTimeout(() => setSaveStatus({}), 3000);
      } else {
        const err = await res.json();
        setSaveStatus({ success: false, text: `सेव करने में विफल: ${err.error}` });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setSaveStatus({ success: false, text: `त्रुटि: ${message}` });
    }
  };

  const handleLogout = () => {
    document.cookie = "sarkari-saathi-admin-verified=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    sessionStorage.removeItem("sarkari-saathi-admin-verified");
    router.push("/secret-admin-portal/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex">
      {/* Side Navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md bg-red-600 flex items-center justify-center text-white font-black text-lg">
              A
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">Arkado Admin</h1>
              <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">
                Control Center
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {[
            { id: "dashboard", label: "Dashboard", icon: <BarChartIcon size={16} /> },
            { id: "ai", label: "AI Config", icon: <SettingsIcon size={16} /> },
            { id: "users", label: "Users", icon: <UsersIcon size={16} /> },
            { id: "chats", label: "Conversations", icon: <MessageSquareIcon size={16} /> },
            { id: "orders", label: "Marketplace Orders", icon: <ShoppingBagIcon size={16} /> },
            { id: "categories", label: "Exam Categories", icon: <GridIcon size={16} /> },
            { id: "exams", label: "Exams Setup", icon: <FileTextIcon size={16} /> },
            { id: "products", label: "Study Materials", icon: <PackageIcon size={16} /> },
            { id: "schema", label: "Schema Guide", icon: <DatabaseIcon size={16} /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as typeof activeTab)}
              className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-all flex items-center gap-2.5 ${
                activeTab === item.id
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span className={activeTab === item.id ? "text-white" : "text-slate-500"}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full h-10 bg-red-950/40 hover:bg-red-950/70 border border-red-500/20 hover:border-red-500/40 text-red-400 text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-2"
          >
            <LogOutIcon size={14} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Tab 1: Dashboard */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <BarChartIcon size={22} className="text-red-500" />
                  System Analytics
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Total activity and user summary across the platform.
                </p>
              </div>
              <button
                onClick={fetchStats}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs px-3.5 py-2 rounded-md transition flex items-center gap-1.5"
              >
                <ZapIcon size={12} />
                Refresh
              </button>
            </div>

            {stats.warning && (
              <div className="bg-amber-950/30 border border-amber-500/30 text-amber-300 p-4 rounded-md text-sm">
                <strong>Heads up:</strong> {stats.warning}
              </div>
            )}

            {loadingStats ? (
              <div className="py-12 text-center text-slate-500">Loading analytics...</div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                          Registered Users
                        </p>
                        <h3 className="text-3xl font-black text-white mt-1.5">
                          {stats.totalUsers}
                        </h3>
                      </div>
                      <div className="w-9 h-9 rounded-md bg-blue-500/15 text-blue-400 flex items-center justify-center">
                        <UsersIcon size={18} />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 font-semibold">पंजीकृत छात्र</p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                          Premium (Paid)
                        </p>
                        <h3 className="text-3xl font-black text-emerald-400 mt-1.5">
                          {stats.totalPaidUsers}
                        </h3>
                      </div>
                      <div className="w-9 h-9 rounded-md bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                        <SparklesIcon size={18} />
                      </div>
                    </div>
                    <p className="text-[10px] text-emerald-400 mt-2 font-semibold">
                      Conversion:{" "}
                      {stats.totalUsers > 0
                        ? Math.round((stats.totalPaidUsers / stats.totalUsers) * 100)
                        : 0}
                      %
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                          Guest Sessions
                        </p>
                        <h3 className="text-3xl font-black text-blue-400 mt-1.5">
                          {stats.totalGuests}
                        </h3>
                      </div>
                      <div className="w-9 h-9 rounded-md bg-blue-500/15 text-blue-400 flex items-center justify-center">
                        <UserIcon size={18} />
                      </div>
                    </div>
                    <p className="text-[10px] text-blue-400 mt-2 font-semibold">
                      बिना लॉगिन के यूज़र्स
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                          AI Chats
                        </p>
                        <h3 className="text-3xl font-black text-amber-400 mt-1.5">
                          {stats.totalChats}
                        </h3>
                      </div>
                      <div className="w-9 h-9 rounded-md bg-amber-500/15 text-amber-400 flex items-center justify-center">
                        <MessageSquareIcon size={18} />
                      </div>
                    </div>
                    <p className="text-[10px] text-amber-400 mt-2 font-semibold">
                      कुल AI वार्तालाप
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-red-950/40 to-slate-900 border border-red-900/40 rounded-lg p-6 flex flex-col justify-between min-h-[180px]">
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-full">
                        <TrendingUpIcon size={12} />
                        Collected Revenue
                      </span>
                      <p className="text-slate-400 text-xs mt-2">
                        Premium ₹30 upgrade se kulaay (mock / actual):
                      </p>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-4xl font-extrabold text-white">₹{stats.totalRevenue}</h4>
                      <p className="text-[10px] text-slate-500 mt-1">₹30 per successful upgrade</p>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 lg:col-span-2">
                    <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                      <SparklesIcon size={16} className="text-red-500" />
                      Operational Notes (एडमिन निर्देश)
                    </h3>
                    <ul className="space-y-2 text-xs text-slate-400 list-disc pl-4">
                      <li>
                        This panel is secured on Vercel/Localhost — no public link from user site.
                      </li>
                      <li>
                        <strong>AI Configurations</strong> tab se Google, OpenAI ya Anthropic API keys
                        daalkar live kar sakte hain.
                      </li>
                      <li>
                        Agar koi student paid limit bypass complaint kare, <strong>Users</strong> tab
                        mein email search karke manually Paid mark kar sakte hain.
                      </li>
                    </ul>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab 2: AI Configurations */}
        {activeTab === "ai" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <SettingsIcon size={22} className="text-red-500" />
                AI Provider Configurations
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Change the AI model used by the platform and test API keys live.
              </p>
            </div>

            <form onSubmit={handleSaveConfig} className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6 max-w-3xl">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Active AI Provider (सक्रिय AI प्रदाता)
                </label>
                <select
                  value={config.active_provider}
                  onChange={(e) => setConfig({ ...config, active_provider: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md p-3 text-white focus:border-red-500 outline-none cursor-pointer"
                >
                  <option value="gemini">Gemini 2.0 Flash (Recommended & Free Tier)</option>
                  <option value="openai">OpenAI GPT-4o-mini</option>
                  <option value="claude">Anthropic Claude 3.5 (Haiku / Sonnet)</option>
                  <option value="openrouter">OpenRouter (Global Proxy)</option>
                  <option value="groq">Groq (Llama-3.3-70b-versatile)</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  चैटबॉट रियल-टाइम में इसी सक्रिय प्रदाता (Active Provider) का उपयोग करके छात्रों के प्रश्नों का जवाब देगा।
                </p>
              </div>

              {/* Provider Key Inputs */}
              <div className="space-y-4 border-t border-slate-800 pt-4">
                <h3 className="text-sm font-semibold text-white">API Keys Management</h3>

                {/* Gemini */}
                {config.active_provider === "gemini" && (
                  <div className="grid grid-cols-4 gap-4 items-center">
                    <span className="text-xs text-gray-400 col-span-1 font-semibold">Gemini API Key:</span>
                    <div className="col-span-2">
                      <input
                        type="password"
                        value={config.gemini_key}
                        onChange={(e) => setConfig({ ...config, gemini_key: e.target.value })}
                        placeholder="AIzaSy..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-md px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-red-500 outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTestKey("gemini")}
                      className="h-10 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold rounded-md transition"
                    >
                      Test Connection
                    </button>
                  </div>
                )}

                {/* OpenAI */}
                {config.active_provider === "openai" && (
                  <div className="grid grid-cols-4 gap-4 items-center">
                    <span className="text-xs text-gray-400 col-span-1 font-semibold">OpenAI API Key:</span>
                    <div className="col-span-2">
                      <input
                        type="password"
                        value={config.openai_key}
                        onChange={(e) => setConfig({ ...config, openai_key: e.target.value })}
                        placeholder="sk-proj-..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-md px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-red-500 outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTestKey("openai")}
                      className="h-10 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold rounded-md transition"
                    >
                      Test Connection
                    </button>
                  </div>
                )}

                {/* Claude */}
                {config.active_provider === "claude" && (
                  <div className="grid grid-cols-4 gap-4 items-center">
                    <span className="text-xs text-gray-400 col-span-1 font-semibold">Claude API Key:</span>
                    <div className="col-span-2">
                      <input
                        type="password"
                        value={config.claude_key}
                        onChange={(e) => setConfig({ ...config, claude_key: e.target.value })}
                        placeholder="sk-ant-..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-md px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-red-500 outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTestKey("claude")}
                      className="h-10 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold rounded-md transition"
                    >
                      Test Connection
                    </button>
                  </div>
                )}

                {/* OpenRouter */}
                {config.active_provider === "openrouter" && (
                  <div className="grid grid-cols-4 gap-4 items-center">
                    <span className="text-xs text-gray-400 col-span-1 font-semibold">OpenRouter Key:</span>
                    <div className="col-span-2">
                      <input
                        type="password"
                        value={config.openrouter_key}
                        onChange={(e) => setConfig({ ...config, openrouter_key: e.target.value })}
                        placeholder="sk-or-v1-..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-md px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-red-500 outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTestKey("openrouter")}
                      className="h-10 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold rounded-md transition"
                    >
                      Test Connection
                    </button>
                  </div>
                )}

                {/* Groq */}
                {config.active_provider === "groq" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-4 items-center">
                      <span className="text-xs text-gray-400 col-span-1 font-semibold">Groq API Key:</span>
                      <div className="col-span-2">
                        <input
                          type="password"
                          value={config.groq_key}
                          onChange={(e) => setConfig({ ...config, groq_key: e.target.value })}
                          placeholder="gsk_..."
                          className="w-full bg-slate-950 border border-slate-700 rounded-md px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-red-500 outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTestKey("groq")}
                        className="h-10 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold rounded-md transition"
                      >
                        Test Connection
                      </button>
                    </div>
                    {config.db_missing_groq && (
                      <div className="bg-amber-950/40 border border-amber-500/30 text-amber-300 p-4 rounded-xl text-xs leading-relaxed">
                        ⚠️ <strong>डेटाबेस सूचना:</strong> आपके Supabase में <code>groq_key</code> कॉलम मौजूद नहीं है। आपकी यह कुंजी केवल तभी सेव होगी जब आप डेटाबेस में नया कॉलम जोड़ेंगे। कृपया &ldquo;Supabase Schema Guide&rdquo; टैब में दिए गए नए ALTER TABLE निर्देश को अपने Supabase SQL Editor में चलाएं। (तब तक आप <code>GROQ_API_KEY</code> को <code>.env.local</code> में भी सेट कर सकते हैं।)
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Status and Test Alerts */}
              {testResult.loading && <div className="text-xs text-blue-400">⏳ AI प्रदाता से संपर्क स्थापित किया जा रहा है...</div>}
              {testResult.text && (
                <div className={`p-3.5 rounded-xl text-xs border ${
                  testResult.success 
                    ? "bg-emerald-950/40 border-emerald-500/20 text-emerald-400" 
                    : "bg-red-950/40 border-red-500/20 text-red-400"
                }`}>
                  {testResult.text}
                </div>
              )}

              {saveStatus.text && (
                <div className={`p-3.5 rounded-xl text-sm border ${
                  saveStatus.success 
                    ? "bg-emerald-950/40 border-emerald-500/20 text-emerald-400" 
                    : "bg-red-950/40 border-red-500/20 text-red-400"
                }`}>
                  {saveStatus.text}
                </div>
              )}

              <div className="border-t border-slate-800 pt-4 flex gap-4">
                <button
                  type="submit"
                  disabled={saveStatus.loading}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md text-sm transition disabled:opacity-50"
                >
                  {saveStatus.loading ? "Saving..." : "Save Configuration"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: Registered Users */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <UsersIcon size={22} className="text-red-500" />
                  Registered Users
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Profile data, paid status, and AI limits management.
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name / city / category..."
                  className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-red-500 focus:outline-none"
                  onKeyDown={(e) => e.key === "Enter" && fetchUsers(searchQuery)}
                />
                <button
                  onClick={() => fetchUsers(searchQuery)}
                  className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 rounded-md transition"
                >
                  Search
                </button>
              </div>
            </div>

            {loadingUsers ? (
              <div className="py-12 text-center text-slate-500">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center text-slate-500">
                No users found.
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 text-xs border-b border-slate-800">
                      <th className="p-4">Name</th>
                      <th className="p-4">Profile</th>
                      <th className="p-4">Registered</th>
                      <th className="p-4 text-center">AI Msgs Used</th>
                      <th className="p-4 text-center">Premium</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/50">
                        <td className="p-4">
                          <p className="font-bold text-white">{u.name || "Anonymous"}</p>
                          <p className="text-xs text-slate-500">{u.id.substring(0, 8)}...</p>
                        </td>
                        <td className="p-4 space-y-0.5">
                          <p className="text-xs text-slate-300">{u.city || "N/A"}, {u.state}</p>
                          <p className="text-xs text-slate-400">{u.age} yr | {u.education}</p>
                          <p className="text-xs text-slate-500">{u.category.toUpperCase()} | {u.gender === "male" ? "M" : "F"}</p>
                        </td>
                        <td className="p-4 text-xs text-slate-400">
                          {new Date(u.created_at).toLocaleDateString("en-IN")}
                        </td>
                        <td className="p-4 text-center font-semibold text-lg text-white">
                          {u.ai_messages_used}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleTogglePaid(u.id, u.is_paid)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                              u.is_paid
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}
                          >
                            {u.is_paid ? "Paid" : "Free"}
                          </button>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleResetMessages(u.id)}
                            className="bg-blue-500/15 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 text-xs px-3 py-1.5 rounded-md transition"
                          >
                            Reset Counter
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Recent Chats */}
        {activeTab === "chats" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <MessageSquareIcon size={22} className="text-red-500" />
                Recent Conversations
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Questions asked by users and AI answers (live monitoring).
              </p>
            </div>

            {loadingChats ? (
              <div className="py-12 text-center text-slate-500">Loading chat history...</div>
            ) : chats.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center text-slate-500">
                No chat history found.
              </div>
            ) : (
              <div className="space-y-3 max-w-4xl">
                {chats.map((c) => (
                  <div
                    key={c.id}
                    className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3"
                  >
                    <div className="flex flex-wrap justify-between items-center text-xs text-slate-500 border-b border-slate-800 pb-2 gap-2">
                      <p>User: <span className="text-slate-300">{c.user_id?.substring(0, 8)}...</span></p>
                      <p>Exam ID: <span className="text-blue-400 font-semibold">{c.exam_id}</span></p>
                      <p>Date: {new Date(c.created_at).toLocaleString("en-IN")}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded h-fit">User</span>
                        <p className="text-sm font-semibold text-white">{c.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


        {/* Tab: Marketplace Orders */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <ShoppingBagIcon size={22} className="text-red-500" />
                  Marketplace Orders
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Payment and delivery tracking for notes, test series, and model papers.
                </p>
              </div>
              <button
                onClick={fetchOrders}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs px-3.5 py-2 rounded-md transition flex items-center gap-1.5"
              >
                <ZapIcon size={12} />
                Refresh
              </button>
            </div>

            {loadingOrders ? (
              <div className="py-12 text-center text-slate-500">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center text-slate-500">
                No orders yet.
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 text-xs border-b border-slate-800">
                      <th className="p-4">Customer</th>
                      <th className="p-4">Product</th>
                      <th className="p-4 text-center">Amount</th>
                      <th className="p-4 text-center">Payment</th>
                      <th className="p-4 text-center">Delivery</th>
                      <th className="p-4">Transaction</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-800/50">
                        <td className="p-4">
                          <p className="font-bold text-white">{o.customer_name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400">
                            <span className="truncate max-w-[200px]">{o.customer_email}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(o.customer_email);
                              }}
                              className="text-[10px] bg-slate-800 hover:bg-slate-700 px-1.5 py-0.5 rounded transition-colors"
                              title="Copy Email"
                            >
                              Copy
                            </button>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-semibold text-slate-200">
                            {o.product?.title || "Unknown Product"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {o.product?.exam_name || "Rajasthan Exam"}
                          </p>
                        </td>
                        <td className="p-4 text-center font-bold text-white">
                          ₹{Number(o.amount).toFixed(2)}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleUpdatePayment(o.id, o.payment_status)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                              o.payment_status === "paid"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-red-500/15 text-red-400 border border-red-500/30"
                            }`}
                          >
                            {o.payment_status === "paid" ? "Paid" : "Pending"}
                          </button>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleUpdateDelivery(o.id, o.delivery_status)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                              o.delivery_status === "delivered"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {o.delivery_status === "delivered" ? "Sent" : "Pending"}
                          </button>
                        </td>
                        <td className="p-4 text-xs text-slate-400 space-y-0.5">
                          <p>
                            <span className="text-slate-500">Order:</span>{" "}
                            {o.razorpay_order_id
                              ? o.razorpay_order_id.substring(0, 14)
                              : "N/A"}
                            ...
                          </p>
                          {o.razorpay_payment_id && (
                            <p>
                              <span className="text-slate-500">Pay:</span>{" "}
                              {o.razorpay_payment_id.substring(0, 14)}...
                            </p>
                          )}
                          <p>
                            <span className="text-slate-500">Date:</span>{" "}
                            {new Date(o.created_at).toLocaleString("en-IN")}
                          </p>
                        </td>
                        <td className="p-4 text-center">
                          {o.delivery_status !== "delivered" && o.payment_status === "paid" ? (
                            <button
                              onClick={() => handleUpdateDelivery(o.id, o.delivery_status)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-md transition"
                            >
                              Mark Sent
                            </button>
                          ) : (
                            <span className="text-xs text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === "categories" && (
          <CategoriesTab getAuthHeaders={getAuthHeaders} />
        )}

        {/* Exams Tab */}
        {activeTab === "exams" && (
          <ExamsTab getAuthHeaders={getAuthHeaders} />
        )}

        {/* Products Tab */}
        {activeTab === "products" && (
          <ProductsTab getAuthHeaders={getAuthHeaders} />
        )}

        {/* Tab 5: Supabase Schema Guide */}
        {activeTab === "schema" && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <DatabaseIcon size={22} className="text-red-500" />
                Supabase Schema Guide
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Run these in Supabase SQL Editor to activate admin settings and AI providers.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
              <p className="text-sm text-slate-300">
                If you see <strong>&ldquo;Relation does not exist&rdquo;</strong> errors when opening
                the admin panel, run this complete script in your Supabase SQL Editor:
              </p>

              <pre className="bg-slate-950 border border-slate-800 rounded-md p-5 overflow-x-auto text-xs text-emerald-400 font-mono leading-relaxed">
{`-- 1. Add is_admin column to user_profiles table if missing
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Create Admin Settings Table for AI Provider & API Keys
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  active_provider TEXT NOT NULL DEFAULT 'openrouter',
  gemini_key TEXT DEFAULT '',
  openai_key TEXT DEFAULT '',
  claude_key TEXT DEFAULT '',
  openrouter_key TEXT DEFAULT '',
  groq_key TEXT DEFAULT '',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Run this migration if table already exists but lacks groq_key column
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS groq_key TEXT DEFAULT '';

-- 4. Enable Row Level Security (RLS)
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- 5. Insert default row if settings table is empty
INSERT INTO admin_settings (active_provider)
SELECT 'openrouter'
WHERE NOT EXISTS (SELECT 1 FROM admin_settings);`}
              </pre>

              <div className="bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs p-4 rounded-md">
                <strong>Note:</strong> After enabling RLS, no public policy has been created — meaning
                no normal browser user can leak the keys. Settings are controlled only via the
                secure server-side API router.
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
