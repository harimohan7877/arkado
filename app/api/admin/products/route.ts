import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminSession } from '@/lib/admin-auth';
import fs from 'fs';
import path from 'path';

function getLocalProductsPath() {
  return path.join(process.cwd(), 'data', 'products_mock.json');
}

function readLocalProducts(): Record<string, unknown>[] {
  try {
    const raw = fs.readFileSync(getLocalProductsPath(), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeLocalProducts(products: Record<string, unknown>[]) {
  fs.writeFileSync(getLocalProductsPath(), JSON.stringify(products, null, 2), 'utf-8');
}

export async function GET(req: NextRequest) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: products, error } = await supabaseAdmin
      .from('marketplace_products')
      .select('*, group:marketplace_groups(name)')
      .order('created_at', { ascending: false });

    if (error) {
      const local = readLocalProducts();
      return NextResponse.json(
        local.map((p: Record<string, unknown>) => ({
          ...p,
          group: { name: p.groupName },
        }))
      );
    }

    return NextResponse.json(products || []);
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
    const {
      id, title, exam_name, group_id, type,
      price, sale_price, pages, language, file_url,
      is_active, is_featured, cover_image,
    } = body;

    if (!id || !title) {
      return NextResponse.json({ error: 'Product ID and Title required' }, { status: 400 });
    }

    const productData: Record<string, unknown> = {
      id,
      title,
      exam_name: exam_name || title,
      group_id: group_id || null,
      type: type || 'Notes',
      price: price || 0,
      sale_price: sale_price || 0,
      pages: pages || null,
      language: language || 'Hindi',
      file_url: file_url || null,
      is_active: is_active !== undefined ? is_active : true,
      is_featured: is_featured !== undefined ? is_featured : false,
      cover_image: cover_image || null,
    };

    const { data, error } = await supabaseAdmin
      .from('marketplace_products')
      .upsert(productData)
      .select()
      .single();

    if (error) {
      const local = readLocalProducts();
      const idx = local.findIndex((p: Record<string, unknown>) => p.id === id);
      const entry: Record<string, unknown> = {
        id, title,
        examName: exam_name || title,
        groupName: (local[idx]?.groupName as string) || '',
        group_id,
        type: type || 'Notes',
        price: price || 0,
        salePrice: sale_price || 0,
        pages: pages || null,
        language: language || 'Hindi',
        file_url: file_url || null,
        is_active: is_active !== undefined ? is_active : true,
        is_featured: is_featured !== undefined ? is_featured : false,
        cover_image: cover_image || null,
      };
      if (idx >= 0) {
        local[idx] = { ...local[idx], ...entry };
      } else {
        local.push(entry);
      }
      writeLocalProducts(local);
      return NextResponse.json({ ...entry, _fallback: true, _file: 'products_mock.json' });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Admin product create error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to save product: ' + message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { productId } = await req.json();
    if (!productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('marketplace_products')
      .delete()
      .eq('id', productId);

    if (error) {
      const local = readLocalProducts();
      const filtered = local.filter((p: Record<string, unknown>) => p.id !== productId);
      writeLocalProducts(filtered);
      return NextResponse.json({ success: true, _fallback: true });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Admin product delete error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to delete product: ' + message }, { status: 500 });
  }
}
