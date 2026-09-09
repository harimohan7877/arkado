import { NextRequest, NextResponse } from "next/server";
import { getStoreData, setStoreData } from "@/lib/store-data";
import { verifyAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const exam = searchParams.get("exam");
  const slider = searchParams.get("slider");
  const featured = searchParams.get("featured");
  const newArrivals = searchParams.get("new_arrivals");
  const includeInactive = searchParams.get("all") === "true";

  try {
    let courses = await getStoreData<any[]>("courses", "data/courses-new.json", []);

    if (slider === "true") {
      courses = courses.filter((c: any) => (includeInactive || c.is_active) && c.show_in_slider);
    } else if (featured === "true") {
      courses = courses.filter((c: any) => (includeInactive || c.is_active) && c.is_featured);
      courses.sort((a: any, b: any) => (a.featured_priority || 0) - (b.featured_priority || 0));
      return NextResponse.json(courses);
    } else if (newArrivals === "true") {
      courses = courses.filter((c: any) => (includeInactive || c.is_active) && c.is_new_arrival);
      courses.sort((a: any, b: any) => (a.new_arrival_priority || 0) - (b.new_arrival_priority || 0));
      return NextResponse.json(courses);
    } else if (exam) {
      courses = courses.filter((c: any) => (includeInactive || c.is_active) && c.exam_id === exam);
    } else {
      if (!includeInactive) {
        courses = courses.filter((c: any) => c.is_active);
      }
    }

    return NextResponse.json(courses.sort((a: any, b: any) => (a.priority || 0) - (b.priority || 0)));
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
      await setStoreData("courses", "data/courses.json", updatedCourses);
      return NextResponse.json({ success: true, count: updatedCourses.length });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update courses" }, { status: 500 });
  }

  return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
}
