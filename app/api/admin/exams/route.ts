import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { verifyAdminSession } from "@/lib/admin-auth";

const FILE = join(process.cwd(), "data/exams-new.json");
const MAX_FILE_SIZE = 500 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function readExams() {
  return readFile(FILE, "utf-8").then(JSON.parse).catch(() => []);
}

function writeExams(data: unknown[]) {
  return writeFile(FILE, JSON.stringify(data, null, 2));
}

export async function GET(req: NextRequest) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await readExams();
  return NextResponse.json(data);
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
    const bytes = await logo.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = logo.name.split(".").pop() || "png";
    const safeId = newExam.id.replace(/[^a-z0-9-]/gi, "");
    const fileName = `${safeId}.${ext}`;
    const publicDir = join(process.cwd(), "public/logos");
    await writeFile(join(publicDir, fileName), buffer);
    newExam.logo_url = `/logos/${fileName}`;
  }

  exams.push(newExam);
  await writeExams(exams);
  return NextResponse.json(newExam);
}
