import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminSession } from '@/lib/admin-auth';
import fs from 'fs';
import path from 'path';

function getLocalGroupsPath() {
  return path.join(process.cwd(), 'data', 'groups.json');
}

function readLocalGroups(): Record<string, unknown>[] {
  try {
    const raw = fs.readFileSync(getLocalGroupsPath(), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeLocalGroups(groups: Record<string, unknown>[]) {
  fs.writeFileSync(getLocalGroupsPath(), JSON.stringify(groups, null, 2), 'utf-8');
}

function readLocalMarketplaceData(): Record<string, unknown> {
  try {
    const raw = fs.readFileSync(
      path.join(process.cwd(), 'data', 'marketplace_data.json'),
      'utf-8'
    );
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function GET(req: NextRequest) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: groups, error } = await supabaseAdmin
      .from('marketplace_groups')
      .select('*')
      .order('priority', { ascending: true });

    if (error) {
      const local = readLocalGroups();
      const marketplaceData = readLocalMarketplaceData();
      const enriched = local.map((g: Record<string, unknown>) => {
        const groupName = g.name as string;
        const exams = (marketplaceData as Record<string, unknown[]>)[groupName] || [];
        return { ...g, exams };
      });
      return NextResponse.json(enriched);
    }

    return NextResponse.json(groups || []);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, name, name_hi, meta_title, meta_description, logo_url, cover_image, priority, is_active, exams } = body;

    if (!id || !name) {
      return NextResponse.json({ error: 'Group ID and Name required' }, { status: 400 });
    }

    const groupData: Record<string, unknown> = {
      id,
      name,
      logo_url: logo_url || null,
      cover_image: cover_image || null,
      name_hi: name_hi || null,
      meta_title: meta_title || null,
      meta_description: meta_description || null,
      priority: priority !== undefined ? priority : 0,
      is_active: is_active !== undefined ? is_active : true,
    };

    const { data, error } = await supabaseAdmin
      .from('marketplace_groups')
      .upsert(groupData)
      .select()
      .single();

    if (error) {
      const local = readLocalGroups();
      const idx = local.findIndex((g: Record<string, unknown>) => g.id === id);
      const entry = { id, name, name_hi, meta_title, meta_description, logo_url, cover_image, priority, is_active, exams };
      if (idx >= 0) {
        local[idx] = { ...local[idx], ...entry };
      } else {
        local.push(entry);
      }
      writeLocalGroups(local);
      return NextResponse.json({ ...entry, _fallback: true, _file: 'groups.json' });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Admin group create error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to save group: ' + message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { groupId } = await req.json();
    if (!groupId) {
      return NextResponse.json({ error: 'Group ID required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('marketplace_groups')
      .delete()
      .eq('id', groupId);

    if (error) {
      const local = readLocalGroups();
      const filtered = local.filter((g: Record<string, unknown>) => g.id !== groupId);
      writeLocalGroups(filtered);
      return NextResponse.json({ success: true, _fallback: true });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Admin group delete error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to delete group: ' + message }, { status: 500 });
  }
}
