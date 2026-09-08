import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getStoreData } from "@/lib/store-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [orders, courses, exams, categories] = await Promise.all([
    getStoreData<any[]>("orders", "data/orders.json", []),
    getStoreData<any[]>("courses", "data/courses-new.json", []),
    getStoreData<any[]>("exams", "data/exams-new.json", []),
    getStoreData<any[]>("categories", "data/categories.json", []),
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
