import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'crypto';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_BYTES = 10 * 1024 * 1024;

function isValidKey(key: string) {
  const placeholder = 'your_groq_api_key_here';
  if (key.length !== placeholder.length) return key.length > 10;
  try { return !timingSafeEqual(Buffer.from(key), Buffer.from(placeholder)); } catch { return true; }
}

// ─── Auth ────────────────────────────────────────────────────────────────
function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  const allCookies = request.cookies.getAll();
  const plain = allCookies.find(c => c.name === 'sb-access-token');
  if (plain?.value && plain.value.length > 20) {
    try { const p = JSON.parse(decodeURIComponent(plain.value)); if (p?.access_token) return p.access_token; } catch { /**/ }
    return plain.value;
  }
  const base = allCookies.find(c => /^sb-.+-auth-token$/.test(c.name));
  if (base) {
    try { const p = JSON.parse(decodeURIComponent(base.value)); if (p?.access_token) return p.access_token; } catch { if (base.value.length > 20) return base.value; }
  }
  const chunks = allCookies.filter(c => /^sb-.+-auth-token\.\d+$/.test(c.name)).sort((a, b) => a.name.localeCompare(b.name));
  if (chunks.length) {
    try { const p = JSON.parse(decodeURIComponent(chunks.map(c => c.value).join(''))); if (p?.access_token) return p.access_token; } catch {}
  }
  return null;
}

function sbWithToken(token: string) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

// ─── Extract plain text from PDF ─────────────────────────────────────────
async function extractText(pdfBytes: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('pdf-parse/lib/pdf-parse.js');
    const pdfParse = typeof mod === 'function' ? mod : (mod.default ?? mod);
    const parsed = await pdfParse(pdfBytes);
    return parsed.text?.trim() || '';
  } catch { return ''; }
}

// ─── Field type returned to client ───────────────────────────────────────
export interface FormField {
  id: string;
  label: string;       // human-readable label e.g. "Company Name"
  placeholder: string; // original token e.g. "[INSERT COMPANY NAME]"
  value: string;       // AI-filled value from profile, or '' if unknown
  section: string;     // section heading this field belongs to
  required: boolean;   // true if AI could fill it, false if needs manual input
}

export async function POST(request: NextRequest) {
  try {
    const token = extractToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const sb = sbWithToken(token);
    const { data: { user }, error: authError } = await sb.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ success: false, error: 'File too large.' }, { status: 400 });

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) return NextResponse.json({ success: false, error: 'Please upload a PDF.' }, { status: 400 });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || !isValidKey(apiKey)) return NextResponse.json({ success: false, error: 'AI not configured' }, { status: 500 });

    // Load profile — user client first, service role fallback
    let { data: profile } = await sb.from('profiles')
      .select('company_name,company_address,company_phone,company_email,company_website,company_ref_prefix,company_bio,required_documents,former_clients')
      .eq('id', user.id).single();
    if (!profile) {
      const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { data } = await admin.from('profiles')
        .select('company_name,company_address,company_phone,company_email,company_website,company_ref_prefix,company_bio,required_documents,former_clients')
        .eq('id', user.id).single();
      profile = data;
    }

    const formerClients = Array.isArray(profile?.former_clients)
      ? profile.former_clients.map((c: any) => `${c.name}${c.project ? ` (${c.project})` : ''}`).join('; ') : '';
    const requiredDocs = Array.isArray(profile?.required_documents)
      ? profile.required_documents.join(', ') : '';

    const profileLines = [
      ['Company Name',     profile?.company_name    || ''],
      ['Address',          profile?.company_address || ''],
      ['Phone',            profile?.company_phone   || ''],
      ['Email',            profile?.company_email   || ''],
      ['Website',          profile?.company_website || ''],
      ['Ref Prefix',       profile?.company_ref_prefix || ''],
      ['Company Bio',      profile?.company_bio     || ''],
      ['Former Clients',   formerClients],
      ['Documents',        requiredDocs],
    ].filter(([, v]) => v.trim() !== '');

    const profileBlock = profileLines.length
      ? profileLines.map(([k, v]) => `${k}: ${v}`).join('\n')
      : '(No profile data)';

    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    const formText  = await extractText(pdfBuffer);

    if (!formText) return NextResponse.json({ success: false, error: 'Could not read text from PDF.' }, { status: 400 });

    // Load employees for this user
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: employees } = await admin
      .from('employees')
      .select('name,role,bio,skills,experience_years,cv_url')
      .eq('user_id', user.id);

    const employeeBlock = employees?.length
      ? '\n\nTEAM MEMBERS / STAFF CVs:\n' + employees.map((e: any) =>
          `- ${e.name} (${e.role}): ${e.bio || ''} Skills: ${(e.skills || []).join(', ')}. CV: ${e.cv_url}`
        ).join('\n')
      : '';

    // Ask AI to extract all fields and fill them
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const prompt = `You are an expert procurement assistant filling out a tender/RFP form on behalf of a company. Your job is to fill EVERY field intelligently.

RULES:
1. Find every placeholder in [brackets] — these are fields to fill.
2. Use the company profile for any company-related fields.
3. For fields NOT in the profile (dates, ref numbers, timeframes, numbers), use your intelligence:
   - Dates: use today's date ${today} or reasonable future dates (e.g. submission deadline = 30 days from today)
   - Reference numbers: compose from company ref prefix + year + sequence (e.g. "PRYRO/RFP/2026/001")
   - Currency: use RWF (Rwandan Francs) or USD as appropriate
   - Timeframes: suggest reasonable ones (e.g. "6 months", "3 months")
   - Numbers of users/references: suggest reasonable numbers (e.g. "10", "3")
   - Contract type: keep as-is if it's a choice field
4. NEVER leave a value empty — always fill something intelligent.
5. Return ONLY a valid JSON array. Each element:
{
  "id": "unique_snake_case_id",
  "label": "Human readable field name",
  "placeholder": "[EXACT PLACEHOLDER TEXT]",
  "value": "your filled value",
  "section": "Section name from the form",
  "filled": true
}

COMPANY PROFILE:
${profileBlock}${employeeBlock}

TODAY'S DATE: ${today}

FORM TEXT:
${formText.slice(0, 14000)}

JSON array only:`;

    const res = await axios.post(
      GROQ_API_URL,
      { model: 'openai/gpt-oss-120b', messages: [{ role: 'user', content: prompt }], temperature: 0.1, max_tokens: 4000 },
      { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
    );

    const raw = res.data.choices[0].message.content.trim()
      .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let fields: any[] = [];
    try { fields = JSON.parse(raw); } catch { return NextResponse.json({ success: false, error: 'AI could not parse the form.' }, { status: 500 }); }

    // Ensure unique IDs
    fields = fields.map((f: any, i: number) => ({ ...f, id: f.id || `field_${i}` }));

    const missing = ['company_name','company_address','company_phone','company_email','company_website','company_ref_prefix']
      .filter(k => !profile || !(profile as any)[k] || String((profile as any)[k]).trim() === '')
      .map(k => k.replace(/^company_/, '').replace(/_/g, ' '));

    return NextResponse.json({ success: true, fields, formText, profileCompleteness: { missing } });

  } catch (error: any) {
    console.error('extract-form-fields error:', error?.response?.data ?? error?.message ?? error);
    return NextResponse.json({ success: false, error: error?.response?.data?.error?.message || error?.message || 'Failed' }, { status: 500 });
  }
}
