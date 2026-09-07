import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ordersFilePath = path.join(process.cwd(), 'data', 'orders.json');

function readOrders() {
  try {
    if (!fs.existsSync(ordersFilePath)) {
      fs.writeFileSync(ordersFilePath, '[]', 'utf8');
      return [];
    }
    const data = fs.readFileSync(ordersFilePath, 'utf8');
    return JSON.parse(data || '[]');
  } catch {
    return [];
  }
}

function writeOrders(orders: unknown[]) {
  try {
    fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing orders:', err);
  }
}

export async function GET() {
  const orders = readOrders();
  // Sort descending by date
  orders.sort((a: { created_at: string }, b: { created_at: string }) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return NextResponse.json({ success: true, orders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      delivery_mode, // "whatsapp" | "gmail"
      phone,
      email,
      utr,
      course_id,
      course_title,
      amount,
      drive_url
    } = body;

    if (!name || !utr || !course_id) {
      return NextResponse.json(
        { success: false, error: 'आवश्यक जानकारी अधूरी है (Missing required fields)' },
        { status: 400 }
      );
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const order_id = `ARK-${new Date().getFullYear()}-${randomSuffix}`;

    const newOrder = {
      order_id,
      name,
      delivery_mode: delivery_mode || 'whatsapp',
      phone: phone || '',
      email: email || '',
      utr: utr.trim(),
      course_id,
      course_title,
      amount: Number(amount) || 199,
      drive_url: drive_url || 'https://drive.google.com',
      status: 'pending', // 'pending' | 'delivered'
      created_at: new Date().toISOString(),
    };

    const orders = readOrders();
    orders.unshift(newOrder);
    writeOrders(orders);

    return NextResponse.json({ success: true, order: newOrder });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { order_id, status } = body;

    if (!order_id || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing order_id or status' },
        { status: 400 }
      );
    }

    const orders = readOrders();
    const orderIndex = orders.findIndex((o: { order_id: string }) => o.order_id === order_id);

    if (orderIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    orders[orderIndex].status = status;
    orders[orderIndex].updated_at = new Date().toISOString();
    writeOrders(orders);

    return NextResponse.json({ success: true, order: orders[orderIndex] });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const order_id = searchParams.get('order_id');

    if (!order_id) {
      return NextResponse.json({ success: false, error: 'order_id is required' }, { status: 400 });
    }

    let orders = readOrders();
    orders = orders.filter((o: { order_id: string }) => o.order_id !== order_id);
    writeOrders(orders);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}

