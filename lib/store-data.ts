import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { supabaseAdmin } from "@/lib/supabase";

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

  // 3. Fallback to local JSON file
  try {
    const raw = await readFile(join(process.cwd(), localFilePath), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
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

  // 3. Write to local file (safely ignore EROFS in serverless read-only environment)
  try {
    await writeFile(join(process.cwd(), localFilePath), JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // Safe to ignore on Vercel AWS Lambda
  }
}

export async function saveUploadedFile(file: File, subDir: string, safeName: string): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = file.name.split(".").pop() || "png";
  const fileName = `${safeName}.${ext}`;

  try {
    const targetDir = join(process.cwd(), "public", subDir);
    await writeFile(join(targetDir, fileName), buffer);
    return `/${subDir}/${fileName}`;
  } catch {
    const mime = file.type || "image/png";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  }
}

