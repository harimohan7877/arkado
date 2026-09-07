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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const exams = await readExams();
  const exam = exams.find((e: any) => e.id === id);
  if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(exam);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const formData = await req.formData();
  const exams = await readExams();
  const idx = exams.findIndex((e: any) => e.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const exam = exams[idx];
  const updates: any = { ...exam, updated_at: new Date().toISOString() };

  for (const [key, value] of formData.entries()) {
    if (key === "logo") continue;
    if (key === "course_ids") updates[key] = JSON.parse(value.toString());
    else if (key === "is_active") updates[key] = value === "true";
    else if (key === "priority" || key === "total_posts") updates[key] = Number(value);
    else updates[key] = value.toString();
  }

  const logo = formData.get("logo") as File | null;
  if (logo && logo.size > 0) {
    const bytes = await logo.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = logo.name.split(".").pop() || "png";
    const fileName = `${id}.${ext}`;
    const publicDir = join(process.cwd(), "public/logos");
    await writeFile(join(publicDir, fileName), buffer);
    updates.logo_url = `/logos/${fileName}`;
  }

  exams[idx] = updates;
  await writeExams(exams);
  return NextResponse.json(updates);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const exams = await readExams();
  const filtered = exams.filter((e: any) => e.id !== id);
  if (filtered.length === exams.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await writeExams(filtered);
  return NextResponse.json({ success: true });
}