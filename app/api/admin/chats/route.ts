import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminSession } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: chats, error } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json(chats || []);
  } catch (error: unknown) {
    console.error('Chats query error:', error);
    return NextResponse.json([]);
  }
}
