import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getStoreData } from "@/lib/store-data";

interface CategoryRecord {
  id: string;
  is_active?: boolean;
  boards?: Array<{
    is_active?: boolean;
    exams?: Array<{ is_active?: boolean }>;
  }>;
}

interface OrderRecord {
  amount?: unknown;
  payment_status?: unknown;
  delivery_status?: unknown;
}

interface CourseRecord {
  is_active?: boolean;
}

function countActiveExams(categories: CategoryRecord[]): number {
  return categories.reduce((total, category) => {
    if (!category.is_active) return total;
    return total + (category.boards || []).reduce((boardTotal, board) => {
      if (!board.is_active) return boardTotal;
      return boardTotal + (board.exams || []).filter((exam) => exam.is_active).length;
    }, 0);
  }, 0);
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [orders, courses, categories] = await Promise.all([
    getStoreData<OrderRecord[]>("orders", "data/orders.json", []),
    getStoreData<CourseRecord[]>("courses", "data/courses-new.json", []),
    getStoreData<CategoryRecord[]>("categories", "data/categories.json", []),
  ]);

  const stats = {
    totalUsers: 0,
    totalPaidUsers: 0,
    totalGuests: 0,
    totalChats: 0,
    totalOrders: orders.length,
    totalRevenue: orders
      .filter((order) => order.payment_status === "paid")
      .reduce((sum, order) => sum + (Number(order.amount) || 0), 0),
    pendingDelivery: orders.filter(
      (order) => order.payment_status === "paid" && order.delivery_status === "pending",
    ).length,
    activeCourses: courses.filter((course) => course.is_active).length,
    activeExams: countActiveExams(categories),
    activeCategories: categories.filter((category) => category.is_active).length,
  };

  return NextResponse.json(stats);
}
