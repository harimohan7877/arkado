import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  if (!verifyAdminSession(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { provider, key } = await req.json();

    if (!provider || !key) {
      return NextResponse.json({ error: 'Provider and Key are required' }, { status: 400 });
    }

    const testPrompt = "Respond with exactly: 'Hello, connection successful!'";

    if (provider === 'gemini') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: testPrompt }] }],
          generationConfig: { maxOutputTokens: 20 }
        })
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ success: false, error: `Gemini Error: ${res.status} - ${err.substring(0, 100)}` });
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return NextResponse.json({ success: true, response: text.trim() });
    }

    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: testPrompt }],
          max_tokens: 20
        })
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ success: false, error: `OpenAI Error: ${res.status} - ${err.substring(0, 100)}` });
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || '';
      return NextResponse.json({ success: true, response: text.trim() });
    }

    if (provider === 'claude') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 20,
          messages: [{ role: 'user', content: testPrompt }]
        })
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ success: false, error: `Claude Error: ${res.status} - ${err.substring(0, 100)}` });
      }

      const data = await res.json();
      const text = data.content?.[0]?.text || '';
      return NextResponse.json({ success: true, response: text.trim() });
    }

    if (provider === 'openrouter') {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
          'HTTP-Referer': 'https://arkado.in',
          'X-Title': 'Arkado'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [{ role: 'user', content: testPrompt }],
          max_tokens: 20
        })
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ success: false, error: `OpenRouter Error: ${res.status} - ${err.substring(0, 100)}` });
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || '';
      return NextResponse.json({ success: true, response: text.trim() });
    }

    if (provider === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: testPrompt }],
          max_tokens: 20
        })
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ success: false, error: `Groq Error: ${res.status} - ${err.substring(0, 100)}` });
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || '';
      return NextResponse.json({ success: true, response: text.trim() });
    }

    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Test key error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: 'Connection failed: ' + message });
  }
}
