import { createClient } from '@supabase/supabase-js';

// Supabase credentials with production fallbacks to prevent site crashes if env vars are missing on host
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://juhffafyorfjtahscups.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Urxrcu_NlNQqQQ_rJ__-bQ_ExNlGG0O';
const isServer = typeof window === 'undefined';
const supabaseServiceKey = isServer ? (process.env.SUPABASE_SERVICE_ROLE_KEY || '') : '';

// Client-side (browser) — uses anon key
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side (API routes) — uses service role key (guarded to never leak into client bundle)
export const supabaseAdmin = isServer
  ? createClient(supabaseUrl, supabaseServiceKey)
  : (null as unknown as ReturnType<typeof createClient>);

// Message limits
export const MESSAGE_LIMITS = {
  guest: 5,        // Bina login — 5 messages
  registered: 10,  // Login ke baad free — 10 total
  paid: 999        // ₹30 ke baad — unlimited
};

export type UserTier = 'guest' | 'registered' | 'paid';

export interface TierInfo {
  tier: UserTier;
  messagesUsed: number;
  limit: number;
}

export async function getUserTier(userId?: string, guestToken?: string): Promise<TierInfo> {
  if (userId) {
    const { data } = await supabaseAdmin
      .from('user_profiles')
      .select('is_paid, ai_messages_used')
      .eq('id', userId)
      .single();

    if (data?.is_paid) return { tier: 'paid', messagesUsed: data.ai_messages_used, limit: 999 };
    return { tier: 'registered', messagesUsed: data?.ai_messages_used || 0, limit: 10 };
  }

  if (guestToken) {
    const { data } = await supabaseAdmin
      .from('guest_sessions')
      .select('ai_messages_used')
      .eq('session_token', guestToken)
      .single();
    return { tier: 'guest', messagesUsed: data?.ai_messages_used || 0, limit: 5 };
  }

  return { tier: 'guest', messagesUsed: 0, limit: 5 };
}

export async function incrementMessageCount(userId?: string, guestToken?: string, _currentCount: number = 0) {
  // Use atomic SQL increment to prevent race conditions (two concurrent requests both reading the same count)
  if (userId) {
    try {
      const { error } = await supabaseAdmin.rpc('increment_ai_messages', { row_id: userId, table_name: 'user_profiles' });
      if (error) throw error;
    } catch {
      // Fallback if RPC doesn't exist yet — still safer than client-side increment
      await supabaseAdmin.from('user_profiles')
        .update({ ai_messages_used: _currentCount + 1 })
        .eq('id', userId);
    }
  } else if (guestToken) {
    try {
      const { error } = await supabaseAdmin.rpc('increment_ai_messages_guest', { token: guestToken });
      if (error) throw error;
    } catch {
      await supabaseAdmin.from('guest_sessions')
        .update({ ai_messages_used: _currentCount + 1 })
        .eq('session_token', guestToken);
    }
  }
}

export async function saveChatMessages(userId: string, examId: string, userMessage: string, aiResponse: string) {
  await supabaseAdmin.from('chat_messages').insert([
    { user_id: userId, exam_id: examId, role: 'user', content: userMessage },
    { user_id: userId, exam_id: examId, role: 'assistant', content: aiResponse }
  ]);
}

import { NextRequest } from 'next/server';

export async function verifyUserSession(req: NextRequest, userId: string): Promise<boolean> {
  if (!userId) return false;
  // SECURITY: Removed hardcoded null-UUID bypass that allowed unauthenticated access
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const ref = supabaseUrl.split('//')[1]?.split('.')[0] || '';
  
  // Try to find the auth cookie
  const token = req.cookies.get('sb-access-token')?.value || 
                req.cookies.get(`sb-${ref}-auth-token`)?.value ||
                req.cookies.get(`sb-${ref}-auth-token.0`)?.value ||
                req.cookies.get(`sb-${ref}-auth-token.1`)?.value;
                
  if (!token) return false;
  
  let actualToken = token;
  try {
    const parsed = JSON.parse(token);
    actualToken = parsed.access_token || token;
  } catch {}
  
  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(actualToken);
    return user?.id === userId;
  } catch (err) {
    console.error("Session verification error:", err);
    return false;
  }
}

export interface AdminSettings {
  active_provider: string;
  gemini_key: string;
  openai_key: string;
  claude_key: string;
  openrouter_key: string;
  groq_key: string;
}

// Security & Decoupling Filter: Ensures application JSON blobs are never returned as API keys
function filterRealApiKey(dbVal?: string | null, envVal?: string): string {
  if (!dbVal) return envVal || '';
  const trimmed = dbVal.trim();
  // If it's a JSON blob (starts with { or [ or contains store fields like upi_id), it's NOT an API key!
  if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.includes('"upi_id"') || trimmed.includes('"id"')) {
    return envVal || '';
  }
  return trimmed;
}

export async function getAdminSettings(): Promise<AdminSettings> {
  const fallbackSettings: AdminSettings = {
    active_provider: process.env.ACTIVE_AI_PROVIDER || 'openrouter',
    gemini_key: process.env.GEMINI_API_KEY || '',
    openai_key: process.env.OPENAI_API_KEY || '',
    claude_key: process.env.CLAUDE_API_KEY || '',
    openrouter_key: process.env.OPENROUTER_API_KEY || '',
    groq_key: process.env.GROQ_API_KEY || ''
  };

  try {
    const { data, error } = await supabaseAdmin
      .from('admin_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return fallbackSettings;
    }

    return {
      active_provider: data.active_provider || fallbackSettings.active_provider,
      gemini_key: filterRealApiKey(data.gemini_key, fallbackSettings.gemini_key),
      openai_key: filterRealApiKey(data.openai_key, fallbackSettings.openai_key),
      claude_key: filterRealApiKey(data.claude_key, fallbackSettings.claude_key),
      openrouter_key: filterRealApiKey(data.openrouter_key, fallbackSettings.openrouter_key),
      groq_key: filterRealApiKey(data.groq_key, fallbackSettings.groq_key),
    };
  } catch (err) {
    console.error("Error reading admin settings from DB:", err);
    return fallbackSettings;
  }
}

export async function saveAdminAiSettings(updates: Partial<AdminSettings>): Promise<boolean> {
  try {
    const { data: existing } = await supabaseAdmin
      .from('admin_settings')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (!existing?.id) return false;

    const payload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.active_provider) payload.active_provider = updates.active_provider;
    if (updates.gemini_key !== undefined) payload.gemini_key = updates.gemini_key;
    if (updates.openrouter_key !== undefined) payload.openrouter_key = updates.openrouter_key;
    if (updates.openai_key !== undefined) payload.openai_key = updates.openai_key;
    if (updates.claude_key !== undefined) payload.claude_key = updates.claude_key;
    if (updates.groq_key !== undefined) payload.groq_key = updates.groq_key;

    const { error } = await supabaseAdmin
      .from('admin_settings')
      .update(payload)
      .eq('id', existing.id);

    return !error;
  } catch (err) {
    console.error("Error saving admin AI settings:", err);
    return false;
  }
}


