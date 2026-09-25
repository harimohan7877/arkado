import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getAdminSettings, saveAdminAiSettings } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function maskApiKey(key?: string): string {
  if (!key || key.length < 8) return "";
  return `${key.substring(0, 6)}••••••••${key.substring(key.length - 4)}`;
}

export async function GET(req: NextRequest) {
  if (!verifyAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getAdminSettings();

  return NextResponse.json({
    active_provider: settings.active_provider || "openrouter",
    openrouter_key_masked: maskApiKey(settings.openrouter_key),
    gemini_key_masked: maskApiKey(settings.gemini_key),
    openai_key_masked: maskApiKey(settings.openai_key),
    claude_key_masked: maskApiKey(settings.claude_key),
    groq_key_masked: maskApiKey(settings.groq_key),
    has_openrouter_key: Boolean(settings.openrouter_key),
    has_gemini_key: Boolean(settings.gemini_key),
    has_openai_key: Boolean(settings.openai_key),
    has_claude_key: Boolean(settings.claude_key),
    has_groq_key: Boolean(settings.groq_key),
  });
}

export async function POST(req: NextRequest) {
  if (!verifyAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      active_provider,
      openrouter_key,
      gemini_key,
      openai_key,
      claude_key,
      groq_key,
    } = body;

    // Safety validation: Prevent anyone from pasting a JSON object as an API key
    const validateKey = (k?: string) => {
      if (!k) return undefined;
      const trimmed = k.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        throw new Error("Invalid API key format. Cannot be a JSON string.");
      }
      return trimmed;
    };

    const updates: Record<string, any> = {};
    if (active_provider) updates.active_provider = active_provider;
    if (openrouter_key !== undefined) updates.openrouter_key = validateKey(openrouter_key);
    if (gemini_key !== undefined) updates.gemini_key = validateKey(gemini_key);
    if (openai_key !== undefined) updates.openai_key = validateKey(openai_key);
    if (claude_key !== undefined) updates.claude_key = validateKey(claude_key);
    if (groq_key !== undefined) updates.groq_key = validateKey(groq_key);

    const success = await saveAdminAiSettings(updates);
    if (!success) {
      return NextResponse.json({ error: "Failed to update AI settings in database." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "AI settings updated successfully." });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save AI configuration." },
      { status: 400 }
    );
  }
}
