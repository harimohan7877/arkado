import { NextRequest, NextResponse } from "next/server";
import { getStoreData, setStoreData } from "@/lib/store-data";
import { verifyAdminSession } from "@/lib/admin-auth";
import {
  buildFeaturedCourses,
  buildNewArrivalCourses,
  buildSliderCourses,
  sanitizePublicCourses,
} from "@/lib/home-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface CategoryRecord {
  id: string;
  name: string;
  boards?: {
    name: string;
    short_name?: string;
    exams?: {
      id: string;
      name: string;
      short_name?: string;
      logo_url?: string;
      is_active?: boolean;
      priority?: number;
      eligibility?: string;
      exam_pattern?: string;
      viral_subtext?: string;
      notes_link?: string;
    }[];
  }[];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const exam = searchParams.get("exam");
  const slider = searchParams.get("slider");
  const featured = searchParams.get("featured");
  const newArrivals = searchParams.get("new_arrivals");
  const includeInactive = searchParams.get("all") === "true";
  const isAdmin = await verifyAdminSession(req);

  try {
    const customCourses = await getStoreData<any[]>("courses", "data/courses.json", []);
    const allMergedCourses: any[] = [...customCourses];

    // Read featured configuration from admin panel
    const featuredConfig = await getStoreData<{ featured_exams?: any[]; new_arrivals?: any[] }>("featured_exams", "data/featured_exams.json", {
      featured_exams: [],
      new_arrivals: [],
    });

    const cacheHeaders = {
      "Cache-Control": includeInactive
        ? "no-store, no-cache, must-revalidate"
        : "public, s-maxage=10, stale-while-revalidate=59",
    };

    if (featured === "true") {
      return NextResponse.json(
        buildFeaturedCourses(allMergedCourses, featuredConfig, includeInactive, isAdmin),
        { headers: cacheHeaders }
      );
    }

    if (newArrivals === "true") {
      return NextResponse.json(
        buildNewArrivalCourses(allMergedCourses, featuredConfig, includeInactive, isAdmin),
        { headers: cacheHeaders }
      );
    }

    if (slider === "true") {
      return NextResponse.json(
        buildSliderCourses(allMergedCourses, includeInactive, isAdmin),
        { headers: cacheHeaders }
      );
    }

    if (exam) {
      const filtered = allMergedCourses.filter(
        (c) => (includeInactive || c.is_active) && (c.exam_id === exam || c.id === exam || c.slug === exam)
      );
      return NextResponse.json(sanitizePublicCourses(filtered, isAdmin), { headers: cacheHeaders });
    }

    let finalCourses = allMergedCourses;
    if (!includeInactive) {
      finalCourses = finalCourses.filter((c) => c.is_active);
    }

    return NextResponse.json(sanitizePublicCourses(finalCourses.sort((a, b) => (a.priority || 0) - (b.priority || 0)), isAdmin), { headers: cacheHeaders });
  } catch {
    return NextResponse.json([]);
  }
}

export async function PUT(req: NextRequest) {
  if (!(await verifyAdminSession(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const updatedCourses = Array.isArray(body) ? body : body.courses;
    if (Array.isArray(updatedCourses)) {
      await setStoreData("courses", "data/courses.json", updatedCourses);
      return NextResponse.json({ success: true, count: updatedCourses.length });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update courses" }, { status: 500 });
  }

  return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
}
