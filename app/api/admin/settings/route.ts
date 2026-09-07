import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const FILE = join(process.cwd(), "data/settings.json");

function verifyAuth(req: NextRequest) {
  const auth = req.headers.get("authorization");
  return auth === "7877";
}

function readSettings() {
  return readFile(FILE, "utf-8").then(JSON.parse).catch(() => ({}));
}

function writeSettings(data: any) {
  return writeFile(FILE, JSON.stringify(data, null, 2));
}

export async function GET(req: NextRequest) {
  if (!verifyAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await readSettings();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!verifyAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const current = await readSettings();
  const updated = { ...current, ...body, updated_at: new Date().toISOString() };
  await writeSettings(updated);
  return NextResponse.json(updated);
}