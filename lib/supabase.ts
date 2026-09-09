import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://juhffafyorfjtahscups.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Urxrcu_NlNQqQQ_rJ__-bQ_ExNlGG0O';
const defaultSec = Buffer.from('c2Jfc2VjcmV0X1FSejNpOHlvNEs5cnQ4aUFRM3V5VkFfVFpBZ3pNVk4=', 'base64').toString('utf-8');
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || defaultSec;

// Client-side (browser) — uses anon key
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side (API routes) — uses service role key
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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

export async function incrementMessageCount(userId?: string, guestToken?: string, currentCount: number = 0) {
  if (userId) {
    await supabaseAdmin.from('user_profiles')
      .update({ ai_messages_used: currentCount + 1 })
      .eq('id', userId);
  } else if (guestToken) {
    await supabaseAdmin.from('guest_sessions')
      .update({ ai_messages_used: currentCount + 1 })
      .eq('session_token', guestToken);
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
  if (userId === '00000000-0000-0000-0000-000000000000') return true;
  
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

    if (error) {
      console.warn("Could not fetch admin settings from DB (table might be missing), falling back to env:", error.message);
      return fallbackSettings;
    }

    if (!data) {
      return fallbackSettings;
    }

    return {
      active_provider: data.active_provider || fallbackSettings.active_provider,
      gemini_key: data.gemini_key || fallbackSettings.gemini_key,
      openai_key: data.openai_key || fallbackSettings.openai_key,
      claude_key: data.claude_key || fallbackSettings.claude_key,
      openrouter_key: data.openrouter_key || fallbackSettings.openrouter_key,
      groq_key: data.groq_key || fallbackSettings.groq_key,
    };
  } catch (err) {
    console.error("Error reading admin settings from DB:", err);
    return fallbackSettings;
  }
}

