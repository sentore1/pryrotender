import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const subscriptionId = formData.get('subscriptionId') as string | null;
    const userId = formData.get('userId') as string | null;

    if (!file || !subscriptionId || !userId) {
      return NextResponse.json(
        { error: 'file, subscriptionId and userId are required' },
        { status: 400 }
      );
    }

    // Validate file type — only images and PDFs
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPG, PNG, WEBP, GIF or PDF files are allowed' },
        { status: 400 }
      );
    }

    // Max 5 MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be under 5 MB' }, { status: 400 });
    }

    const db = supabaseAdmin();

    // Verify the subscription belongs to this user and is still pending
    const { data: sub, error: subErr } = await db
      .from('subscriptions')
      .select('id, user_id, status, payment_method')
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .single();

    if (subErr || !sub) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    if (!['pending', 'awaiting_approval'].includes(sub.status)) {
      return NextResponse.json(
        { error: 'Subscription is no longer pending — cannot upload reference' },
        { status: 409 }
      );
    }

    // Upload to Supabase Storage under payment-references/{userId}/{subscriptionId}-{timestamp}.ext
    const ext = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const storagePath = `${userId}/${subscriptionId}-${timestamp}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadErr } = await db.storage
      .from('payment-references')
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadErr) {
      console.error('[Reference Upload] Storage error:', uploadErr.message);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Build public URL
    const { data: urlData } = db.storage
      .from('payment-references')
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    // Update subscription: set reference URL and bump status to awaiting_approval
    const { error: updateErr } = await db
      .from('subscriptions')
      .update({
        payment_reference: publicUrl,
        reference_uploaded_at: new Date().toISOString(),
        status: 'awaiting_approval',
      })
      .eq('id', subscriptionId)
      .eq('user_id', userId);

    if (updateErr) {
      console.error('[Reference Upload] DB update error:', updateErr.message);
      return NextResponse.json({ error: 'Failed to update subscription record' }, { status: 500 });
    }

    return NextResponse.json({ success: true, referenceUrl: publicUrl });
  } catch (e: any) {
    console.error('[Reference Upload] Unhandled error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
