import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const FILE = join(process.cwd(), "data/categories.json");

function verifyAuth(req: NextRequest) {
  const auth = req.headers.get("authorization");
  return auth === "7877";
}

function readCategories() {
  return readFile(FILE, "utf-8").then(JSON.parse).catch(() => []);
}

function writeCategories(data: any[]) {
  return writeFile(FILE, JSON.stringify(data, null, 2));
}

export async function GET(req: NextRequest) {
  if (!verifyAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await readCategories();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!verifyAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const categories = await readCategories();

  const newCategory = {
    id: formData.get("name")?.toString().toLowerCase().replace(/\s+/g, "-") || `cat-${Date.now()}`,
    name: formData.get("name")?.toString() || "",
    name_hi: formData.get("name_hi")?.toString() || "",
    icon: formData.get("icon")?.toString() || "📁",
    color: formData.get("color")?.toString() || "bg-blue-600",
    priority: Number(formData.get("priority") || categories.length + 1),
    is_active: formData.get("is_active") === "true",
    exam_ids: JSON.parse(formData.get("exam_ids")?.toString() || "[]"),
    logo_url: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const logo = formData.get("logo") as File | null;
  if (logo && logo.size > 0) {
    const bytes = await logo.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = logo.name.split(".").pop() || "png";
    const fileName = `${newCategory.id}.${ext}`;
    const publicDir = join(process.cwd(), "public/logos");
    await writeFile(join(publicDir, fileName), buffer);
    newCategory.logo_url = `/logos/${fileName}`;
  }

  categories.push(newCategory);
  await writeCategories(categories);
  return NextResponse.json(newCategory);
}