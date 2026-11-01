import nodemailer from 'nodemailer';

// ── System transport (env-based) — used by cron jobs & notification digests ─────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  await transporter.sendMail({
    from: `PryroTender <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });
}

// ── Per-user transport — sends from a subscriber's own SMTP / Gmail account ────
export type EmailConfig = {
  provider: 'gmail' | 'smtp';
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_user: string;
  smtp_password: string;
  smtp_secure?: boolean | null;
  sender_name?: string | null;
};

/**
 * Build a nodemailer transporter on the fly from the user's saved email config
 * and send a message. We create a fresh transporter per call because every user
 * has different credentials (the shared system transporter above can't serve them).
 */
export async function sendUserEmail(
  config: EmailConfig,
  message: { to: string; subject: string; html?: string; text?: string },
) {
  const isGmail = config.provider === 'gmail';
  const host = isGmail ? 'smtp.gmail.com' : (config.smtp_host || '').trim();
  if (!host) throw new Error('SMTP host is required');

  // Gmail defaults to implicit TLS on 465; custom SMTP honours the saved port/secure flag.
  const port = isGmail ? 465 : Number(config.smtp_port) || 587;
  const secure = isGmail ? true : !!config.smtp_secure;

  const userTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user: config.smtp_user, pass: config.smtp_password },
  });

  const fromName = (config.sender_name || '').trim() || config.smtp_user;
  await userTransporter.sendMail({
    from: `"${fromName}" <${config.smtp_user}>`,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
}

/**
 * Translate a thrown nodemailer / network error into something a subscriber can act on.
 */
export function friendlyEmailError(err: unknown): string {
  const e = (err || {}) as { code?: string; message?: string; port?: number };
  const code = e.code || '';
  const msg = (e.message || String(err || '')).toLowerCase();

  if (code === 'EAUTH' || msg.includes('invalid login') || msg.includes('username and password not accepted') || msg.includes('authentication')) {
    return 'Email login failed. Check your email address and app password — regular Gmail passwords are rejected, you need a Google App Password.';
  }
  if (code === 'ECONNECTION' || code === 'ETIMEDOUT' || code === 'ESOCKET' || msg.includes('connect')) {
    return `Could not connect to the mail server${e.port ? ` on port ${e.port}` : ''}. Verify the host and port, and that your network allows outbound SMTP.`;
  }
  if (code === 'EDNS' || msg.includes('getaddrinfo')) {
    return 'The mail server host could not be resolved. Check the SMTP host spelling.';
  }
  if (code === 'EMESSAGE' || msg.includes('no recipients') || msg.includes('recipient')) {
    return 'The recipient email address looks invalid.';
  }
  return `Failed to send email: ${e.message || String(err)}`;
}
