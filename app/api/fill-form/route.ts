import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { supabase } from '@/lib/supabase';
import { timingSafeEqual } from 'crypto';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'text/plain'];

function isValidKey(key: string) {
  const placeholder = 'your_groq_api_key_here';
  if (key.length !== placeholder.length) return key.length > 10;
  try { return !timingSafeEqual(Buffer.from(key), Buffer.from(placeholder)); } catch { return true; }
}

export async function POST(request: NextRequest) {
  try {
    // Verify session from cookie
    const token = request.cookies.get('sb-access-token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ success: false, error: 'File too large. Maximum 5MB.' }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ success: false, error: 'Invalid file type.' }, { status: 400 });

    let formText = '';
    if (file.type === 'application/pdf') {
      const buffer = Buffer.from(await file.arrayBuffer());
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('pdf-parse/lib/pdf-parse.js');
      const pdfParse = typeof mod === 'function' ? mod : (mod.default ?? mod);
      const parsed = await pdfParse(buffer);
      formText = parsed.text;
    } else {
      formText = await file.text();
    }

    if (!formText.trim()) return NextResponse.json({ success: false, error: 'Could not extract text from file' }, { status: 400 });

    // Load profile using verified user.id (not from request body)
    const { data: profile } = await supabase.from('profiles').select('company_name,company_address,company_phone,company_website,company_ref_prefix').eq('id', user.id).single();

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || !isValidKey(apiKey)) return NextResponse.json({ success: false, error: 'AI service not configured' }, { status: 500 });

    const companyContext = profile
      ? `COMPANY PROFILE (use this to fill fields):\nName: ${profile.company_name || ''}\nAddress: ${profile.company_address || ''}\nPhone: ${profile.company_phone || ''}\nWebsite: ${profile.company_website || ''}\nRef Prefix: ${profile.company_ref_prefix || ''}\n\n`
      : '';

    const prompt = `You are a form-filling assistant. The user has uploaded a form document. Your job is to:
1. Identify all fields/questions in the form
2. Fill in what you can using the company profile provided
3. For fields you cannot fill, provide clear guidance on what information is needed

${companyContext}FORM DOCUMENT:
${formText.slice(0, 10000)}

Respond in this exact markdown format:

## Form Summary
Brief description of what this form is for.

## Filled Fields
List every field you can fill with the company data:
| Field | Suggested Value | Source |
|-------|----------------|--------|

## Fields Requiring Input
List fields that need manual input from the user:
| Field | What to Provide | Tips |
|-------|----------------|------|

## Completed Form Draft
Provide a clean filled-out version of the form with all known fields populated and [FILL IN: description] placeholders for unknown fields.

## Missing Information Needed
Bullet list of specific information the user must gather before submitting.`;

    const response = await axios.post(
      GROQ_API_URL,
      { model: 'qwen/qwen3.8-27b', messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 4000 },
      { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
    );

    return NextResponse.json({ success: true, result: response.data.choices[0].message.content });
  } catch (error: any) {
    console.error('Form fill error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process form' }, { status: 500 });
  }
}
