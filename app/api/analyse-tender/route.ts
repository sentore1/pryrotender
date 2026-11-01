import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { supabase } from '@/lib/supabase';
import { callGroq, hasGroqKey } from '@/lib/groq-client';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent';
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

async function extractTextFromScannedPDF(buffer: Buffer): Promise<string> {
  const errors: string[] = [];

  // Render PDF pages to base64 JPEGs via a standalone child process.
  // Running outside the Next.js bundle means pdfjs instanceof checks work correctly
  // against the real canvas module, not a bundled copy.
  let pageImages: string[] = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { execFileSync } = require('child_process');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { resolve } = require('path');
    // Build the path at runtime via eval so Turbopack can't statically resolve
    // the string literal as a module import (which causes a build warning/error).
    // The script runs as a child process — it's not bundled, only resolved at runtime.
    const scriptPath = eval('resolve(process.cwd(), "scripts", "pdf-render.mjs")');
    const input = JSON.stringify({ pdfBase64: buffer.toString('base64'), maxPages: 10 });
    const output = execFileSync('node', [scriptPath], {
      input,
      encoding: 'utf8',
      timeout: 60000,
      maxBuffer: 100 * 1024 * 1024, // 100 MB — large PDFs produce large base64
    });
    pageImages = JSON.parse(output);
  } catch (err: any) {
    const msg = err?.stderr || err?.message || String(err);
    throw new Error(`PDF rendering failed: ${msg}`);
  }

  if (pageImages.length === 0) throw new Error('PDF rendering produced no pages');

  // OCR each page via Gemini Vision (free tier, excellent document OCR)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error('GEMINI_API_KEY not configured');

  for (let i = 0; i < pageImages.length; i++) {
    const pageNum = i + 1;
    try {
      const res = await axios.post(
        `${GEMINI_API_URL}?key=${geminiKey}`,
        {
          contents: [{
            parts: [
              { text: `Extract ALL text from page ${pageNum} of this document exactly as it appears. Include all headings, bullet points, tables, and body text. Return only the raw extracted text, no commentary.` },
              { inlineData: { mimeType: 'image/jpeg', data: pageImages[i] } },
            ],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 4000 },
        },
        { headers: { 'Content-Type': 'application/json' } }
      );
      const text = res.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      pageImages[i] = `--- Page ${pageNum} ---\n${text}`;
    } catch (pageErr: any) {
      const msg = pageErr?.response?.data?.error?.message || pageErr?.message || String(pageErr);
      console.error(`Gemini OCR page ${pageNum} error:`, msg);
      errors.push(`Page ${pageNum}: ${msg}`);
      pageImages[i] = '';
    }
  }

  const pageTexts = pageImages.filter(Boolean);
  if (pageTexts.length === 0) {
    throw new Error(`All pages failed OCR: ${errors.filter(Boolean).join('; ')}`);
  }
  return pageTexts.join('\n\n');
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
    if (file.size > MAX_BYTES) return NextResponse.json({ success: false, error: 'File too large. Maximum 10MB.' }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ success: false, error: 'Invalid file type.' }, { status: 400 });

    let tenderText = '';
    let extractionError = '';
    if (file.type === 'application/pdf') {
      const buffer = Buffer.from(await file.arrayBuffer());
      try {
        process.env.PDF_PARSE_NO_NATIVE = '1';
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require('pdf-parse/lib/pdf-parse.js');
        const pdfParse = typeof mod === 'function' ? mod : (mod.default ?? mod);
        const parsed = await pdfParse(buffer);
        tenderText = parsed.text?.trim() || '';
        console.log('pdf-parse extracted chars:', tenderText.length);
      } catch (e: any) {
        extractionError = e?.message || String(e);
        console.error('pdf-parse error:', e);
      }

      // Image-based PDF fallback: render pages as images and OCR via vision model
      if (!tenderText) {
        if (!hasGroqKey()) return NextResponse.json({ success: false, error: 'AI service not configured' }, { status: 500 });
        try {
          tenderText = await extractTextFromScannedPDF(buffer);
        } catch (ocrErr: any) {
          extractionError = ocrErr?.message || String(ocrErr);
          console.error('OCR fallback failed:', extractionError);
        }
      }
    } else {
      tenderText = await file.text();
    }

    if (!tenderText.trim()) return NextResponse.json({
      success: false,
      error: `Could not extract text from this PDF. It may be a scanned document that could not be processed. Details: ${extractionError || 'unknown error'}`,
    }, { status: 400 });

    // Load profile using verified user.id (not from request body)
    let companyContext = '';
    const { data: profile } = await supabase.from('profiles').select('company_name,company_address,company_phone,company_website').eq('id', user.id).single();
    const { data: notif } = await supabase.from('notification_preferences').select('keywords,categories').eq('user_id', user.id).single();
    if (profile) companyContext = `Company: ${profile.company_name || 'N/A'}, Address: ${profile.company_address || 'N/A'}, Website: ${profile.company_website || 'N/A'}`;
    if (notif?.categories?.length) companyContext += `\nExpertise areas: ${notif.categories.join(', ')}`;
    if (notif?.keywords?.length) companyContext += `\nKeywords/specialties: ${notif.keywords.join(', ')}`;

    if (!hasGroqKey()) return NextResponse.json({ success: false, error: 'AI service not configured' }, { status: 500 });

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

    const analysis = await callGroq({
      model: 'qwen/qwen3.8-27b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 4000,
    });

    return NextResponse.json({ success: true, analysis });
  } catch (error: any) {
    console.error('Tender analysis error:', error);
    return NextResponse.json({ success: false, error: 'Failed to analyse tender' }, { status: 500 });
  }
}
