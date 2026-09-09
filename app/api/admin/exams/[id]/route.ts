import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getStoreData, setStoreData, saveUploadedFile, isAllowedImageType, MAX_IMAGE_SIZE } from "@/lib/store-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Exam {
  id: string;
  [key: string]: unknown;
}

function readExams(): Promise<Exam[]> {
  return getStoreData<Exam[]>("exams", "data/exams-new.json", []);
}

function writeExams(data: unknown[]) {
  return setStoreData("exams", "data/exams-new.json", data);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  // 1. Check categories.json first
  try {
    const categories = await getStoreData<any[]>("categories", "data/categories.json", []);
    for (const cat of categories) {
      for (const board of cat.boards || []) {
        for (const ex of board.exams || []) {
          if (ex.id === id) {
            return NextResponse.json({
              ...ex,
              category_id: cat.id,
              category_name: cat.name,
              board: board.short_name || board.name,
              board_id: board.board_id || board.id || "",
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("Error reading categories:", err);
  }

  // 2. Fallback to exams-new.json
  const exams = await readExams();
  const exam = exams.find((e) => e.id === id);
  if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(exam);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const formData = await req.formData();
  const exams = await readExams();
  const idx = exams.findIndex((e) => e.id === id);

  const updates: Record<string, unknown> = idx !== -1 ? { ...exams[idx] } : { id };
  updates.updated_at = new Date().toISOString();

  for (const [key, value] of formData.entries()) {
    if (key === "logo") continue;
    if (key === "course_ids") updates[key] = JSON.parse(value.toString());
    else if (key === "is_active") updates[key] = value === "true";
    else if (key === "priority" || key === "total_posts") updates[key] = Number(value);
    else updates[key] = value.toString();
  }

  const logo = formData.get("logo") as File | null;
  if (logo && logo.size > 0) {
    if (logo.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "File too large. Max 10MB allowed." }, { status: 400 });
    }
    if (!isAllowedImageType(logo.type, logo.name)) {
      return NextResponse.json({ error: "Invalid file type. Please upload an image." }, { status: 400 });
    }
    const safeId = id.replace(/[^a-z0-9_-]/gi, "");
    updates.logo_url = await saveUploadedFile(logo, "logos", safeId);
  }

  if (idx !== -1) {
    exams[idx] = updates as Exam;
    await writeExams(exams);
  }

  // Sync to categories.json
  try {
    const categories = await getStoreData<any[]>("categories", "data/categories.json", []);
    let foundInCat = false;
    for (const cat of categories) {
      for (const board of cat.boards || []) {
        for (let i = 0; i < (board.exams || []).length; i++) {
          if (board.exams[i].id === id) {
            board.exams[i] = {
              ...board.exams[i],
              ...updates,
            };
            foundInCat = true;
            break;
          }
        }
        if (foundInCat) break;
      }
      if (foundInCat) break;
    }
    if (foundInCat) {
      await setStoreData("categories", "data/categories.json", categories);
    }
  } catch (syncErr) {
    console.error("Failed to sync exam update to categories.json:", syncErr);
  }

  return NextResponse.json(updates);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const exams = await readExams();
  const filtered = exams.filter((e) => e.id !== id);
  if (filtered.length !== exams.length) {
    await writeExams(filtered);
  }

  // Delete from categories.json
  try {
    const categories = await getStoreData<any[]>("categories", "data/categories.json", []);
    let removed = false;
    for (const cat of categories) {
      for (const board of cat.boards || []) {
        if (board.exams) {
          const initialCount = board.exams.length;
          board.exams = board.exams.filter((e: any) => e.id !== id);
          if (board.exams.length !== initialCount) {
            removed = true;
          }
        }
      }
      if (cat.exam_ids) {
        cat.exam_ids = cat.exam_ids.filter((eid: string) => eid !== id);
      }
    }
    if (removed) {
      await setStoreData("categories", "data/categories.json", categories);
    }
  } catch (syncErr) {
    console.error("Failed to delete exam from categories.json:", syncErr);
  }

  return NextResponse.json({ success: true });
}
