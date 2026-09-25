import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import productsMock from "@/data/products_mock.json";
import { verifyAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const isAdmin = verifyAdminSession(req);

    // 1. Fetch products from Supabase marketplace_products table
    const { data: dbProducts, error: prodError } = await supabaseAdmin
      .from('marketplace_products')
      .select('*, group:marketplace_groups(name)')
      .eq('is_active', true);

    if (prodError) {
      console.warn("Could not fetch products from Supabase (using mock fallback):", prodError.message);
      // Fallback to mock data if table doesn't exist or connection fails
      return NextResponse.json({ products: productsMock, fromDb: false });
    }

    if (!dbProducts || dbProducts.length === 0) {
      // If table is empty, fallback to mock data
      return NextResponse.json({ products: productsMock, fromDb: false });
    }

    // 2. Map db products to frontend Product interface (camelCase mapping)
    // Only verified admin receives drive_url
    const products = dbProducts.map(p => ({
      id: p.id,
      title: p.title,
      examName: p.exam_name,
      groupName: p.group?.name || 'Other Exams',
      type: p.type,
      price: Number(p.price),
      salePrice: Number(p.sale_price),
      pages: p.pages || undefined,
      language: p.language,
      drive_url: isAdmin ? (p.file_url || undefined) : undefined,
    }));

    return NextResponse.json({ products, fromDb: true });

  } catch (error: unknown) {
    console.error("Error in products API route (using mock fallback):", error);
    // Graceful fallback to mock data
    return NextResponse.json({ products: productsMock, fromDb: false });
  }
}
