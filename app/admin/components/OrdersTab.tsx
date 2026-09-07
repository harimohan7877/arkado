"use client";

import { useState } from "react";

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

interface OrdersTabProps {
  getAuthHeaders: () => Record<string, string>;
  orders: Order[];
}

export default function OrdersTab({ getAuthHeaders, orders: initialOrders }: OrdersTabProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "paid" | "delivered">("all");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders", { headers: getAuthHeaders() });
      if (res.ok) setOrders(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsApp = (order: Order) => {
    const msg = `नमस्ते ${order.customer_name}!\n\nआपने Arkado से "${order.course_title}" के लिए ₹${order.amount} का पेमेंट किया है।\n\nOrder ID: ${order.order_id}\nUTR No: ${order.utr}\n\nकृपया नोट्स की डाउनलोड लिंक यहाँ भेजें।`;
    const url = `https://wa.me/${order.customer_phone || "917852004401"}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    handleUpdateDelivery(order.id, "delivered");
    setMessage({ type: "success", text: "WhatsApp opened!" });
  };

  const handleSendGmail = (order: Order) => {
    const subject = `Arkado Order ${order.order_id} - ${order.course_title}`;
    const body = `Hello ${order.customer_name},\n\nThank you for purchasing "${order.course_title}" from Arkado for ₹${order.amount}.\n\nOrder ID: ${order.order_id}\nUTR No: ${order.utr}\n\nYour notes access link will be sent shortly.\n\n— Team Arkado`;
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(order.customer_email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    handleUpdateDelivery(order.id, "delivered");
    setMessage({ type: "success", text: "Gmail opened!" });
  };

  const handleUpdateDelivery = async (id: string, status: "pending" | "delivered") => {
    try {
      await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ delivery_status: status }),
      });
      setOrders(orders.map((o) => (o.id === id ? { ...o, delivery_status: status } : o)));
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
      setOrders(orders.map((o) => (o.id === id ? { ...o, payment_status: status } : o)));
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: "success", text: `${label} copied!` });
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
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_email.toLowerCase().includes(q) ||
        o.order_id.toLowerCase().includes(q) ||
        o.utr.includes(q) ||
        o.course_title.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const stats = {
    total: orders.length,
    paid: orders.filter((o) => o.payment_status === "paid").length,
    pendingDelivery: orders.filter((o) => o.payment_status === "paid" && o.delivery_status === "pending").length,
    revenue: orders.filter((o) => o.payment_status === "paid").reduce((sum, o) => sum + o.amount, 0),
  };

  const getPaymentChip = (status: Order["payment_status"]) => {
    if (status === "paid") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (status === "failed") return "bg-red-50 text-red-700 border-red-200";
    return "bg-amber-50 text-amber-700 border-amber-200";
  };
  const getDeliveryChip = (status: Order["delivery_status"]) =>
    status === "delivered"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900">Orders</h2>
          <p className="text-stone-500 text-sm">Track payments and deliver course access via WhatsApp or Gmail.</p>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-semibold rounded-xl disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} accent="stone" />
        <StatCard label="Paid" value={stats.paid} accent="emerald" />
        <StatCard label="Pending" value={stats.pendingDelivery} accent="amber" />
        <StatCard label="Revenue" value={`₹${stats.revenue.toLocaleString()}`} accent="amber" />
      </div>

      {message && (
        <div className={`p-3 rounded-xl border text-sm ${message.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-2xl p-3 flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          placeholder="Search: Name, Email, UTR, Order ID, Course..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          className="px-4 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 focus:border-amber-500 focus:outline-none text-sm"
        >
          <option value="all">All</option>
          <option value="pending">Pending Payment</option>
          <option value="paid">Paid - Pending Delivery</option>
          <option value="delivered">Delivered</option>
        </select>
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block bg-white border border-stone-200 rounded-2xl overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-stone-400 text-sm">
            {orders.length === 0 ? "No orders yet." : "No orders match your filters."}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4 text-left">Customer</th>
                <th className="p-4 text-left">Course</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4 text-center">Payment</th>
                <th className="p-4 text-center">Delivery</th>
                <th className="p-4 text-left">UTR / Order</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-stone-50">
                  <td className="p-4">
                    <p className="font-bold text-stone-900 text-sm">{order.customer_name}</p>
                    <p className="text-[11px] text-stone-500 truncate max-w-[200px]">{order.customer_email}</p>
                    {order.customer_phone && (
                      <p className="text-[11px] text-stone-500">{order.customer_phone}</p>
                    )}
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-stone-800 text-sm truncate max-w-xs">{order.course_title}</p>
                    <p className="text-[11px] text-stone-500">{order.exam_name}</p>
                  </td>
                  <td className="p-4 text-right font-bold text-stone-900">₹{order.amount}</td>
                  <td className="p-4 text-center">
                    <select
                      value={order.payment_status}
                      onChange={(e) => handleUpdatePayment(order.id, e.target.value as Order["payment_status"])}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getPaymentChip(order.payment_status)}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="failed">Failed</option>
                    </select>
                  </td>
                  <td className="p-4 text-center">
                    <select
                      value={order.delivery_status}
                      onChange={(e) => handleUpdateDelivery(order.id, e.target.value as Order["delivery_status"])}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getDeliveryChip(order.delivery_status)}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  </td>
                  <td className="p-4 text-xs">
                    <div className="font-mono text-stone-700">UTR: {order.utr}</div>
                    <div className="font-mono text-stone-700">{order.order_id}</div>
                    <div className="text-stone-400 text-[10px]">{new Date(order.created_at).toLocaleString("hi-IN")}</div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {order.payment_status === "paid" && order.delivery_status === "pending" && order.delivery_mode === "whatsapp" && order.customer_phone && (
                        <button onClick={() => handleSendWhatsApp(order)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg">
                          WhatsApp
                        </button>
                      )}
                      {order.payment_status === "paid" && order.delivery_status === "pending" && order.delivery_mode === "gmail" && (
                        <button onClick={() => handleSendGmail(order)} className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-lg">
                          Gmail
                        </button>
                      )}
                      <button onClick={() => setExpandedOrder(order.id === expandedOrder ? null : order.id)} className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg">
                        {expandedOrder === order.id ? "Close" : "Details"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile card list */}
      <div className="lg:hidden space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-stone-400 text-sm bg-white border border-stone-200 rounded-2xl">
            {orders.length === 0 ? "No orders yet." : "No orders match your filters."}
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-stone-900 text-sm truncate">{order.customer_name}</p>
                  <p className="text-[11px] text-stone-500 truncate">{order.course_title}</p>
                </div>
                <p className="font-bold text-stone-900 text-base shrink-0">₹{order.amount}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <span className={`px-2.5 py-1 rounded-full font-bold border ${getPaymentChip(order.payment_status)}`}>
                  {order.payment_status === "paid" ? "Paid" : order.payment_status === "failed" ? "Failed" : "Pending Payment"}
                </span>
                <span className={`px-2.5 py-1 rounded-full font-bold border ${getDeliveryChip(order.delivery_status)}`}>
                  {order.delivery_status === "delivered" ? "Delivered" : "Pending Delivery"}
                </span>
                {order.delivery_mode === "whatsapp" ? (
                  <span className="px-2.5 py-1 rounded-full font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                    WhatsApp
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full font-bold border bg-amber-50 text-amber-700 border-amber-200">
                    Gmail
                  </span>
                )}
              </div>
              <div className="text-[11px] text-stone-500 space-y-0.5">
                <p className="font-mono">UTR: {order.utr}</p>
                <p className="font-mono">{order.order_id}</p>
                <p>{new Date(order.created_at).toLocaleString("hi-IN")}</p>
              </div>
              <div className="flex gap-2 pt-2 border-t border-stone-100">
                {order.payment_status === "paid" && order.delivery_status === "pending" && order.delivery_mode === "whatsapp" && order.customer_phone && (
                  <button onClick={() => handleSendWhatsApp(order)} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg">
                    WhatsApp
                  </button>
                )}
                {order.payment_status === "paid" && order.delivery_status === "pending" && order.delivery_mode === "gmail" && (
                  <button onClick={() => handleSendGmail(order)} className="flex-1 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-lg">
                    Gmail
                  </button>
                )}
                <button onClick={() => setExpandedOrder(order.id === expandedOrder ? null : order.id)} className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg">
                  {expandedOrder === order.id ? "Close" : "Details"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {expandedOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setExpandedOrder(null)} />
          <div className="relative bg-white border border-stone-200 rounded-t-3xl sm:rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto z-10 p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-stone-900">Order Details</h3>
              <button onClick={() => setExpandedOrder(null)} className="w-9 h-9 rounded-lg hover:bg-stone-100 text-stone-500 flex items-center justify-center">✕</button>
            </div>
            <OrderDetailCard
              order={orders.find((o) => o.id === expandedOrder)!}
              onClose={() => setExpandedOrder(null)}
              onSendWhatsApp={handleSendWhatsApp}
              onSendGmail={handleSendGmail}
              copyToClipboard={copyToClipboard}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent: "emerald" | "amber" | "stone" }) {
  const accents = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    stone: "bg-stone-100 border-stone-200 text-stone-700",
  };
  return (
    <div className={`bg-white border rounded-2xl p-4 ${accents[accent]}`}>
      <p className="text-[10px] uppercase tracking-wider font-bold text-stone-500">{label}</p>
      <p className="text-xl sm:text-2xl font-black mt-1 text-stone-900">{value}</p>
    </div>
  );
}

function OrderDetailCard({
  order,
  onClose,
  onSendWhatsApp,
  onSendGmail,
  copyToClipboard,
}: {
  order: Order;
  onClose: () => void;
  onSendWhatsApp: (o: Order) => void;
  onSendGmail: (o: Order) => void;
  copyToClipboard: (t: string, l: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
        <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">📦</div>
        <div className="min-w-0">
          <h4 className="font-bold text-stone-900 text-sm truncate">{order.course_title}</h4>
          <p className="text-xs text-stone-500">{order.exam_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DetailItem label="Customer" value={order.customer_name} />
        <DetailItem label="Email" value={order.customer_email} copyable onCopy={() => copyToClipboard(order.customer_email, "Email")} />
        {order.customer_phone && <DetailItem label="Phone" value={order.customer_phone} copyable onCopy={() => copyToClipboard(order.customer_phone!, "Phone")} />}
        <DetailItem label="Delivery Mode" value={order.delivery_mode === "whatsapp" ? "WhatsApp" : "Gmail"} />
        <DetailItem label="Amount" value={`₹${order.amount}`} />
        <DetailItem label="UTR" value={order.utr} copyable onCopy={() => copyToClipboard(order.utr, "UTR")} />
        <DetailItem label="Order ID" value={order.order_id} copyable onCopy={() => copyToClipboard(order.order_id, "Order ID")} />
        <DetailItem label="Date" value={new Date(order.created_at).toLocaleString("hi-IN")} />
      </div>

      <div className="flex gap-2 pt-4 border-t border-stone-200">
        {order.payment_status === "paid" && order.delivery_status === "pending" && order.delivery_mode === "whatsapp" && order.customer_phone && (
          <button onClick={() => { onSendWhatsApp(order); onClose(); }} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm">
            WhatsApp
          </button>
        )}
        {order.payment_status === "paid" && order.delivery_status === "pending" && order.delivery_mode === "gmail" && (
          <button onClick={() => { onSendGmail(order); onClose(); }} className="flex-1 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl text-sm">
            Gmail
          </button>
        )}
        <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 font-semibold text-sm">
          Close
        </button>
      </div>
    </div>
  );
}

function DetailItem({ label, value, copyable, onCopy }: { label: string; value: string; copyable?: boolean; onCopy?: () => void }) {
  return (
    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
      <p className="text-[10px] text-stone-500 uppercase tracking-wider font-bold">{label}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="font-mono text-xs text-stone-900">{value}</span>
        {copyable && onCopy && (
          <button onClick={onCopy} className="text-[10px] bg-stone-200 hover:bg-stone-300 px-2 py-1 rounded font-semibold">
            Copy
          </button>
        )}
      </div>
    </div>
  );
}
