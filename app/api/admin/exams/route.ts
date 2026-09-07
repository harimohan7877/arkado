import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const FILE = join(process.cwd(), "data/exams-new.json");

function verifyAuth(req: NextRequest) {
  const auth = req.headers.get("authorization");
  return auth === "7877";
}

function readExams() {
  return readFile(FILE, "utf-8").then(JSON.parse).catch(() => []);
}

function writeExams(data: any[]) {
  return writeFile(FILE, JSON.stringify(data, null, 2));
}

export async function GET(req: NextRequest) {
  if (!verifyAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await readExams();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!verifyAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    const bytes = await logo.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = logo.name.split(".").pop() || "png";
    const fileName = `${newExam.id}.${ext}`;
    const publicDir = join(process.cwd(), "public/logos");
    await writeFile(join(publicDir, fileName), buffer);
    newExam.logo_url = `/logos/${fileName}`;
  }

  exams.push(newExam);
  await writeExams(exams);
  return NextResponse.json(newExam);
}