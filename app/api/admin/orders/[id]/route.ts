import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { verifyAdminSession } from "@/lib/admin-auth";

const FILE = join(process.cwd(), "data/orders.json");

function readOrders() {
  return readFile(FILE, "utf-8").then(JSON.parse).catch(() => []);
}

function writeOrders(data: unknown[]) {
  return writeFile(FILE, JSON.stringify(data, null, 2));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const orders = await readOrders();
  const idx = orders.findIndex((o: Record<string, unknown>) => o.id === id || o.order_id === id);
  if (idx === -1) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const updates = { ...orders[idx], ...body, updated_at: new Date().toISOString() };
  orders[idx] = updates;
  await writeOrders(orders);
  return NextResponse.json(updates);
}
