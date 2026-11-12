import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getStoreData } from "@/lib/store-data";
import { supabaseAdmin, buildOrderQueryFilter } from "@/lib/supabase";
import { canTransitionOrderStatus } from "@/lib/payment-gateway";
import { deliverOrder } from "@/lib/deliver-order";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function readOrders() {
  return getStoreData<any[]>("orders", "data/orders.json", []);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    let body: { customDriveUrl?: string; resend?: boolean } = {};
    try {
      body = await req.json();
    } catch {}
    const isResend = body.resend === true;

    const orders = await readOrders();
    let orderIndex = orders.findIndex(
      (o: Record<string, unknown>) => o.id === id || o.order_id === id
    );

    let order = orderIndex !== -1 ? orders[orderIndex] : null;

    // If not found in JSON, search Supabase marketplace_orders
    if (!order) {
      const filter = buildOrderQueryFilter(id);
      const { data: dbOrder } = await supabaseAdmin
        .from("marketplace_orders")
        .select("*")
        .or(filter)
        .limit(1)
        .maybeSingle();

      if (dbOrder) {
        order = {
          id: dbOrder.razorpay_order_id || dbOrder.id,
          order_id: dbOrder.razorpay_order_id || dbOrder.id,
          customer_name: dbOrder.customer_name || "Student",
          name: dbOrder.customer_name || "Student",
          customer_email: dbOrder.customer_email || "",
          email: dbOrder.customer_email || "",
          customer_phone: dbOrder.customer_phone || "",
          phone: dbOrder.customer_phone || "",
          amount: Number(dbOrder.amount) || 0,
          course_id: dbOrder.product_id || "",
          course_title: dbOrder.course_title || "Course Bundle",
          drive_url: dbOrder.drive_url || "",
          // Validated line items (per-kit Drive URLs). May be absent for
          // orders created before the items-column migration ran — the
          // catalog fallback below covers those.
          items: Array.isArray(dbOrder.items) ? dbOrder.items : [],
          delivery_mode: dbOrder.delivery_mode || "both",
          payment_status: dbOrder.payment_status || "pending",
          delivery_status: dbOrder.delivery_status || "pending",
          created_at: dbOrder.created_at || new Date().toISOString(),
        };
        orders.unshift(order);
        orderIndex = 0;
      }
    }

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Phase 3: state guard — only an order that can still move toward
    // paid/delivered may be approved. Re-approving a delivered order would
    // resend the Drive-link email; approving a failed/cancelled/refunded
    // order would bypass the state machine.
    // Resend mode skips the guard (re-sending is not a state transition),
    // but still requires the order to be paid — never email Drive links
    // for unpaid or failed orders.
    {
      const payStatus = (order.payment_status || "pending").toLowerCase();
      const delStatus = (order.delivery_status || order.status || "pending").toLowerCase();
      if (isResend) {
        if (payStatus !== "paid") {
          return NextResponse.json(
            {
              success: false,
              error: `Cannot re-send email: order is not paid (payment: ${order.payment_status || "pending"}).`,
            },
            { status: 409 }
          );
        }
      } else {
        const canPay = payStatus === "paid" || canTransitionOrderStatus(payStatus, "paid");
        const canDeliver = canTransitionOrderStatus(delStatus, "delivered");
        if (!canPay || !canDeliver) {
          return NextResponse.json(
            {
              success: false,
              error: `Order cannot be approved from its current state (payment: ${order.payment_status || "pending"}, delivery: ${order.delivery_status || "pending"}).`,
            },
            { status: 409 }
          );
        }
      }
    }

    const recipientEmail = (order.customer_email || order.email || "").trim();
    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      return NextResponse.json(
        { error: "Order does not have a valid customer email address." },
        { status: 400 }
      );
    }

    // Delivery (email + store updates) now lives in lib/deliver-order.ts —
    // the same function serves manual approval here and the automatic
    // Razorpay flow (verify-marketplace + webhook), so the email is
    // identical everywhere. Only ONE copy of the delivery email exists.
    const delivery = await deliverOrder(order, {
      customDriveUrl: body.customDriveUrl,
      resend: isResend,
    });

    if (!delivery.ok) {
      return NextResponse.json(
        { success: false, error: delivery.error },
        { status: delivery.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: isResend
        ? `Course notes re-sent to ${recipientEmail}`
        : `Course notes successfully sent to ${recipientEmail}`,
      messageId: delivery.messageId,
      order: delivery.order,
    });
  } catch (err: unknown) {
    console.error("[approve-route] Approval error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to approve and send email",
      },
      { status: 500 }
    );
  }
}
