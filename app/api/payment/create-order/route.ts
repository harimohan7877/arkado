/*
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Razorpay = require('razorpay');
*/
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    /*
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      console.error('Razorpay keys missing in environment');
      return NextResponse.json({ error: 'Payment configuration error' }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id,
      key_secret,
    });

    const order = await razorpay.orders.create({
      amount: 3000,
      currency: 'INR',
      notes: { userId, purpose: 'Arkado Premium' }
    });
    */

    // Mock order for UI demo since keys are not available yet
    const mockOrderId = 'order_' + Math.random().toString(36).substring(7);

    await supabaseAdmin.from('payments').insert({
      user_id: userId,
      razorpay_order_id: mockOrderId,
      amount: 3000,
      status: 'pending'
    });

    return NextResponse.json({ orderId: mockOrderId, amount: 3000 });
  } catch (error) {
    console.error('Payment create error:', error);
    return NextResponse.json({ error: 'Payment creation failed' }, { status: 500 });
  }
}
