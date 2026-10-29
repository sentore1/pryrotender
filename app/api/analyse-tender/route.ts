import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { supabase } from '@/lib/supabase';
import { timingSafeEqual } from 'crypto';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

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

    let tenderText = '';
    if (file.type === 'application/pdf') {
      const buffer = Buffer.from(await file.arrayBuffer());
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('pdf-parse/lib/pdf-parse.js');
      const pdfParse = typeof mod === 'function' ? mod : (mod.default ?? mod);
      const parsed = await pdfParse(buffer);
      tenderText = parsed.text;
    } else {
      tenderText = await file.text();
    }

    if (!tenderText.trim()) return NextResponse.json({ success: false, error: 'Could not extract text from file' }, { status: 400 });

    // Load profile using verified user.id (not from request body)
    let companyContext = '';
    const { data: profile } = await supabase.from('profiles').select('company_name,company_address,company_phone,company_website').eq('id', user.id).single();
    const { data: notif } = await supabase.from('notification_preferences').select('keywords,categories').eq('user_id', user.id).single();
    if (profile) companyContext = `Company: ${profile.company_name || 'N/A'}, Address: ${profile.company_address || 'N/A'}, Website: ${profile.company_website || 'N/A'}`;
    if (notif?.categories?.length) companyContext += `\nExpertise areas: ${notif.categories.join(', ')}`;
    if (notif?.keywords?.length) companyContext += `\nKeywords/specialties: ${notif.keywords.join(', ')}`;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || !isValidKey(apiKey)) return NextResponse.json({ success: false, error: 'AI service not configured' }, { status: 500 });

    const prompt = `You are a tender analysis expert. Analyse the following tender document and provide a structured assessment.

${companyContext ? `COMPANY PROFILE:\n${companyContext}\n\n` : ''}TENDER DOCUMENT:
${tenderText.slice(0, 12000)}

Provide analysis in this exact markdown format:

## Tender Overview
Brief summary, issuing organization, and deadline if mentioned.

## Eligibility Assessment
${companyContext ? 'Based on the company profile above, assess eligibility.' : 'List key eligibility requirements.'}
- **Eligible:** Yes / No / Partially
- Key requirements and whether they are likely met

## Key Requirements
List the most critical technical and financial requirements as bullet points.

## Win Probability
**Score: X/10**
Explain the score based on requirements complexity and fit.

## Risks & Challenges
| Risk | Severity | Mitigation |
|------|----------|------------|

## Recommended Actions
Step-by-step actions to prepare a winning bid.

## Documents Required
List all documents needed for this tender.

## Budget Estimate
Rough budget range estimate if determinable.`;

    const response = await axios.post(
      GROQ_API_URL,
      { model: 'qwen/qwen3.8-27b', messages: [{ role: 'user', content: prompt }], temperature: 0.4, max_tokens: 4000 },
      { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
    );

    return NextResponse.json({ success: true, analysis: response.data.choices[0].message.content });
  } catch (error: any) {
    console.error('Tender analysis error:', error);
    return NextResponse.json({ success: false, error: 'Failed to analyse tender' }, { status: 500 });
  }
}
