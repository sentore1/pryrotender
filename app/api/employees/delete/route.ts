import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { employeeId, userId } = await request.json();
    if (!employeeId || !userId)
      return NextResponse.json({ success: false, error: 'Missing employeeId or userId' }, { status: 400 });

    const admin = supabaseAdmin();

    // Get the CV file path before deleting the record
    const { data: emp } = await admin
      .from('employees')
      .select('cv_path, user_id')
      .eq('id', employeeId)
      .single();

    // Verify ownership
    if (!emp || emp.user_id !== userId)
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    // Delete the CV file from storage
    if (emp.cv_path) {
      await admin.storage.from('company-assets').remove([emp.cv_path]);
    }

    // Delete the DB record
    const { error } = await admin.from('employees').delete().eq('id', employeeId);
    if (error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed' }, { status: 500 });
  }
}
