import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getStoreData, setStoreData, saveUploadedFile } from "@/lib/store-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_FILE_SIZE = 500 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface CategoryRecord {
  id: string;
  name: string;
  is_active?: boolean;
  boards?: BoardRecord[];
}

interface BoardRecord {
  board_id?: string;
  id?: string;
  name: string;
  short_name?: string;
  is_active?: boolean;
  exams?: ExamRecord[];
}

interface ExamRecord {
  id: string;
  name: string;
  short_name?: string;
  logo_url?: string;
  is_active?: boolean;
  priority?: number;
  eligibility?: string;
  exam_pattern?: string;
}

interface AdminExam {
  id: string;
  name: string;
  short_name: string;
  logo_url: string;
  category_id: string;
  category_name: string;
  board: string;
  board_id: string;
  is_active: boolean;
  priority: number;
  eligibility?: string;
  exam_pattern?: string;
}

function flattenExams(categories: CategoryRecord[]): AdminExam[] {
  const exams: AdminExam[] = [];
  for (const category of categories) {
    for (const board of category.boards || []) {
      for (const exam of board.exams || []) {
        exams.push({
          id: exam.id,
          name: exam.name,
          short_name: exam.short_name || exam.name,
          logo_url: exam.logo_url || "",
          category_id: category.id,
          category_name: category.name,
          board: board.short_name || board.name,
          board_id: board.board_id || board.id || "",
          is_active: exam.is_active === true,
          priority: exam.priority || 0,
          eligibility: exam.eligibility,
          exam_pattern: exam.exam_pattern,
        });
      }
    }
  }
  return exams.sort((a, b) => a.priority - b.priority);
}

function readExams() {
  return getStoreData<ExamRecord[]>("exams", "data/exams-new.json", []);
}

function writeExams(data: ExamRecord[]) {
  return setStoreData("exams", "data/exams-new.json", data);
}

export async function GET(req: NextRequest) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const categories = await getStoreData<CategoryRecord[]>("categories", "data/categories.json", []);
  return NextResponse.json(flattenExams(categories));
}

export async function POST(req: NextRequest) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const exams = await readExams();

  const newExam = {
    id: formData.get("name")?.toString().toLowerCase().replace(/\s+/g, "-") || `exam-${Date.now()}`,
    category_id: formData.get("category_id")?.toString() || "",
    name: formData.get("name")?.toString() || "",
    short_name: formData.get("short_name")?.toString() || "",
    board: formData.get("board")?.toString() || "",
    description: formData.get("description")?.toString() || "",
    status: formData.get("status")?.toString() || "expected",
    form_start: formData.get("form_start")?.toString() || undefined,
    last_date: formData.get("last_date")?.toString() || undefined,
    expected_notification: formData.get("expected_notification")?.toString() || undefined,
    total_posts: formData.get("total_posts") ? Number(formData.get("total_posts")) : undefined,
    priority: Number(formData.get("priority") || exams.length + 1),
    is_active: formData.get("is_active") === "true",
    course_ids: JSON.parse(formData.get("course_ids")?.toString() || "[]"),
    logo_url: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const logo = formData.get("logo") as File | null;
  if (logo && logo.size > 0) {
    if (logo.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Max 500KB allowed." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(logo.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, WebP, GIF allowed." }, { status: 400 });
    }
    const safeId = newExam.id.replace(/[^a-z0-9-]/gi, "");
    newExam.logo_url = await saveUploadedFile(logo, "logos", safeId);
  }

  exams.push(newExam);
  await writeExams(exams);

  // Sync to categories.json so it reflects in the whole platform
  try {
    const categories = await getStoreData<any[]>("categories", "data/categories.json", []);
    let targetCat = categories.find((c: any) => c.id === newExam.category_id || c.name?.toLowerCase().includes(newExam.category_id.toLowerCase()));
    if (!targetCat && categories.length > 0) targetCat = categories[0];
    if (targetCat) {
      if (!targetCat.boards) targetCat.boards = [];
      let targetBoard = targetCat.boards.find((b: any) => 
        b.short_name?.toLowerCase() === newExam.board.toLowerCase() || 
        b.name?.toLowerCase() === newExam.board.toLowerCase() ||
        b.board_id?.toLowerCase() === newExam.board.toLowerCase()
      );
      if (!targetBoard) {
        targetBoard = {
          board_id: newExam.board.toLowerCase().replace(/\s+/g, "-") || "general",
          name: newExam.board || "General Board",
          short_name: newExam.board || "Board",
          icon: "🏛️",
          is_active: true,
          exams: [],
        };
        targetCat.boards.push(targetBoard);
      }
      if (!targetBoard.exams) targetBoard.exams = [];
      targetBoard.exams.push({
        id: newExam.id,
        name: newExam.name,
        short_name: newExam.short_name || newExam.name,
        logo_url: newExam.logo_url || "",
        is_active: newExam.is_active,
        priority: newExam.priority,
        eligibility: formData.get("eligibility")?.toString() || "",
        exam_pattern: formData.get("exam_pattern")?.toString() || "",
      });
      if (!targetCat.exam_ids) targetCat.exam_ids = [];
      if (!targetCat.exam_ids.includes(newExam.id)) targetCat.exam_ids.push(newExam.id);
      await setStoreData("categories", "data/categories.json", categories);
    }
  } catch (syncErr) {
    console.error("Failed to sync exam to categories.json:", syncErr);
  }

  return NextResponse.json(newExam);
}
