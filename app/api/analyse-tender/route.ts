import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { supabase } from '@/lib/supabase';
import { timingSafeEqual } from 'crypto';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

function isValidKey(key: string) {
  const placeholder = 'your_groq_api_key_here';
  if (key.length !== placeholder.length) return key.length > 10;
  try { return !timingSafeEqual(Buffer.from(key), Buffer.from(placeholder)); } catch { return true; }
}

async function extractTextFromScannedPDF(buffer: Buffer, apiKey: string): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs' as any);
    await import('pdfjs-dist/legacy/build/pdf.worker.mjs' as any);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createCanvas, Image } = require('canvas');

    // Provide a NodeCanvasFactory so pdfjs uses node-canvas for all image ops
    const NodeCanvasFactory = {
      create(width: number, height: number) {
        const canvas = createCanvas(width, height);
        return { canvas, context: canvas.getContext('2d') };
      },
      reset(canvasAndCtx: any, width: number, height: number) {
        canvasAndCtx.canvas.width = width;
        canvasAndCtx.canvas.height = height;
      },
      destroy(canvasAndCtx: any) {
        canvasAndCtx.canvas.width = 0;
        canvasAndCtx.canvas.height = 0;
      },
    };

    // Patch global Image so pdfjs inline image rendering works in Node
    (global as any).Image = Image;

    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer), canvasFactory: NodeCanvasFactory });
    const pdf = await loadingTask.promise;
    const numPages = Math.min(pdf.numPages, 5);
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvasAndCtx = NodeCanvasFactory.create(viewport.width, viewport.height);
      await page.render({ canvasContext: canvasAndCtx.context, viewport, canvasFactory: NodeCanvasFactory }).promise;
      const base64 = canvasAndCtx.canvas.toDataURL('image/jpeg', 0.85).split(',')[1];

      const res = await axios.post(
        GROQ_API_URL,
        {
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [{ role: 'user', content: [
            { type: 'text', text: `Extract all text from page ${pageNum} of this document. Return only the raw text.` },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
          ]}],
          temperature: 0.1,
          max_tokens: 4000,
        },
        { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
      );
      pageTexts.push(res.data.choices[0].message.content);
    }
    return pageTexts.join('\n\n');
  } catch (err) {
    console.error('Vision OCR error:', err);
    return '';
  }
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
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey || !isValidKey(apiKey)) return NextResponse.json({ success: false, error: 'AI service not configured' }, { status: 500 });
        tenderText = await extractTextFromScannedPDF(buffer, apiKey);
      }
    } else {
      tenderText = await file.text();
    }

    if (!tenderText.trim()) return NextResponse.json({ success: false, error: `Could not extract text from file. Debug: ${extractionError}` }, { status: 400 });

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
