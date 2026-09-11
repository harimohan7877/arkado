"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

interface OrderItem {
  order_id: string;
  name: string;
  email: string;
  phone: string;
  course_id: string;
  course_title: string;
  amount: number;
  drive_url: string;
  status: string;
  payment_status: string;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: Record<string, unknown> } | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setSettings).catch(() => {});
  }, []);

  useEffect(() => {
    async function loadUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/auth");
          return;
        }
        setUser(user);

        // Fetch user orders
        const res = await fetch("/api/orders");
        if (res.ok) {
          const json = await res.json();
          if (json.orders && Array.isArray(json.orders)) {
            const userEmail = user.email?.toLowerCase();
            const myOrders = json.orders.filter(
              (o: OrderItem) => o.email && o.email.toLowerCase() === userEmail
            );
            setOrders(myOrders);
          }
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    document.cookie = "sb-access-token=; path=/; max-age=0";
    localStorage.clear();
    sessionStorage.clear();
    router.replace("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfcf9] flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-10 h-10 border-3 border-amber-600/30 border-t-amber-600 rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono font-bold text-stone-600">डैशबोर्ड लोड हो रहा है...</p>
      </div>
    );
  }

  const userName =
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.name as string) ||
    user?.email?.split("@")[0] ||
    "Student";

  return (
    <div className="min-h-screen bg-[#fcfcf9] font-sans pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative h-9 w-32 flex items-center">
              <Image
                src="/logo.svg"
                alt="Arkado"
                width={130}
                height={40}
                priority
                unoptimized
                className="object-contain w-full h-full"
              />
            </div>
            <span className="text-xs font-bold font-mono text-stone-400 border-l border-stone-200 pl-2 hidden sm:inline">
              Student Portal
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/exams"
              className="text-xs font-bold text-stone-700 hover:text-amber-800 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition hidden sm:inline-block"
            >
              सभी नोट्स (All Exams)
            </Link>
            <button
              onClick={handleLogout}
              className="text-xs font-bold text-stone-600 hover:text-red-700 px-3.5 py-1.5 rounded-lg border border-stone-300 hover:border-red-300 hover:bg-red-50/50 transition cursor-pointer"
            >
              लॉग आउट (Logout)
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Welcome Hero Card */}
        <div className="bg-gradient-to-r from-stone-900 to-stone-800 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-mono font-bold mb-3 border border-amber-400/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                सक्रिय छात्र खाता (Active Account)
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                नमस्ते, {userName}! 🙏
              </h1>
              <p className="text-sm text-stone-300 mt-1 font-mono">
                {user?.email}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/exams"
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-md"
              >
                + नई अध्ययन सामग्री देखें
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-xs">
            <p className="text-xs font-mono font-bold text-stone-500 uppercase tracking-wider">
              कुल ऑर्डर्स (Orders)
            </p>
            <p className="text-2xl font-bold text-stone-900 mt-1">{orders.length}</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-xs">
            <p className="text-xs font-mono font-bold text-stone-500 uppercase tracking-wider">
              डाउनलोड्स (Downloads)
            </p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">
              {orders.filter((o) => o.drive_url).length} सक्रिय
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-mono font-bold text-stone-500 uppercase tracking-wider">
                सहायता (Support)
              </p>
              <p className="text-sm font-bold text-stone-900 mt-1">
                {settings?.contact?.phone || "7852004401"}
              </p>
            </div>
            <a
              href={settings?.social?.whatsapp_url || `https://wa.me/${(settings?.contact?.whatsapp_number || "917852004401").replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200 transition"
            >
              WhatsApp →
            </a>
          </div>
        </div>

        {/* Purchases & Downloads Section */}
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-stone-900">
                📚 मेरे खरीदे गए नोट्स व PDF (My Downloads)
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                यहाँ आपकी सभी खरीदी गई अध्ययन सामग्री व Google Drive डाउनलोड लिंक मिलेंगे
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              {orders.length} आइटम
            </span>
          </div>

          {orders.length === 0 ? (
            /* Empty State */
            <div className="p-12 text-center">
              <div className="text-4xl mb-3">📖</div>
              <h3 className="text-base font-bold text-stone-800 mb-1">
                अभी तक कोई नोट्स नहीं खरीदे गए हैं
              </h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto mb-6">
                CET, Patwari, Police Constable, REET और अन्य परीक्षाओं के सर्वश्रेष्ठ हैंडराइटन नोट्स और PYQ तुरंत प्राप्त करें।
              </p>
              <Link
                href="/exams"
                className="inline-block px-6 py-3 bg-stone-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition"
              >
                सभी नोट्स व टेस्ट देखें (Browse Notes) →
              </Link>
            </div>
          ) : (
            /* Orders List */
            <div className="divide-y divide-stone-100">
              {orders.map((order) => (
                <div
                  key={order.order_id}
                  className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50/50 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                        {order.order_id}
                      </span>
                      <span className="text-xs text-stone-400 font-mono">
                        {new Date(order.created_at).toLocaleDateString("hi-IN")}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-stone-900">
                      {order.course_title || order.course_id}
                    </h4>
                    <p className="text-xs text-stone-500">
                      राशि: <strong className="text-stone-800">₹{order.amount}</strong> • डिलीवरी: {order.phone ? `WhatsApp (${order.phone})` : order.email}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {order.drive_url ? (
                      <a
                        href={order.drive_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                      >
                        <span>📥 PDF डाउनलोड लिंक खोलें</span>
                        <span>↗</span>
                      </a>
                    ) : (
                      <span className="text-xs font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                        ⏳ 1-2 घंटे में लिंक जारी होगा
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
