import { NextRequest, NextResponse } from "next/server";
import { getStoreData, setStoreData } from "@/lib/store-data";
import { verifyAdminSession } from "@/lib/admin-auth";

export const revalidate = 60;

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

interface FeaturedExamConfig {
  id: string;
  name: string;
  short_name?: string;
  logo_url?: string;
  board_name?: string;
  category_name?: string;
  priority?: number;
}

interface FeaturedStore {
  featured_exams?: FeaturedExamConfig[];
  new_arrivals?: FeaturedExamConfig[];
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const exam = searchParams.get("exam");
  const slider = searchParams.get("slider");
  const featured = searchParams.get("featured");
  const newArrivals = searchParams.get("new_arrivals");
  const includeInactive = searchParams.get("all") === "true";

  try {
    const customCourses = await getStoreData<any[]>("courses", "data/courses-new.json", []);
    const allMergedCourses: any[] = [...customCourses];

    // Read featured configuration from admin panel
    const featuredConfig = await getStoreData<FeaturedStore>("featured_exams", "data/featured_exams.json", {
      featured_exams: [],
      new_arrivals: [],
    });

    const cacheHeaders = {
      "Cache-Control": includeInactive
        ? "no-store, no-cache, must-revalidate"
        : "public, s-maxage=120, stale-while-revalidate=600",
    };

    if (featured === "true") {
      const configList = Array.isArray(featuredConfig.featured_exams) ? featuredConfig.featured_exams : [];
      const result: any[] = [];
      const usedIds = new Set<string>();

      for (const featExam of configList) {
        const matched = allMergedCourses.find(
          (c) =>
            c.exam_id === featExam.id ||
            c.id === featExam.id ||
            c.slug === featExam.id ||
            (featExam.name && c.title?.toLowerCase().includes(featExam.name.toLowerCase().split(" ")[0]))
        );

        if (matched && !usedIds.has(matched.id)) {
          result.push({
            ...matched,
            is_active: true,
            is_featured: true,
            featured_priority: featExam.priority || result.length + 1,
          });
          usedIds.add(matched.id);
        }
      }

      for (const c of allMergedCourses) {
        if ((includeInactive || c.is_active) && c.is_featured && !usedIds.has(c.id)) {
          result.push(c);
          usedIds.add(c.id);
        }
      }

      if (result.length === 0) {
        return NextResponse.json(allMergedCourses.filter((c) => c.is_active).slice(0, 4), { headers: cacheHeaders });
      }

      result.sort((a, b) => (a.featured_priority || 99) - (b.featured_priority || 99));
      return NextResponse.json(result, { headers: cacheHeaders });
    }

    if (newArrivals === "true") {
      const configList = Array.isArray(featuredConfig.new_arrivals) ? featuredConfig.new_arrivals : [];
      const result: any[] = [];
      const usedIds = new Set<string>();

      for (const arrExam of configList) {
        const matched = allMergedCourses.find(
          (c) =>
            c.exam_id === arrExam.id ||
            c.id === arrExam.id ||
            c.slug === arrExam.id ||
            (arrExam.name && c.title?.toLowerCase().includes(arrExam.name.toLowerCase().split(" ")[0]))
        );

        if (matched && !usedIds.has(matched.id)) {
          result.push({
            ...matched,
            is_active: true,
            is_new_arrival: true,
            new_arrival_priority: arrExam.priority || result.length + 1,
          });
          usedIds.add(matched.id);
        }
      }

      for (const c of allMergedCourses) {
        if ((includeInactive || c.is_active) && c.is_new_arrival && !usedIds.has(c.id)) {
          result.push(c);
          usedIds.add(c.id);
        }
      }

      if (result.length === 0) {
        return NextResponse.json(allMergedCourses.filter((c) => c.is_active).slice(0, 4), { headers: cacheHeaders });
      }

      result.sort((a, b) => (a.new_arrival_priority || 99) - (b.new_arrival_priority || 99));
      return NextResponse.json(result, { headers: cacheHeaders });
    }

    if (slider === "true") {
      let sliderList = allMergedCourses.filter((c) => (includeInactive || c.is_active) && c.show_in_slider);
      if (sliderList.length === 0) {
        sliderList = allMergedCourses.filter((c) => c.is_active).slice(0, 4);
      }
      return NextResponse.json(sliderList, { headers: cacheHeaders });
    }

    if (exam) {
      const filtered = allMergedCourses.filter(
        (c) => (includeInactive || c.is_active) && (c.exam_id === exam || c.id === exam || c.slug === exam)
      );
      return NextResponse.json(filtered, { headers: cacheHeaders });
    }

    let finalCourses = allMergedCourses;
    if (!includeInactive) {
      finalCourses = finalCourses.filter((c) => c.is_active);
    }

    return NextResponse.json(finalCourses.sort((a, b) => (a.priority || 0) - (b.priority || 0)), { headers: cacheHeaders });
  } catch {
    return NextResponse.json([]);
  }
}

export async function PUT(req: NextRequest) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const updatedCourses = Array.isArray(body) ? body : body.courses;
    if (Array.isArray(updatedCourses)) {
      await setStoreData("courses", "data/courses-new.json", updatedCourses);
      return NextResponse.json({ success: true, count: updatedCourses.length });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update courses" }, { status: 500 });
  }

  return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
}
