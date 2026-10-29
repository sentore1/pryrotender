import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'qwen/qwen3.8-27b';

export async function POST(request: NextRequest) {
  try {
    const { proposal, instruction } = await request.json();
    if (!proposal || !instruction) {
      return NextResponse.json({ success: false, error: 'Missing proposal or instruction' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'your_groq_api_key_here') {
      return NextResponse.json({ success: true, proposal: proposal });
    }

    const truncated = proposal.length > 12000 ? proposal.slice(0, 12000) : proposal;
    const userMsg = 'Here is the current proposal:\n\n' + truncated + '\n\nInstruction: ' + instruction + '\n\nReturn the full revised proposal.';

    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: 'You are an expert proposal editor. Return ONLY the full revised proposal with the requested changes applied.' },
          { role: 'user', content: userMsg },
        ],
        temperature: 0.5,
        max_tokens: 4000,
      },
      { headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' } }
    );

    return NextResponse.json({ success: true, proposal: response.data.choices[0].message.content });
  } catch (error) {
    const msg = (error as any)?.response?.data?.error?.message;
    console.error('Error adjusting proposal:', (error as any)?.response?.data || error);
    return NextResponse.json({ success: false, error: msg || 'Failed to adjust proposal' }, { status: 500 });
  }
}
