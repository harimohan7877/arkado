import { NextResponse } from "next/server";
import { getStoreData, setStoreData } from "@/lib/store-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function readOrders() {
  return getStoreData<any[]>("orders", "data/orders.json", []);
}

async function writeOrders(orders: unknown[]) {
  return setStoreData("orders", "data/orders.json", orders);
}

export async function GET() {
  const orders = await readOrders();
  orders.sort(
    (a: { created_at: string }, b: { created_at: string }) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return NextResponse.json({ success: true, orders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      delivery_mode,
      phone,
      email,
      course_id,
      course_title,
      amount,
      drive_url,
    } = body;

    if (!name || !course_id) {
      return NextResponse.json(
        { success: false, error: "Name and course are required." },
        { status: 400 }
      );
    }

    if (!email && delivery_mode === "gmail") {
      return NextResponse.json(
        { success: false, error: "Email is required for Gmail delivery." },
        { status: 400 }
      );
    }

    if (!phone && delivery_mode === "whatsapp") {
      return NextResponse.json(
        { success: false, error: "WhatsApp number is required." },
        { status: 400 }
      );
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const order_id = `ARK-${new Date().getFullYear()}-${randomSuffix}`;

    const newOrder = {
      order_id,
      name: name.trim(),
      delivery_mode: delivery_mode || "whatsapp",
      phone: phone?.trim() || "",
      email: email?.trim() || "",
      course_id,
      course_title,
      amount: Number(amount) || 199,
      drive_url: drive_url || "https://drive.google.com",
      status: "pending",
      payment_status: "unverified",
      created_at: new Date().toISOString(),
    };

    const orders = await readOrders();
    orders.unshift(newOrder);
    await writeOrders(orders);

    // Notify admin via email (fire-and-forget)
    fetch(new URL(req.url).origin + "/api/notify-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newOrder),
    }).catch((err) => console.error("Failed to notify admin:", err));

    return NextResponse.json({ success: true, order: newOrder });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { order_id, status } = body;

    if (!order_id || !status) {
      return NextResponse.json(
        { success: false, error: "Missing order_id or status" },
        { status: 400 }
      );
    }

    const orders = await readOrders();
    const orderIndex = orders.findIndex(
      (o: { order_id: string }) => o.order_id === order_id
    );

    if (orderIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    orders[orderIndex].status = status;
    orders[orderIndex].updated_at = new Date().toISOString();
    await writeOrders(orders);

    return NextResponse.json({ success: true, order: orders[orderIndex] });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const order_id = searchParams.get("order_id");

    if (!order_id) {
      return NextResponse.json(
        { success: false, error: "order_id is required" },
        { status: 400 }
      );
    }

    let orders = await readOrders();
    orders = orders.filter((o: { order_id: string }) => o.order_id !== order_id);
    await writeOrders(orders);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
