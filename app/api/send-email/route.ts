import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendUserEmail, friendlyEmailError, type EmailConfig } from '@/lib/mail';

// ── Auth: same robust token extraction as the other user-facing routes ──────────
function supabaseWithToken(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
}

function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);

  const allCookies = request.cookies.getAll();
  for (const cookie of allCookies) {
    if (cookie.name === 'sb-access-token' || cookie.name.endsWith('-auth-token')) {
      try {
        const parsed = JSON.parse(decodeURIComponent(cookie.value));
        if (parsed?.access_token) return parsed.access_token;
      } catch {
        if (cookie.value && cookie.value.length > 20) return cookie.value;
      }
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the caller
    const token = extractToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const client = supabaseWithToken(token);
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    // 2. Read the request body
    const { to, subject, body, test } = await request.json();

    // 3. Load this user's saved email settings (RLS restricts to the owner's row)
    const { data: settings, error: settingsError } = await client
      .from('email_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (settingsError) {
      // Most likely the table doesn't exist yet — guide the subscriber.
      if (/relation .* does not exist/i.test(settingsError.message)) {
        return NextResponse.json(
          { success: false, error: 'Email settings are not set up on the server yet. Please run the latest SQL in supabase-schema.sql, then add your details in Settings → Email.' },
          { status: 500 },
        );
      }
      throw settingsError;
    }

    if (!settings || !settings.smtp_user || !settings.smtp_password) {
      return NextResponse.json(
        { success: false, error: 'Email not configured. Add your SMTP or Gmail details in Settings → Email first.' },
        { status: 400 },
      );
    }

    // 4. Resolve recipient + content
    let recipient: string;
    let emailSubject: string;
    let html: string;
    let text: string;

    if (test) {
      // Test emails go back to the subscriber's own address so they can confirm the config works.
      recipient = settings.smtp_user;
      emailSubject = 'PryroTender — test email from your email settings';
      html =
        '<div style="font-family:Arial,sans-serif;color:#333;max-width:560px;margin:auto;">' +
        '<h2 style="color:#2563eb;margin-bottom:8px;">Your email settings work 🎉</h2>' +
        '<p>This confirms PryroTender can send mail from <strong>' + settings.smtp_user + '</strong>.</p>' +
        '<p style="color:#888;font-size:12px;margin-top:24px;">Sent from your PryroTender Email settings test button.</p>' +
        '</div>';
      text = 'Your email settings work. This confirms PryroTender can send mail from ' + settings.smtp_user + '.';
    } else {
      if (!to || typeof to !== 'string' || !to.includes('@')) {
        return NextResponse.json({ success: false, error: 'A valid recipient email is required.' }, { status: 400 });
      }
      if (!subject || !subject.trim()) {
        return NextResponse.json({ success: false, error: 'Subject is required.' }, { status: 400 });
      }
      if (!body || !body.trim()) {
        return NextResponse.json({ success: false, error: 'Email body is required.' }, { status: 400 });
      }
      recipient = to.trim();
      emailSubject = subject.trim();
      text = body;
      // Render plain text body as simple HTML (line breaks → <br>) inside a tidy wrapper.
      const escaped = body
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
      html =
        '<div style="font-family:Arial,sans-serif;color:#333;max-width:640px;margin:auto;">' +
        escaped +
        '</div>';
    }

    // 5. Send via the user's own account
    try {
      await sendUserEmail(settings as EmailConfig, {
        to: recipient,
        subject: emailSubject,
        html,
        text,
      });
    } catch (sendErr: unknown) {
      return NextResponse.json({ success: false, error: friendlyEmailError(sendErr) }, { status: 502 });
    }

    return NextResponse.json({ success: true, to: recipient });
  } catch (error: unknown) {
    console.error('send-email error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send email.' }, { status: 500 });
  }
}
