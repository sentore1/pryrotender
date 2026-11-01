import { NextRequest, NextResponse } from 'next/server';
import { callGroq, hasGroqKey } from '@/lib/groq-client';

const GROQ_MODEL = 'qwen/qwen3.8-27b';

export async function POST(request: NextRequest) {
  try {
    const { proposal, instruction } = await request.json();
    if (!proposal || !instruction) {
      return NextResponse.json({ success: false, error: 'Missing proposal or instruction' }, { status: 400 });
    }

    if (!hasGroqKey()) {
      return NextResponse.json({ success: true, proposal: proposal });
    }

    const truncated = proposal.length > 6000 ? proposal.slice(0, 6000) : proposal;
    const userMsg = 'Here is the current proposal:\n\n' + truncated + '\n\nInstruction: ' + instruction + '\n\nReturn the full revised proposal.';

    const result = await callGroq({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: 'You are an expert proposal editor. Return ONLY the full revised proposal with the requested changes applied.' },
        { role: 'user', content: userMsg },
      ],
      temperature: 0.5,
      max_tokens: 4000,
    });

    return NextResponse.json({ success: true, proposal: result });
  } catch (error) {
    const msg = (error as any)?.message;
    console.error('Error adjusting proposal:', error);
    return NextResponse.json({ success: false, error: msg || 'Failed to adjust proposal' }, { status: 500 });
  }
}
