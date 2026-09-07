import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { verifyAdminSession } from "@/lib/admin-auth";

async function readJSON(file: string) {
  try {
    return JSON.parse(await readFile(join(process.cwd(), file), "utf-8"));
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [orders, courses, exams, categories] = await Promise.all([
    readJSON("data/orders.json"),
    readJSON("data/courses-new.json"),
    readJSON("data/exams-new.json"),
    readJSON("data/categories.json"),
  ]);

  const stats = {
    totalOrders: orders.length,
    totalRevenue: orders.filter((o: Record<string, unknown>) => o.payment_status === "paid").reduce((sum: number, o: Record<string, unknown>) => sum + (Number(o.amount) || 0), 0),
    pendingDelivery: orders.filter((o: Record<string, unknown>) => o.payment_status === "paid" && o.delivery_status === "pending").length,
    activeCourses: courses.filter((c: Record<string, unknown>) => c.is_active).length,
    activeExams: exams.filter((e: Record<string, unknown>) => e.is_active).length,
    activeCategories: categories.filter((c: Record<string, unknown>) => c.is_active).length,
  };

  return NextResponse.json(stats);
}
