import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { supabaseAdmin } from "@/lib/supabase";

function getCandidatePaths(localFilePath: string): string[] {
  const norm = localFilePath.replace(/\\/g, "/");
  const candidates: string[] = [
    join(process.cwd(), norm),
    join(process.cwd(), "sarkari-sathi", norm),
    join("C:\\Users\\harimohan sharma\\Documents\\Arkado\\sarkari-sathi", norm),
    join("C:\\Users\\harimohan sharma\\Documents\\GitHub\\SARKARI_SATHI", norm),
  ];
  return [...new Set(candidates)];
}

export async function getStoreData<T>(key: string, localFilePath: string, defaultValue: T): Promise<T> {
  // 1. Try Supabase store_data table
  try {
    const { data, error } = await supabaseAdmin
      .from("store_data")
      .select("data")
      .eq("key", key)
      .maybeSingle();

    if (!error && data?.data) {
      return data.data as T;
    }
  } catch {}

  // 2. For settings, try Supabase admin_settings.gemini_key
  if (key === "settings") {
    try {
      const { data, error } = await supabaseAdmin
        .from("admin_settings")
        .select("gemini_key")
        .limit(1)
        .maybeSingle();

      if (!error && data?.gemini_key && data.gemini_key.startsWith("{")) {
        return JSON.parse(data.gemini_key) as T;
      }
    } catch {}
  }

  // 3. Fallback to candidate local JSON files
  const candidates = getCandidatePaths(localFilePath);
  for (const p of candidates) {
    try {
      if (existsSync(p)) {
        const raw = await readFile(p, "utf-8");
        return JSON.parse(raw) as T;
      }
    } catch {}
  }

  return defaultValue;
}

export async function setStoreData<T>(key: string, localFilePath: string, data: T): Promise<void> {
  // 1. Save to Supabase store_data table
  try {
    await supabaseAdmin
      .from("store_data")
      .upsert({ key, data, updated_at: new Date().toISOString() });
  } catch {}

  // 2. For settings, persist to Supabase admin_settings row
  if (key === "settings") {
    try {
      const jsonString = JSON.stringify(data);
      const { data: existing } = await supabaseAdmin
        .from("admin_settings")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        await supabaseAdmin
          .from("admin_settings")
          .update({ gemini_key: jsonString, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      }
    } catch (err) {
      console.error("Error saving settings to admin_settings:", err);
    }
  }

  // 3. Write to all candidate paths with recursive directory creation
  const candidates = getCandidatePaths(localFilePath);
  const jsonContent = JSON.stringify(data, null, 2);

  for (const p of candidates) {
    try {
      const dir = dirname(p);
      await mkdir(dir, { recursive: true });
      await writeFile(p, jsonContent, "utf-8");
    } catch {}
  }
}

export async function saveUploadedFile(file: File, subDir: string, safeName: string): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = file.name.split(".").pop() || "png";
  const fileName = `${safeName}.${ext}`;

  const candidateDirs = [
    join(process.cwd(), "public", subDir),
    join(process.cwd(), "sarkari-sathi", "public", subDir),
    join("C:\\Users\\harimohan sharma\\Documents\\Arkado\\sarkari-sathi", "public", subDir),
  ];

  for (const d of candidateDirs) {
    try {
      await mkdir(d, { recursive: true });
      await writeFile(join(d, fileName), buffer);
      return `/${subDir}/${fileName}`;
    } catch {}
  }

  const mime = file.type || "image/png";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}
