import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Public read-only endpoint — returns non-sensitive platform settings
// Used by the register page to check momo_enabled without an auth token
export async function GET() {
  const db = supabaseAdmin();
  const keys = ['momo_enabled', 'momo_number', 'momo_name'];
  const { data } = await db.from('settings').select('key, value').in('key', keys);

  const result: Record<string, string> = {};
  (data || []).forEach(r => { result[r.key] = r.value; });

  // Defaults if not yet configured in DB
  if (!result.momo_enabled) result.momo_enabled = 'true';
  if (!result.momo_number)  result.momo_number  = '0789XXXXXX';
  if (!result.momo_name)    result.momo_name    = 'PryroTender';

  return NextResponse.json({ settings: result });
}
