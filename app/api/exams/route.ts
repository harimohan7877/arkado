import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  try {
    const data = await readFile(join(process.cwd(), "data/exams-new.json"), "utf-8");
    let exams = JSON.parse(data);
    
    if (category) {
      exams = exams.filter((e: any) => e.category_id === category && e.is_active);
    } else {
      exams = exams.filter((e: any) => e.is_active);
    }
    
    return NextResponse.json(exams.sort((a: any, b: any) => a.priority - b.priority));
  } catch {
    return NextResponse.json([]);
  }
}