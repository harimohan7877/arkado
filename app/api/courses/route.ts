import { NextResponse } from "next/server";
import { getStoreData } from "@/lib/store-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const exam = searchParams.get("exam");
  const slider = searchParams.get("slider");

  try {
    let courses = await getStoreData<any[]>("courses", "data/courses-new.json", []);
    
    if (slider === "true") {
      courses = courses.filter((c: any) => c.is_active && c.show_in_slider);
    } else if (exam) {
      courses = courses.filter((c: any) => c.is_active && c.exam_id === exam);
    } else {
      courses = courses.filter((c: any) => c.is_active);
    }
    
    return NextResponse.json(courses.sort((a: any, b: any) => a.priority - b.priority));
  } catch {
    return NextResponse.json([]);
  }
}