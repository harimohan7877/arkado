"use client";

import { useState, useEffect } from "react";
import { WhatsappIcon } from "@/components/icons";

export interface Order {
  id: string;
  order_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  name?: string;
  email?: string;
  phone?: string;
  delivery_mode: "whatsapp" | "gmail" | "both";
  utr: string;
  amount: number;
  course_id: string;
  course_title: string;
  exam_name: string;
  payment_status: "pending" | "paid" | "failed";
  delivery_status: "pending" | "delivered";
  drive_url?: string;
  created_at: string;
}

interface OrdersTabProps {
  getAuthHeaders: () => Record<string, string>;
  orders?: Order[];
}

export default function OrdersTab({ getAuthHeaders, orders: initialOrders = [] }: OrdersTabProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "paid" | "delivered">("all");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders", { headers: getAuthHeaders() });
      if (res.ok) setOrders(await res.json());
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "ऑर्डर्स लोड करने में त्रुटि आई।" });
    } finally {
      setLoading(false);
    }
  };

  // 1. One-Click Automated Email Dispatch & Approval
  const handleApproveAndSendEmail = async (order: Order) => {
    if (approvingId) return;
    setApprovingId(order.id);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/orders/${order.id}/approve`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "ऑर्डर स्वीकृत नहीं किया जा सका।");
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id || o.order_id === order.order_id
            ? { ...o, payment_status: "paid", delivery_status: "delivered" }
            : o
        )
      );

      const targetEmail = order.customer_email || order.email || "छात्र";
      setMessage({
        type: "success",
        text: `✅ ऑर्डर ${order.order_id} स्वीकृत हो गया! Google Drive नोट्स ईमेल (${targetEmail}) पर सफलतापूर्वक भेज दिए गए।`,
      });
    } catch (err: any) {
      console.error("Approve error:", err);
      setMessage({
        type: "error",
        text: `❌ ईमेल भेजने में त्रुटि: ${err.message || "कृपया SMTP सेटिंग्स जांचें"}`,
      });
    } finally {
      setApprovingId(null);
    }
  };

  // 2. Reject / Delete Fake Submission from Database
  const handleDeleteOrder = async (order: Order) => {
    if (deletingId) return;

    const confirmed = window.confirm(
      `⚠️ क्या आप इस ऑर्डर को डेटाबेस से स्थायी रूप से हटाना चाहते हैं?\n\nOrder ID: ${order.order_id}\nनाम: ${order.customer_name || order.name}\nराशि: ₹${order.amount}\nUTR: ${order.utr || "नहीं दिया"}`
    );
    if (!confirmed) return;

    setDeletingId(order.id);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "ऑर्डर नहीं हटाया जा सका।");
      }

      setOrders((prev) => prev.filter((o) => o.id !== order.id && o.order_id !== order.order_id));
      if (expandedOrder === order.id) setExpandedOrder(null);

      setMessage({
        type: "success",
        text: `🗑️ फर्जी/अमान्य ऑर्डर ${order.order_id} डेटाबेस से हटा दिया गया।`,
      });
    } catch (err: any) {
      console.error("Delete error:", err);
      setMessage({
        type: "error",
        text: `❌ हटाने में त्रुटि: ${err.message || "सर्वर समस्या"}`,
      });
    } finally {
      setDeletingId(null);
    }
  };

  // 3. Export to Excel (CSV)
  const exportToExcelCSV = () => {
    if (orders.length === 0) {
      setMessage({ type: "error", text: "डाउनलोड करने के लिए कोई ऑर्डर मौजूद नहीं है।" });
      return;
    }

    const headers = [
      "Order ID",
      "Date",
      "Customer Name",
      "Mobile Number",
      "Email Address",
      "Course Title",
      "Amount (INR)",
      "Payment Status",
      "Delivery Status",
      "UTR / Ref No",
      "Google Drive Link",
    ];

    const rows = orders.map((o) => [
      `"${o.order_id || o.id}"`,
      `"${new Date(o.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}"`,
      `"${(o.customer_name || o.name || "").replace(/"/g, '""')}"`,
      `"${(o.customer_phone || o.phone || "").replace(/"/g, '""')}"`,
      `"${(o.customer_email || o.email || "").replace(/"/g, '""')}"`,
      `"${(o.course_title || "").replace(/"/g, '""')}"`,
      o.amount || 0,
      `"${o.payment_status}"`,
      `"${o.delivery_status}"`,
      `"${(o.utr || "").replace(/"/g, '""')}"`,
      `"${(o.drive_url || "").replace(/"/g, '""')}"`,
    ]);

    // Prepend UTF-8 BOM so Excel displays Hindi characters accurately
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Arkado_Orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setMessage({ type: "success", text: "📥 Excel (CSV) शीट सफलतापूर्वक डाउनलोड हो गई!" });
  };

  const handleSendWhatsApp = (order: Order) => {
    const utrLine = order.utr ? `\nUTR No: ${order.utr}` : "";
    const msg = `नमस्ते ${order.customer_name}!\n\nआपने Arkado से "${order.course_title}" के लिए ₹${order.amount} का भुगतान किया है।\n\nOrder ID: ${order.order_id}${utrLine}\n\nयहाँ आपके नोट्स व अध्ययन सामग्री की डाउनलोड लिंक उपलब्ध है:\n${order.drive_url || "https://www.arkado.store/dashboard"}\n\nधन्यवाद! — Team Arkado`;
    const rawDigits = (order.customer_phone || order.phone || "").replace(/\D/g, "").slice(-10);
    const phone = rawDigits ? `91${rawDigits}` : "";
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    handleUpdateDelivery(order.id, "delivered");
  };

  const handleUpdateDelivery = async (id: string, status: "pending" | "delivered") => {
    try {
      await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ delivery_status: status }),
      });
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, delivery_status: status } : o)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePayment = async (id: string, status: "pending" | "paid" | "failed") => {
    try {
      await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ payment_status: status }),
      });
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, payment_status: status } : o)));
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setMessage({ type: "success", text: `${label} कॉपी हो गया!` });
  };

  const filteredOrders = orders
    .filter((o) => {
      if (filterStatus !== "all") {
        if (filterStatus === "delivered") return o.delivery_status === "delivered";
        if (filterStatus === "paid") return o.payment_status === "paid" && o.delivery_status === "pending";
        return o.payment_status === filterStatus;
      }
      return true;
    })
    .filter((o) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (o.customer_name || o.name || "").toLowerCase().includes(q) ||
        (o.customer_email || o.email || "").toLowerCase().includes(q) ||
        (o.customer_phone || o.phone || "").includes(q) ||
        (o.order_id || o.id || "").toLowerCase().includes(q) ||
        (o.utr || "").toLowerCase().includes(q) ||
        (o.course_title || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const stats = {
    total: orders.length,
    pendingApproval: orders.filter((o) => o.payment_status !== "paid" || o.delivery_status !== "delivered").length,
    paidDelivered: orders.filter((o) => o.payment_status === "paid" && o.delivery_status === "delivered").length,
    revenue: orders.filter((o) => o.payment_status === "paid").reduce((sum, o) => sum + (Number(o.amount) || 0), 0),
  };

  const getPaymentChip = (status: Order["payment_status"]) => {
    if (status === "paid") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (status === "failed") return "bg-red-50 text-red-700 border-red-200";
    return "bg-amber-50 text-amber-800 border-amber-300 font-bold";
  };

  const getDeliveryChip = (status: Order["delivery_status"]) =>
    status === "delivered"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-amber-50 text-amber-800 border-amber-300 font-bold";

  return (
    <div className="space-y-5">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 flex items-center gap-2">
            <span>📑</span> ऑर्डर व पेमेंट सत्यापन (Orders & Verification)
          </h2>
          <p className="text-stone-500 text-xs sm:text-sm mt-0.5">
            पेमेंट चेक करें, 1-क्लिक में Google Drive नोट्स ईमेल पर भेजें या फर्जी प्रविष्टियां हटाएं।
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportToExcelCSV}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <span>📥</span>
            <span>Export to Excel (CSV)</span>
          </button>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl disabled:opacity-50 transition cursor-pointer flex items-center gap-1"
          >
            <span>{loading ? "↻" : "↻"}</span>
            <span>{loading ? "लोड हो रहा है..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="कुल ऑर्डर्स (Total)" value={stats.total} accent="stone" />
        <StatCard label="सत्यापन बाकी (Pending Action)" value={stats.pendingApproval} accent="amber" highlight={stats.pendingApproval > 0} />
        <StatCard label="स्वीकृत व डिलीवर्ड (Delivered)" value={stats.paidDelivered} accent="emerald" />
        <StatCard label="सत्यापित आय (Revenue)" value={`₹${stats.revenue.toLocaleString("en-IN")}`} accent="emerald" />
      </div>

      {/* Toast Alert Message */}
      {message && (
        <div
          className={`p-3.5 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between gap-2 shadow-xs anim-fade-in-up ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
              : "bg-red-50 border-red-300 text-red-800"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-stone-400 hover:text-stone-700 font-bold px-1">✕</button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white border border-stone-200 rounded-2xl p-3 flex flex-col sm:flex-row gap-2.5 shadow-xs">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="🔍 खोजें: नाम, मोबाइल, ईमेल, UTR नंबर, Order ID, कोर्स..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3 pr-8 py-2 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 focus:border-amber-600 focus:bg-white focus:outline-none text-xs sm:text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          className="px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 font-semibold focus:border-amber-600 focus:bg-white focus:outline-none text-xs sm:text-sm cursor-pointer"
        >
          <option value="all">सभी ऑर्डर्स (All Status)</option>
          <option value="pending">⏳ सत्यापन बाकी (Pending Payment)</option>
          <option value="paid">📦 अप्रूव्ड - डिलीवरी बाकी (Paid)</option>
          <option value="delivered">✅ नोट्स भेजे गए (Delivered)</option>
        </select>
      </div>

      {/* Excel-Style Dense Table for Desktop */}
      <div className="hidden lg:block bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-16 text-center text-stone-400 text-sm">
            {orders.length === 0 ? "कोई ऑर्डर मौजूद नहीं है।" : "खोज के अनुसार कोई ऑर्डर नहीं मिला।"}
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-stone-100/90 backdrop-blur-xs sticky top-0 z-10 border-b border-stone-300 text-stone-700 font-extrabold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3 border-r border-stone-200">तारीख / ID</th>
                  <th className="p-3 border-r border-stone-200">विद्यार्थी का नाम व फोन</th>
                  <th className="p-3 border-r border-stone-200">ईमेल (Drive Link Destination)</th>
                  <th className="p-3 border-r border-stone-200">कोर्स</th>
                  <th className="p-3 text-right border-r border-stone-200">राशि</th>
                  <th className="p-3 border-r border-stone-200">UTR / Ref No.</th>
                  <th className="p-3 text-center border-r border-stone-200">स्थिति (Status)</th>
                  <th className="p-3 text-right min-w-[200px]">एक्शन (Approval / Reject)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 font-medium text-stone-800">
                {filteredOrders.map((order, idx) => {
                  const phoneDigits = (order.customer_phone || order.phone || "").replace(/\D/g, "").slice(-10);
                  const isApproved = order.payment_status === "paid" && order.delivery_status === "delivered";
                  const isApproving = approvingId === order.id;
                  const isDeleting = deletingId === order.id;

                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-amber-50/40 transition-colors ${
                        idx % 2 === 0 ? "bg-white" : "bg-stone-50/50"
                      } ${!isApproved ? "bg-amber-50/20" : ""}`}
                    >
                      {/* Date & Order ID */}
                      <td className="p-3 border-r border-stone-200 align-top">
                        <div className="font-mono font-bold text-stone-900 text-[11px] flex items-center gap-1">
                          <span>{order.order_id || order.id}</span>
                          <button
                            onClick={() => copyToClipboard(order.order_id || order.id, "Order ID")}
                            className="text-stone-400 hover:text-stone-700 text-[10px]"
                            title="Copy Order ID"
                          >
                            📋
                          </button>
                        </div>
                        <div className="text-[10px] text-stone-400 mt-0.5">
                          {new Date(order.created_at).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      {/* Student Name & Mobile */}
                      <td className="p-3 border-r border-stone-200 align-top">
                        <p className="font-bold text-stone-900 text-xs">{order.customer_name || order.name || "N/A"}</p>
                        {phoneDigits ? (
                          <div className="flex items-center gap-1.5 mt-1 font-mono text-[11px] text-stone-600">
                            <span>{phoneDigits}</span>
                            <a
                              href={`https://wa.me/91${phoneDigits}?text=${encodeURIComponent(
                                `नमस्ते ${order.customer_name || order.name}! Arkado Order (${order.order_id}) के संबंध में:`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-700 hover:text-emerald-800 font-bold inline-flex items-center gap-0.5 bg-emerald-50 px-1 rounded border border-emerald-200"
                              title="WhatsApp पर मैसेज करें"
                            >
                              <WhatsappIcon size={11} className="text-emerald-600 inline" /> चैट
                            </a>
                          </div>
                        ) : (
                          <span className="text-[10px] text-stone-400">नंबर नहीं दिया</span>
                        )}
                      </td>

                      {/* Email Address */}
                      <td className="p-3 border-r border-stone-200 align-top">
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-stone-700 text-[11px] truncate max-w-[190px]">
                            {order.customer_email || order.email || "N/A"}
                          </span>
                          {(order.customer_email || order.email) && (
                            <button
                              onClick={() => copyToClipboard(order.customer_email || order.email || "", "Email")}
                              className="text-stone-400 hover:text-stone-700 text-[10px]"
                              title="Copy Email"
                            >
                              📋
                            </button>
                          )}
                        </div>
                        <span className="text-[10px] text-amber-700 font-semibold">नोट्स इसी ईमेल पर जाएंगे</span>
                      </td>

                      {/* Course */}
                      <td className="p-3 border-r border-stone-200 align-top">
                        <p className="font-bold text-stone-900 text-xs truncate max-w-[200px]" title={order.course_title}>
                          {order.course_title}
                        </p>
                        <p className="text-[10px] text-stone-400">{order.exam_name || "Course Bundle"}</p>
                      </td>

                      {/* Amount */}
                      <td className="p-3 text-right font-black text-emerald-800 text-sm border-r border-stone-200 align-top">
                        ₹{order.amount}
                      </td>

                      {/* UTR Number */}
                      <td className="p-3 border-r border-stone-200 align-top">
                        {order.utr && order.utr.trim().length > 0 ? (
                          <div className="flex items-center gap-1 bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200 w-fit">
                            <span className="font-mono font-bold text-xs">{order.utr}</span>
                            <button
                              onClick={() => copyToClipboard(order.utr, "UTR")}
                              className="text-emerald-700 hover:text-emerald-950 text-[10px] font-bold"
                              title="Copy UTR"
                            >
                              📋
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-stone-400 italic">वैकल्पिक (खाली)</span>
                        )}
                      </td>

                      {/* Status Badges */}
                      <td className="p-3 text-center border-r border-stone-200 align-top space-y-1">
                        <div>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPaymentChip(order.payment_status)}`}>
                            {order.payment_status === "paid" ? "₹ Paid" : "⏳ Pending"}
                          </span>
                        </div>
                        <div>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getDeliveryChip(order.delivery_status)}`}>
                            {order.delivery_status === "delivered" ? "✉️ Delivered" : "⏳ Not Sent"}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right align-top">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {!isApproved ? (
                            <button
                              onClick={() => handleApproveAndSendEmail(order)}
                              disabled={isApproving}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-lg transition shadow-xs disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                              title="सत्यापित करें व Google Drive नोट्स की ईमेल छात्र को भेजें"
                            >
                              {isApproving ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span>भेज रहा है...</span>
                                </>
                              ) : (
                                <>
                                  <span>✅</span>
                                  <span>Approve & Send</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleApproveAndSendEmail(order)}
                              disabled={isApproving}
                              className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-[10px] rounded-lg transition"
                              title="छात्र को दोबारा ईमेल भेजें"
                            >
                              {isApproving ? "भेज रहा है..." : "↻ Re-send Email"}
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteOrder(order)}
                            disabled={isDeleting}
                            className="px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[11px] rounded-lg border border-red-200 transition disabled:opacity-50 cursor-pointer"
                            title="फर्जी प्रविष्टि हटाएं (Delete Fake Order)"
                          >
                            {isDeleting ? "..." : "🗑️ Fake"}
                          </button>

                          <button
                            onClick={() => setExpandedOrder(order.id === expandedOrder ? null : order.id)}
                            className="px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-semibold rounded-lg transition cursor-pointer"
                          >
                            विवरण
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-stone-400 text-sm bg-white border border-stone-200 rounded-2xl">
            कोई ऑर्डर नहीं मिला।
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isApproved = order.payment_status === "paid" && order.delivery_status === "delivered";
            const isApproving = approvingId === order.id;
            const isDeleting = deletingId === order.id;
            const phoneDigits = (order.customer_phone || order.phone || "").replace(/\D/g, "").slice(-10);

            return (
              <div
                key={order.id}
                className={`bg-white border rounded-2xl p-4 space-y-3 shadow-xs ${
                  !isApproved ? "border-amber-300 bg-amber-50/10" : "border-stone-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                      {order.order_id || order.id}
                    </span>
                    <h3 className="font-bold text-stone-900 text-sm mt-1">{order.customer_name || order.name}</h3>
                    <p className="text-[11px] text-stone-600 line-clamp-1">{order.course_title}</p>
                  </div>
                  <p className="font-black text-emerald-800 text-base shrink-0">₹{order.amount}</p>
                </div>

                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500 text-[11px]">मोबाइल:</span>
                    <span className="font-mono font-bold text-stone-800">{phoneDigits || "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500 text-[11px]">ईमेल:</span>
                    <span className="font-mono text-stone-800 text-[11px] truncate max-w-[190px]">{order.customer_email || order.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500 text-[11px]">UTR/Ref:</span>
                    <span className="font-mono font-bold text-emerald-700">{order.utr || "नहीं दिया"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <span className={`px-2 py-0.5 rounded-full font-bold border text-[10px] ${getPaymentChip(order.payment_status)}`}>
                    {order.payment_status === "paid" ? "₹ Paid" : "⏳ Pending"}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-bold border text-[10px] ${getDeliveryChip(order.delivery_status)}`}>
                    {order.delivery_status === "delivered" ? "✉️ Delivered" : "⏳ Pending Delivery"}
                  </span>
                </div>

                {/* Mobile Action Buttons */}
                <div className="flex gap-2 pt-2 border-t border-stone-200">
                  {!isApproved ? (
                    <button
                      onClick={() => handleApproveAndSendEmail(order)}
                      disabled={isApproving}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                      {isApproving ? "भेज रहा है..." : "✅ Approve & Send"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleApproveAndSendEmail(order)}
                      disabled={isApproving}
                      className="flex-1 py-2.5 bg-stone-100 text-stone-700 font-bold text-xs rounded-xl"
                    >
                      {isApproving ? "..." : "↻ Re-send"}
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteOrder(order)}
                    disabled={isDeleting}
                    className="px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 disabled:opacity-50"
                  >
                    🗑️ Fake
                  </button>

                  <button
                    onClick={() => setExpandedOrder(order.id === expandedOrder ? null : order.id)}
                    className="px-3 py-2.5 bg-stone-100 text-stone-700 text-xs font-semibold rounded-xl"
                  >
                    विवरण
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Expanded Order Detail Modal */}
      {expandedOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setExpandedOrder(null)} />
          <div className="relative bg-white border border-stone-200 rounded-t-3xl sm:rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto z-10 p-5 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-stone-900">ऑर्डर संपूर्ण विवरण (Full Details)</h3>
              <button
                onClick={() => setExpandedOrder(null)}
                className="w-9 h-9 rounded-lg hover:bg-stone-100 text-stone-500 flex items-center justify-center text-lg font-bold"
              >
                ✕
              </button>
            </div>
            {(() => {
              const currentOrder = orders.find((o) => o.id === expandedOrder || o.order_id === expandedOrder);
              if (!currentOrder) return null;
              return (
                <OrderDetailCard
                  order={currentOrder}
                  onClose={() => setExpandedOrder(null)}
                  onApprove={() => handleApproveAndSendEmail(currentOrder)}
                  onDelete={() => handleDeleteOrder(currentOrder)}
                  onSendWhatsApp={handleSendWhatsApp}
                  copyToClipboard={copyToClipboard}
                  isApproving={approvingId === currentOrder.id}
                  isDeleting={deletingId === currentOrder.id}
                />
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  highlight,
}: {
  label: string;
  value: string | number;
  accent: "emerald" | "amber" | "stone";
  highlight?: boolean;
}) {
  const accents = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    amber: "bg-amber-50 border-amber-300 text-amber-800",
    stone: "bg-stone-50 border-stone-200 text-stone-700",
  };

  return (
    <div
      className={`border rounded-2xl p-4 transition ${accents[accent]} ${
        highlight ? "ring-2 ring-amber-500/50 shadow-sm" : ""
      }`}
    >
      <p className="text-[10px] uppercase tracking-wider font-extrabold text-stone-500">{label}</p>
      <p className="text-xl sm:text-2xl font-black mt-1 text-stone-900">{value}</p>
    </div>
  );
}

function OrderDetailCard({
  order,
  onClose,
  onApprove,
  onDelete,
  onSendWhatsApp,
  copyToClipboard,
  isApproving,
  isDeleting,
}: {
  order: Order;
  onClose: () => void;
  onApprove: () => void;
  onDelete: () => void;
  onSendWhatsApp: (o: Order) => void;
  copyToClipboard: (t: string, l: string) => void;
  isApproving: boolean;
  isDeleting: boolean;
}) {
  const isApproved = order.payment_status === "paid" && order.delivery_status === "delivered";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3.5 bg-stone-50 rounded-xl border border-stone-200">
        <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-xl shrink-0">
          📦
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-stone-900 text-sm truncate">{order.course_title}</h4>
          <p className="text-xs text-stone-500">{order.exam_name || "Course Bundle"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DetailItem label="विद्यार्थी का नाम" value={order.customer_name || order.name || "N/A"} />
        <DetailItem
          label="ईमेल पता (नोट्स लिंक डिलीवरी)"
          value={order.customer_email || order.email || "N/A"}
          copyable
          onCopy={() => copyToClipboard(order.customer_email || order.email || "", "Email")}
        />
        <DetailItem
          label="मोबाइल / WhatsApp"
          value={order.customer_phone || order.phone || "N/A"}
          copyable
          onCopy={() => copyToClipboard(order.customer_phone || order.phone || "", "Phone")}
        />
        <DetailItem label="भुगतान राशि" value={`₹${order.amount}`} />
        <DetailItem
          label="UTR / ट्रांजेक्शन रेफरेंस"
          value={order.utr || "वैकल्पिक (खाली छोड़ा गया)"}
          copyable={Boolean(order.utr)}
          onCopy={() => copyToClipboard(order.utr, "UTR")}
        />
        <DetailItem
          label="Order ID"
          value={order.order_id || order.id}
          copyable
          onCopy={() => copyToClipboard(order.order_id || order.id, "Order ID")}
        />
        <DetailItem
          label="तारीख व समय"
          value={new Date(order.created_at).toLocaleString("hi-IN", { timeZone: "Asia/Kolkata" })}
        />
        <DetailItem
          label="Google Drive लिंक"
          value={order.drive_url || "डिफ़ॉल्ट कोर्स ड्राइव"}
          copyable={Boolean(order.drive_url)}
          onCopy={() => copyToClipboard(order.drive_url || "", "Drive Link")}
        />
      </div>

      {/* Action Footer inside Modal */}
      <div className="flex flex-wrap gap-2 pt-4 border-t border-stone-200">
        {!isApproved ? (
          <button
            onClick={() => {
              onApprove();
              onClose();
            }}
            disabled={isApproving}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-sm transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isApproving ? "ईमेल भेजा जा रहा है..." : "✅ Approve & Send Email"}
          </button>
        ) : (
          <button
            onClick={() => {
              onApprove();
              onClose();
            }}
            disabled={isApproving}
            className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-sm transition"
          >
            ↻ Re-send Drive Link Email
          </button>
        )}

        <button
          onClick={() => {
            onSendWhatsApp(order);
          }}
          className="px-4 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl text-sm border border-emerald-300 transition flex items-center gap-1.5"
        >
          <WhatsappIcon size={16} className="text-emerald-600 inline" /> WhatsApp
        </button>

        <button
          onClick={() => {
            onDelete();
          }}
          disabled={isDeleting}
          className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl text-sm border border-red-200 transition"
        >
          🗑️ Fake / Delete
        </button>

        <button
          onClick={onClose}
          className="px-4 py-3 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 font-semibold text-sm transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  copyable,
  onCopy,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
      <p className="text-[10px] text-stone-500 uppercase tracking-wider font-bold">{label}</p>
      <div className="flex items-center justify-between gap-2 mt-1">
        <span className="font-mono text-xs text-stone-900 truncate" title={value}>
          {value}
        </span>
        {copyable && onCopy && (
          <button
            onClick={onCopy}
            className="text-[10px] bg-stone-200 hover:bg-stone-300 px-2 py-0.5 rounded font-semibold text-stone-700 shrink-0"
          >
            Copy
          </button>
        )}
      </div>
    </div>
  );
}
