import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function POST(request: NextRequest) {
  try {
    const { proposal, instruction } = await request.json();
    if (!proposal || !instruction) {
      return NextResponse.json({ success: false, error: 'Missing proposal or instruction' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'your_groq_api_key_here') {
      return NextResponse.json({ success: true, proposal: `[Adjustment: "${instruction}"]\n\n${proposal}` });
    }

    const response = await axios.post(
      GROQ_API_URL,
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are an expert proposal editor. When given a proposal and an instruction, return ONLY the full revised proposal text with the requested changes applied. Do not add commentary outside the proposal.',
          },
          {
            role: 'user',
            content: `Here is the current proposal:\n\n${proposal}\n\nInstruction: ${instruction}\n\nReturn the full revised proposal.`,
          },
        ],
        temperature: 0.5,
        max_tokens: 8000,
      },
      { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
    );

    return NextResponse.json({ success: true, proposal: response.data.choices[0].message.content });
  } catch (error) {
    console.error('Error adjusting proposal:', error);
    return NextResponse.json({ success: false, error: 'Failed to adjust proposal' }, { status: 500 });
  }
}
