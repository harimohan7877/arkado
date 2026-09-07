"use client";

import { useState, useEffect } from "react";

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
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSendWhatsApp = (order: Order) => {
    const msg = `नमस्ते ${order.customer_name}!

आपने Arkado से "${order.course_title}" के लिए ₹${order.amount} का पेमेंट किया है।

Order ID: ${order.order_id}
UTR No: ${order.utr}

कृपया नोट्स की डाउनलोड लिंक यहाँ भेजें।`;

    const url = `https://wa.me/${order.customer_phone || "917852004401"}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");

    // Mark as delivered
    handleUpdateDelivery(order.id, "delivered");
    setMessage({ type: "success", text: "WhatsApp opened with pre-filled message!" });
  };

  const handleSendGmail = (order: Order) => {
    const subject = `Arkado Order ${order.order_id} - ${order.course_title}`;
    const body = `Hello ${order.customer_name},

Thank you for purchasing "${order.course_title}" from Arkado for ₹${order.amount}.

Order ID: ${order.order_id}
UTR No: ${order.utr}
Delivery Mode: ${order.delivery_mode}

Your notes access link will be sent shortly.

For support: support@arkado.in

— Team Arkado`;

    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(order.customer_email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank", "noopener,noreferrer");

    handleUpdateDelivery(order.id, "delivered");
    setMessage({ type: "success", text: "Gmail opened with pre-filled email!" });
  };

  const handleUpdateDelivery = async (id: string, status: "pending" | "delivered") => {
    try {
      await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ delivery_status: status }),
      });
      setOrders(orders.map(o => o.id === id ? { ...o, delivery_status: status } : o));
    } catch (err) { console.error(err); }
  };

  const handleUpdatePayment = async (id: string, status: "pending" | "paid" | "failed") => {
    try {
      await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ payment_status: status }),
      });
      setOrders(orders.map(o => o.id === id ? { ...o, payment_status: status } : o));
    } catch (err) { console.error(err); }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: "success", text: `${label} copied to clipboard!` });
  };

  const filteredOrders = orders
    .filter(o => {
      if (filterStatus !== "all") {
        if (filterStatus === "delivered") return o.delivery_status === "delivered";
        if (filterStatus === "paid") return o.payment_status === "paid" && o.delivery_status === "pending";
        return o.payment_status === filterStatus;
      }
      return true;
    })
    .filter(o =>
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_email.toLowerCase().includes(search.toLowerCase()) ||
      o.order_id.toLowerCase().includes(search.toLowerCase()) ||
      o.utr.includes(search) ||
      o.course_title.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const stats = {
    total: orders.length,
    paid: orders.filter(o => o.payment_status === "paid").length,
    pendingDelivery: orders.filter(o => o.payment_status === "paid" && o.delivery_status === "pending").length,
    revenue: orders.filter(o => o.payment_status === "paid").reduce((sum, o) => sum + o.amount, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Orders Management</h2>
          <p className="text-neutral-400 text-sm">Track payments and deliver course access via WhatsApp or Gmail.</p>
        </div>
        <button onClick={fetchOrders} disabled={loading} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm font-medium rounded-xl transition disabled:opacity-50">
          {loading ? "Refreshing..." : "🔄 Refresh"}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Orders" value={stats.total} icon="🛒" color="blue" />
        <StatCard label="Paid Orders" value={stats.paid} icon="💳" color="emerald" />
        <StatCard label="Pending Delivery" value={stats.pendingDelivery} icon="📦" color="amber" />
        <StatCard label="Revenue" value={`₹${stats.revenue.toLocaleString()}`} icon="💰" color="purple" />
      </div>

      {message && (
        <div className={`p-4 rounded-xl border ${message.type === "success" ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-400" : "bg-red-950/30 border-red-500/30 text-red-400"}`}>
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-4">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[250px]">
            <input
              type="text"
              placeholder="Search: Name, Email, Order ID, UTR, Course..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none"
            />
            <span className="absolute left-3 top-2.5 text-neutral-500">🔍</span>
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)} className="px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none">
            <option value="all">All Orders</option>
            <option value="pending">Pending Payment</option>
            <option value="paid">Paid - Pending Delivery</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">
            {orders.length === 0 ? "No orders yet." : "No orders match your filters."}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 text-xs uppercase tracking-wider">
                <th className="p-4 text-left">Customer</th>
                <th className="p-4 text-left">Course</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4 text-center">Payment</th>
                <th className="p-4 text-center">Delivery</th>
                <th className="p-4 text-left">UTR / Order ID</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-neutral-950/50">
                  <td className="p-4">
                    <p className="font-semibold text-white">{order.customer_name}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400">
                      <span className="truncate max-w-[200px]">{order.customer_email}</span>
                      <button onClick={() => copyToClipboard(order.customer_email, "Email")} className="text-[10px] bg-neutral-800 hover:bg-neutral-700 px-2 py-1 rounded cursor-pointer">Copy</button>
                      {order.customer_phone && (
                        <>
                          <span className="truncate max-w-[150px]">{order.customer_phone}</span>
                          <button onClick={() => copyToClipboard(order.customer_phone!, "Phone")} className="text-[10px] bg-neutral-800 hover:bg-neutral-700 px-2 py-1 rounded cursor-pointer">Copy</button>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-neutral-200 truncate max-w-xs">{order.course_title}</p>
                    <p className="text-xs text-neutral-500">{order.exam_name}</p>
                  </td>
                  <td className="p-4 text-right font-bold text-white">₹{order.amount}</td>
                  <td className="p-4 text-center">
                    <select value={order.payment_status} onChange={e => handleUpdatePayment(order.id, e.target.value as Order["payment_status"])} className={`px-3 py-1.5 rounded-full text-xs font-bold border text-center w-full ${order.payment_status === "paid" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : order.payment_status === "failed" ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-amber-500/20 text-amber-400 border-amber-500/30"}`}>
                      <option value="pending">⏳ Pending</option>
                      <option value="paid">💳 Paid</option>
                      <option value="failed">❌ Failed</option>
                    </select>
                  </td>
                  <td className="p-4 text-center">
                    <select value={order.delivery_status} onChange={e => handleUpdateDelivery(order.id, e.target.value as Order["delivery_status"])} className={`px-3 py-1.5 rounded-full text-xs font-bold border text-center w-full ${order.delivery_status === "delivered" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border-amber-500/30"}`}>
                      <option value="pending">📬 Pending</option>
                      <option value="delivered">✅ Delivered</option>
                    </select>
                  </td>
                  <td className="p-4 text-xs text-neutral-400">
                    <div>UTR: <span className="font-mono text-white">{order.utr}</span></div>
                    <div>Order: <span className="font-mono text-white">{order.order_id}</span></div>
                    <div>{new Date(order.created_at).toLocaleString("hi-IN")}</div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {order.payment_status === "paid" && order.delivery_status === "pending" && (
                        <>
                          {order.delivery_mode === "whatsapp" && order.customer_phone && (
                            <button onClick={() => handleSendWhatsApp(order)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5">
                              💬 WhatsApp
                            </button>
                          )}
                          {order.delivery_mode === "gmail" && (
                            <button onClick={() => handleSendGmail(order)} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5">
                              ✉️ Gmail
                            </button>
                          )}
                          {order.delivery_mode === "whatsapp" && !order.customer_phone && (
                            <span className="px-3 py-1.5 bg-neutral-800 text-neutral-500 text-xs rounded-lg">No phone</span>
                          )}
                        </>
                      )}
                      <button onClick={() => setExpandedOrder(order.id === expandedOrder ? null : order.id)} className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium rounded-lg transition">
                        {expandedOrder === order.id ? "▲" : "▼"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Expanded Order Details */}
      {expandedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setExpandedOrder(null)} />
          <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Order Details</h3>
              <button onClick={() => setExpandedOrder(null)} className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 flex items-center justify-center">✕</button>
            </div>
            <OrderDetailCard order={orders.find(o => o.id === expandedOrder)!} onClose={() => setExpandedOrder(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  const colors = {
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
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

function OrderDetailCard({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-neutral-950 rounded-xl border border-neutral-800">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-2xl">🛒</div>
        <div>
          <h4 className="font-bold text-white">{order.course_title}</h4>
          <p className="text-sm text-neutral-400">{order.exam_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <DetailItem label="Customer" value={order.customer_name} />
        <DetailItem label="Email" value={order.customer_email} copyable={true} />
        {order.customer_phone && <DetailItem label="Phone" value={order.customer_phone} copyable={true} />}
        <DetailItem label="Delivery Mode" value={order.delivery_mode === "whatsapp" ? "💬 WhatsApp" : "✉️ Gmail"} />
        <DetailItem label="Amount" value={`₹${order.amount}`} />
        <DetailItem label="UTR" value={order.utr} copyable={true} />
        <DetailItem label="Order ID" value={order.order_id} copyable={true} />
        <DetailItem label="Date" value={new Date(order.created_at).toLocaleString("hi-IN")} />
        <DetailItem label="Payment" value={order.payment_status === "paid" ? "💳 Paid" : order.payment_status === "failed" ? "❌ Failed" : "⏳ Pending"} />
        <DetailItem label="Delivery" value={order.delivery_status === "delivered" ? "✅ Delivered" : "📬 Pending"} />
      </div>

      <div className="flex gap-3 pt-4 border-t border-neutral-800">
        {order.payment_status === "paid" && order.delivery_status === "pending" && (
          <>
            {order.delivery_mode === "whatsapp" && order.customer_phone && (
              <button onClick={() => { window.open(`https://wa.me/${order.customer_phone}?text=${encodeURIComponent(`नमस्ते ${order.customer_name}!\n\nआपने Arkado से "${order.course_title}" के लिए ₹${order.amount} का पेमेंट किया है।\n\nOrder ID: ${order.order_id}\nUTR No: ${order.utr}\n\nकृपया नोट्स की डाउनलोड लिंक यहाँ भेजें।`)}`, "_blank"); onClose(); }} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2">
                💬 Send via WhatsApp
              </button>
            )}
            {order.delivery_mode === "gmail" && (
              <button onClick={() => { window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(order.customer_email)}&su=${encodeURIComponent(`Arkado Order ${order.order_id} - Notes Access`)}&body=${encodeURIComponent(`Hello ${order.customer_name},\n\nThank you for purchasing "${order.course_title}" from Arkado for ₹${order.amount}.\n\nOrder ID: ${order.order_id}\nUTR No: ${order.utr}\n\nYour notes access link will be sent shortly.\n\n— Team Arkado`)}`, "_blank"); onClose(); }} className="flex-1 py-3 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl transition flex items-center justify-center gap-2">
                ✉️ Send via Gmail
              </button>
            )}
          </>
        )}
        <button onClick={onClose} className="px-5 py-3 rounded-xl border border-neutral-700 text-neutral-300 hover:bg-neutral-800 font-medium transition">Close</button>
      </div>
    </div>
  );
}

function DetailItem({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  return (
    <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
      <p className="text-xs text-neutral-500 uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="font-mono text-sm text-white break-all">{value}</span>
        {copyable && <button onClick={() => navigator.clipboard.writeText(value)} className="text-[10px] bg-neutral-800 hover:bg-neutral-700 px-2 py-1 rounded cursor-pointer">Copy</button>}
      </div>
    </div>
  );
}