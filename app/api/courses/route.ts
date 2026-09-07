import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const exam = searchParams.get("exam");
  const slider = searchParams.get("slider");

  try {
    const data = await readFile(join(process.cwd(), "data/courses-new.json"), "utf-8");
    let courses = JSON.parse(data);
    
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