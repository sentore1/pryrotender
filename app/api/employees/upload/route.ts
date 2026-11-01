import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { callGroq, hasGroqKey } from '@/lib/groq-client';

const MAX_BYTES = 10 * 1024 * 1024;

async function extractText(pdfBytes: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('pdf-parse/lib/pdf-parse.js');
    const pdfParse = typeof mod === 'function' ? mod : (mod.default ?? mod);
    const parsed = await pdfParse(pdfBytes);
    return parsed.text?.trim() || '';
  } catch { return ''; }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file   = formData.get('file')   as File | null;
    const userId = formData.get('userId') as string | null;

    if (!file || !userId)
      return NextResponse.json({ success: false, error: 'Missing file or userId' }, { status: 400 });
    if (file.size > MAX_BYTES)
      return NextResponse.json({ success: false, error: 'File too large. Maximum 10MB.' }, { status: 400 });

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf)
      return NextResponse.json({ success: false, error: 'Please upload a PDF file.' }, { status: 400 });

    if (!hasGroqKey())
      return NextResponse.json({ success: false, error: 'AI service not configured' }, { status: 500 });

    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    const cvText   = await extractText(pdfBuffer);

    if (!cvText)
      return NextResponse.json({ success: false, error: 'Could not read text from this PDF.' }, { status: 400 });

    // Ask AI to extract structured info from the CV
    const prompt = `You are reading a CV/resume. Extract the following and return ONLY a valid JSON object:
{
  "name": "Full name of the person",
  "role": "Their current or most recent job title / role",
  "bio": "A 2-3 sentence professional summary describing their background, skills, and experience",
  "skills": ["skill1", "skill2", "skill3"],
  "experience_years": "estimated years of experience as a number or string"
}

No markdown, no explanation. Just the JSON object.

CV TEXT:
${cvText.slice(0, 12000)}`;

    const content = await callGroq(
      { model: 'openai/gpt-oss-120b', messages: [{ role: 'user', content: prompt }], temperature: 0.1, max_tokens: 1000 }
    );

    const raw = content.trim()
      .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let parsed: { name: string; role: string; bio: string; skills: string[]; experience_years: string } = {
      name: '', role: '', bio: '', skills: [], experience_years: '',
    };
    try { parsed = JSON.parse(raw); } catch { /* use defaults */ }

    // Upload CV file to company-assets bucket
    const admin   = supabaseAdmin();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${userId}/cvs/${Date.now()}_${safeName}`;

    const { error: uploadError } = await admin.storage
      .from('company-assets')
      .upload(filePath, pdfBuffer, { contentType: 'application/pdf', upsert: false });

    if (uploadError)
      return NextResponse.json({ success: false, error: `Storage error: ${uploadError.message}` }, { status: 500 });

    const { data: urlData } = admin.storage.from('company-assets').getPublicUrl(filePath);
    const cvUrl = urlData.publicUrl;

    // Save employee record to Supabase
    const { data: employee, error: dbError } = await admin
      .from('employees')
      .insert({
        user_id:          userId,
        name:             parsed.name   || file.name.replace(/\.[^.]+$/, ''),
        role:             parsed.role   || '',
        bio:              parsed.bio    || '',
        skills:           parsed.skills || [],
        experience_years: parsed.experience_years || '',
        cv_url:           cvUrl,
        cv_path:          filePath,
      })
      .select()
      .single();

    if (dbError)
      return NextResponse.json({ success: false, error: `DB error: ${dbError.message}` }, { status: 500 });

    return NextResponse.json({ success: true, employee, parsed });

  } catch (error: any) {
    console.error('Employee upload error:', error?.response?.data ?? error?.message ?? error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to process CV' }, { status: 500 });
  }
}
