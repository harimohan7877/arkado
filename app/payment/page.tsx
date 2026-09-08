"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { User } from "@/lib/types";

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

declare global { interface Window { Razorpay: any; } } // eslint-disable-line @typescript-eslint/no-explicit-any

export default function PaymentPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user as User);
      else router.push('/auth');
    });

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    document.head.appendChild(script);
  }, [router]);

  async function handlePayment() {
    if (!user) return;
    setLoading(true);

    try {
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const { orderId, amount } = await res.json();

      // If Razorpay Key is missing, simulate success for UI demo
      if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
        console.log('Razorpay Key missing, simulating success...');
        setTimeout(async () => {
          const verifyRes = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: orderId,
              paymentId: 'pay_mock_' + Math.random().toString(36).substring(7),
              signature: 'mock_sig',
              userId: user.id,
            }),
          });
          const result = await verifyRes.json();
          if (result.success) {
            setSuccess(true);
            setTimeout(() => router.push('/results'), 2000);
          }
        }, 1500);
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount,
        currency: 'INR',
        name: 'Arkado',
        description: 'Premium Access — Unlimited AI + Study Material',
        order_id: orderId,
        handler: async (response: RazorpayResponse) => {
          const verifyRes = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              userId: user.id,
            }),
          });
          const result = await verifyRes.json();
          if (result.success) {
            setSuccess(true);
            setTimeout(() => router.push('/results'), 2000);
          }
        },
        prefill: { email: user.email },
        theme: { color: '#0F2B5B' },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('Payment error:', err);
      alert('Payment में कुछ problem हो गई। दोबारा try करें।');
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#EEF2F8] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute w-96 h-96 rounded-full bg-orange-500/5 blur-3xl -top-20 -left-20 pointer-events-none" />
        <div className="absolute w-96 h-96 rounded-full bg-blue-500/5 blur-3xl top-1/2 right-0 pointer-events-none" />
        <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF6B00] via-white to-[#138808] z-[60]" />
        
        <div className="bg-white rounded-3xl shadow-xl shadow-blue-900/10 p-8 text-center max-w-sm border border-[#C5D0E0]/60 relative z-10 animate-slide-up">
          <p className="text-6xl mb-4">🎉</p>
          <h2 className="text-xl font-extrabold text-[#0F2B5B] mb-2" style={{ fontFamily: "var(--font-noto)" }}>भुगतान सफल!</h2>
          <p className="text-gray-500 text-xs leading-relaxed" style={{ fontFamily: "var(--font-noto)" }}>अब आपको Unlimited AI सवाल + Complete Study Material और PYQ एक्सेस मिलेगा।</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EEF2F8] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute w-96 h-96 rounded-full bg-orange-500/5 blur-3xl -top-20 -left-20 pointer-events-none" />
      <div className="absolute w-96 h-96 rounded-full bg-blue-500/5 blur-3xl top-1/2 right-0 pointer-events-none" />

      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF6B00] via-white to-[#138808] z-50" />
      
      <div className="w-full max-w-md relative z-10 animate-slide-up">
        <div className="bg-white rounded-3xl shadow-xl shadow-blue-900/10 overflow-hidden border border-[#C5D0E0]/60">
          <div className="bg-gradient-to-br from-[#0F2B5B] via-[#143770] to-[#1847A6] p-8 text-center border-b border-white/10 relative">
            <button 
              onClick={() => router.back()}
              className="absolute left-4 top-4 text-white/70 hover:text-white text-xs bg-white/10 hover:bg-white/20 p-2 rounded-full border border-white/10 transition-all active:scale-95"
            >
              ← वापस
            </button>
            <div className="text-4xl mb-2.5">💎</div>
            <h1 className="text-white text-xl font-extrabold tracking-tight" style={{ fontFamily: "var(--font-noto)" }}>Premium Access</h1>
            <p className="text-white/70 text-xs mt-1" style={{ fontFamily: "var(--font-noto)" }}>सभी फीचर्स को हमेशा के लिए अनलॉक करें</p>
          </div>

          <div className="p-8 text-center">
            <div className="mb-6 bg-[#EEF2F8]/70 py-5 rounded-2xl border border-blue-100/30">
              <p className="text-5xl font-black text-[#0F2B5B]">₹30</p>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mt-1.5" style={{ fontFamily: "var(--font-noto)" }}>एक बार का भुगतान — Life-time Access</p>
            </div>

            <div className="text-left space-y-3 mb-6 bg-gray-50/50 p-4.5 rounded-2xl border border-gray-100/80">
              {[
                "✅ Unlimited AI सवाल और उत्तर",
                "✅ Complete Study Material (पाठ्यक्रम)",
                "✅ Previous Year Papers (PYQ)",
                "✅ Syllabus PDF डाउनलोड सुविधा",
                "✅ Exam Info Save करने की सुविधा",
                "✅ बातचीत की पुरानी हिस्ट्री (Chat History)"
              ].map((f, i) => (
                <p key={i} className="text-xs font-bold text-gray-700 flex items-center gap-2" style={{ fontFamily: "var(--font-noto)" }}>
                  <span className="text-green-500">✓</span>
                  <span>{f}</span>
                </p>
              ))}
            </div>

            <button
              onClick={handlePayment}
              disabled={loading || !user}
              className="w-full h-14 bg-gradient-to-r from-[#FF6B00] to-[#E55A00] hover:from-[#E55A00] hover:to-[#cc5000] text-white text-base font-extrabold rounded-xl disabled:opacity-50 active:scale-[0.98] transition-all shadow-md hover:shadow-lg hover:shadow-orange-500/10 cursor-pointer"
              style={{ fontFamily: "var(--font-noto)" }}
            >
              {loading ? '⏳ Processing...' : '₹30 Pay करें →'}
            </button>

            <p className="text-[10px] text-gray-400 mt-4 leading-relaxed flex items-center justify-center gap-1" style={{ fontFamily: "var(--font-noto)" }}>
              <span>🔒</span> Razorpay द्वारा पूर्णतः सुरक्षित भुगतान गेटवे
            </p>
          </div>
        </div>

        <button onClick={() => router.back()} className="w-full text-center text-xs font-bold text-gray-400 mt-5 hover:text-gray-600 transition-colors" style={{ fontFamily: "var(--font-noto)" }}>
          ← वापस जाएं
        </button>
      </div>
    </div>
  );
}
