import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { callGroq, hasGroqKey } from '@/lib/groq-client';

const MAX_BYTES = 10 * 1024 * 1024;

// ─── Auth: same robust token extraction as other routes ──────────────────
function extractToken(request: NextRequest): string | null {
  // 1. Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);

  const allCookies = request.cookies.getAll();

  // 2. Plain sb-access-token cookie
  const plain = allCookies.find(c => c.name === 'sb-access-token');
  if (plain?.value && plain.value.length > 20) {
    try { const p = JSON.parse(decodeURIComponent(plain.value)); if (p?.access_token) return p.access_token; } catch { /* raw token */ }
    return plain.value;
  }

  // 3. Standard Supabase SSR cookie (single or chunked)
  const base = allCookies.find(c => /^sb-.+-auth-token$/.test(c.name));
  if (base) {
    try { const p = JSON.parse(decodeURIComponent(base.value)); if (p?.access_token) return p.access_token; } catch { if (base.value.length > 20) return base.value; }
  }

  // 4. Chunked cookies
  const chunks = allCookies
    .filter(c => /^sb-.+-auth-token\.\d+$/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (chunks.length) {
    try { const p = JSON.parse(decodeURIComponent(chunks.map(c => c.value).join(''))); if (p?.access_token) return p.access_token; } catch {}
  }

  return null;
}

function supabaseWithToken(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

// ─── Build profile context ───────────────────────────────────────────────
function buildProfile(profile: any) {
  const formerClientsText = Array.isArray(profile?.former_clients)
    ? profile.former_clients.map((c: any) => `${c.name}${c.project ? ` (${c.project})` : ''}`).join('; ')
    : '';
  const requiredDocsText = Array.isArray(profile?.required_documents)
    ? profile.required_documents.join(', ')
    : '';

  const fields: [string, string][] = [
    ['Company Name',        profile?.company_name    || ''],
    ['Address',             profile?.company_address || ''],
    ['Phone',               profile?.company_phone   || ''],
    ['Email',               profile?.company_email   || ''],
    ['Website',             profile?.company_website || ''],
    ['Reference Prefix',    profile?.company_ref_prefix || ''],
    ['Company Bio',         profile?.company_bio     || ''],
    ['Former Clients',      formerClientsText],
    ['Available Documents', requiredDocsText],
  ];

  const filled  = fields.filter(([, v]) => v.trim() !== '');
  const missing = ['company_name','company_address','company_phone','company_email','company_website','company_ref_prefix']
    .filter(k => !profile?.[k] || String(profile[k]).trim() === '')
    .map(k => k.replace(/^company_/, '').replace(/_/g, ' '));

  const block = filled.length > 0
    ? filled.map(([k, v]) => `${k}: ${v}`).join('\n')
    : '(No profile data available — please fill in Settings first)';

  return { block, missing, hasData: filled.length > 0 };
}

// ─── Extract plain text ──────────────────────────────────────────────────
async function extractPlainText(pdfBytes: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('pdf-parse/lib/pdf-parse.js');
    const pdfParse = typeof mod === 'function' ? mod : (mod.default ?? mod);
    const parsed = await pdfParse(pdfBytes);
    return parsed.text?.trim() || '';
  } catch { return ''; }
}

// ─── Extract text items with precise positions ───────────────────────────
interface TextItem {
  text: string; x: number; y: number; w: number;
  page: number; pageH: number; fontSize: number;
  r: number; g: number; b: number; // text color 0-1
}

async function extractTextItems(pdfBytes: Buffer): Promise<TextItem[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfjsLib = require('pdfjs-dist/build/pdf.js');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfBytes),
    useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true,
  }).promise;

  const items: TextItem[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page    = await pdf.getPage(p);
    const content = await page.getTextContent({ includeMarkedContent: false });
    const vp      = page.getViewport({ scale: 1 });
    for (const item of content.items as any[]) {
      if (!item.str?.trim()) continue;
      const [a, , , d, x, y] = item.transform;
      const fontSize = Math.abs(d) || Math.abs(a) || 10;
      // text color — pdfjs exposes via item.color as [r,g,b] 0-255, fallback black
      const col = item.color ?? [0, 0, 0];
      items.push({
        text: item.str, x, y,
        w: item.width || 0,
        page: p, pageH: vp.height, fontSize,
        r: col[0] / 255, g: col[1] / 255, b: col[2] / 255,
      });
    }
  }
  return items;
}

// ─── Ask AI: map every [INSERT ...] placeholder → value ──────────────────
async function getPlaceholderMap(
  formText: string, profileBlock: string,
): Promise<Record<string, string>> {

  const prompt = `You are filling a PDF form on behalf of a company. The form has placeholder tokens inside brackets like [INSERT COMPANY NAME], [Insert Organization / Business Name], [INSERT REF NUMBER], [Insert Date], etc.

YOUR JOB:
1. Find EVERY placeholder token in the form text (anything inside square brackets that looks like a field to fill).
2. Map each one to the best value from the company profile.
3. For placeholders the profile cannot answer (dates, ref numbers, timeframes), use empty string "".
4. Return ONLY a valid JSON object. Keys are the EXACT placeholder strings including brackets. Values are replacement strings.
5. No markdown, no explanation.

COMPANY PROFILE:
${profileBlock}

FORM TEXT:
${formText.slice(0, 14000)}

Return JSON only:`;

  const content = await callGroq(
    { model: 'openai/gpt-oss-120b', messages: [{ role: 'user', content: prompt }], temperature: 0.1, max_tokens: 3000 }
  );

  const raw = content.trim()
    .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try {
    return JSON.parse(raw);
  } catch {
    console.error('Placeholder map parse error:', raw.slice(0, 400));
    return {};
  }
}

// ─── Fill AcroForm interactive fields ────────────────────────────────────
async function fillAcroForm(
  pdfDoc: PDFDocument, profileBlock: string, formText: string,
): Promise<number> {
  const form   = pdfDoc.getForm();
  const fields = form.getFields();
  if (fields.length === 0) return 0;

  const fieldNames = fields.map(f => f.getName());
  const prompt = `Map each PDF form field name to the correct value from the company profile.
Return ONLY a valid JSON object. Keys = exact field names. Values = fill values. Use "" for unknown fields. No markdown.

COMPANY PROFILE:
${profileBlock}

FORM TEXT (context):
${formText.slice(0, 4000)}

FIELD NAMES:
${fieldNames.join('\n')}

JSON:`;

  const content = await callGroq(
    { model: 'openai/gpt-oss-120b', messages: [{ role: 'user', content: prompt }], temperature: 0.1, max_tokens: 2000 }
  );

  const raw = content.trim()
    .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  let fieldMap: Record<string, string> = {};
  try { fieldMap = JSON.parse(raw); } catch { /* skip */ }

  let filled = 0;
  for (const field of fields) {
    const value = fieldMap[field.getName()];
    if (!value?.trim()) continue;
    try {
      const ctor = field.constructor.name;
      if (ctor === 'PDFTextField') { (field as any).setText(value); filled++; }
      else if (ctor === 'PDFCheckBox') {
        if (['yes','true','x','1'].includes(value.toLowerCase())) { (field as any).check(); filled++; }
      }
    } catch { /* skip */ }
  }
  try { form.flatten(); } catch { /* non-critical */ }
  return filled;
}

// ─── Overlay: replace placeholder text at exact coordinates ──────────────
async function overlayPlaceholders(
  pdfDoc: PDFDocument,
  items: TextItem[],
  placeholderMap: Record<string, string>,
): Promise<number> {
  if (Object.keys(placeholderMap).length === 0) return 0;

  const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages    = pdfDoc.getPages();
  let filled = 0;

  const norm = (s: string) => s.replace(/[\[\]\s]/g, '').toLowerCase();

  const normMap = new Map<string, { key: string; value: string }>();
  for (const [k, v] of Object.entries(placeholderMap)) {
    if (v?.trim()) normMap.set(norm(k), { key: k, value: v });
  }

  // Determine erase bg and text color based on original text color
  // Light text (white/near-white) = dark background → erase with same dark color
  const getColors = (item: TextItem): { bg: ReturnType<typeof rgb>; fg: ReturnType<typeof rgb> } => {
    const brightness = item.r * 0.299 + item.g * 0.587 + item.b * 0.114;
    if (brightness > 0.7) {
      // Light text on dark bg — use same color as text for the replacement
      return { bg: rgb(item.r, item.g, item.b), fg: rgb(item.r, item.g, item.b) };
    }
    // Dark/colored text on light bg
    return { bg: rgb(1, 1, 1), fg: rgb(item.r, item.g, item.b) };
  };

  const drawReplacement = (
    page: ReturnType<typeof pages[0]['constructor']['prototype']['constructor']>,
    item: TextItem,
    value: string,
    eraseW: number,
  ) => {
    const { width, height } = (page as any).getSize();
    const fs  = Math.max(7, Math.min(item.fontSize, 18));
    const x   = Math.max(2, Math.min(item.x, width - 4));
    const y   = Math.max(2, Math.min(item.y, height - 4));
    const { bg, fg } = getColors(item);
    const actualW = Math.min(Math.max(eraseW, value.length * fs * 0.55 + 6), width - x + 2);

    (page as any).drawRectangle({ x: x - 1, y: y - 2, width: actualW, height: fs + 5, color: bg, opacity: 1 });
    (page as any).drawText(value, { x, y, size: fs, font: boldFont, color: fg, maxWidth: width - x - 2 });
  };

  // Pass 1: single item match
  const usedItems = new Set<number>();
  for (let idx = 0; idx < items.length; idx++) {
    const item  = items[idx];
    const match = normMap.get(norm(item.text));
    if (!match) continue;
    const pageIdx = item.page - 1;
    if (pageIdx < 0 || pageIdx >= pages.length) continue;
    drawReplacement(pages[pageIdx] as any, item, match.value, item.w + 8);
    usedItems.add(idx);
    filled++;
  }

  // Pass 2: multi-item span match (same page, same y ±2pt)
  const lineGroups = new Map<string, TextItem[]>();
  for (let idx = 0; idx < items.length; idx++) {
    if (usedItems.has(idx)) continue;
    const item = items[idx];
    const key  = `${item.page}:${Math.round(item.y / 2) * 2}`;
    if (!lineGroups.has(key)) lineGroups.set(key, []);
    lineGroups.get(key)!.push(item);
  }

  for (const lineItems of lineGroups.values()) {
    lineItems.sort((a, b) => a.x - b.x);
    for (let start = 0; start < lineItems.length; start++) {
      for (let end = start + 1; end <= Math.min(start + 10, lineItems.length); end++) {
        const span     = lineItems.slice(start, end);
        const spanText = span.map(i => i.text).join('');
        const match    = normMap.get(norm(spanText));
        if (!match) continue;

        const first  = span[0];
        const last   = span[span.length - 1];
        const pageIdx = first.page - 1;
        if (pageIdx < 0 || pageIdx >= pages.length) continue;
        const spanW = (last.x + last.w) - first.x;
        drawReplacement(pages[pageIdx] as any, first, match.value, spanW + 6);
        filled++;
        break;
      }
    }
  }

  return filled;
}

// ─── Route handler ────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const token = extractToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    // Authenticate with the user's token
    const sb = supabaseWithToken(token);
    const { data: { user }, error: authError } = await sb.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ success: false, error: 'File too large. Maximum 10MB.' }, { status: 400 });

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) return NextResponse.json({ success: false, error: 'Please upload a PDF file.' }, { status: 400 });

    if (!hasGroqKey()) return NextResponse.json({ success: false, error: 'AI service not configured' }, { status: 500 });

    const pdfBuffer = Buffer.from(await file.arrayBuffer());

    // Load profile — try user client first, fall back to service role if RLS blocks it
    let { data: profileData } = await sb
      .from('profiles')
      .select('company_name,company_address,company_phone,company_email,company_website,company_ref_prefix,company_bio,required_documents,former_clients')
      .eq('id', user.id)
      .single();

    // If RLS blocked the read, use service role
    if (!profileData) {
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data } = await admin
        .from('profiles')
        .select('company_name,company_address,company_phone,company_email,company_website,company_ref_prefix,company_bio,required_documents,former_clients')
        .eq('id', user.id)
        .single();
      profileData = data;
    }

    console.log('[fill-form] user:', user.id, '| profile company_name:', profileData?.company_name);

    const { block: profileBlock, missing: missingFields, hasData } = buildProfile(profileData);

    console.log('[fill-form] profile block:', profileBlock);

    // Extract text
    const [formText, textItems] = await Promise.all([
      extractPlainText(pdfBuffer),
      extractTextItems(pdfBuffer),
    ]);

    console.log('[fill-form] formText length:', formText.length, '| textItems:', textItems.length);

    if (!formText && textItems.length === 0) {
      return NextResponse.json({ success: false, error: 'Could not read text from this PDF. It may be a scanned/image-only PDF.' }, { status: 400 });
    }

    // Load PDF doc for editing
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });

    // Run both AI calls in parallel
    const [acroFilled, placeholderMap] = await Promise.all([
      fillAcroForm(pdfDoc, profileBlock, formText),
      getPlaceholderMap(formText || textItems.map(i => i.text).join(' '), profileBlock),
    ]);

    console.log('[fill-form] acroFilled:', acroFilled, '| placeholderMap keys:', Object.keys(placeholderMap).length);
    console.log('[fill-form] placeholderMap:', JSON.stringify(placeholderMap).slice(0, 600));

    const placeholdersFilled = await overlayPlaceholders(pdfDoc, textItems, placeholderMap);
    const totalFilled = acroFilled + placeholdersFilled;

    console.log('[fill-form] placeholdersFilled:', placeholdersFilled, '| total:', totalFilled);

    const pdfBytes = await pdfDoc.save();
    const base64   = Buffer.from(pdfBytes).toString('base64');

    return NextResponse.json({
      success: true,
      pdf: base64,
      fieldCount: totalFilled,
      acroFilled,
      placeholdersFilled,
      skippedCount: Object.values(placeholderMap).filter(v => !v?.trim()).length,
      profileCompleteness: { missing: missingFields, hasData },
    });

  } catch (error: any) {
    console.error('Form fill error:', error?.response?.data ?? error?.message ?? error);
    const msg = error?.response?.data?.error?.message || error?.message || 'Failed to process form';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
