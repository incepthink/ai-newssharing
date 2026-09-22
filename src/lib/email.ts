import nodemailer, { type Transporter } from 'nodemailer'

/**
 * Email delivery for the daily fold.
 *
 * The WhatsApp share link can't carry this content: Devanagari costs three
 * UTF-8 bytes per character, so percent-encoding inflates a Marathi fold about
 * sevenfold and a Gmail compose URL runs out after roughly two articles. We
 * send from the server instead, which has no such ceiling and lets the DOCX
 * files travel as real attachments.
 */

const globalForMail = globalThis as unknown as { _mailer?: Transporter }

export interface MailConfig {
  host: string
  port: number
  secure: boolean
  user?: string
  pass?: string
  from: string
}

/** Reads SMTP settings from the environment, or explains what is missing. */
export function mailConfig(): MailConfig | { error: string } {
  const host = process.env.SMTP_HOST
  const from = process.env.SMTP_FROM
  if (!host) return { error: 'SMTP_HOST is not set' }
  if (!from) return { error: 'SMTP_FROM is not set' }

  // 465 is implicit TLS; 587 and 25 start plaintext and STARTTLS upward.
  const port = Number(process.env.SMTP_PORT ?? 587)
  return {
    host,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from,
  }
}

export function isMailConfigured(): boolean {
  return !('error' in mailConfig())
}

/** One transporter per warm instance; nodemailer pools the connections itself. */
function transporter(cfg: MailConfig): Transporter {
  globalForMail._mailer ??= nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    pool: true,
    maxConnections: 2,
  })
  return globalForMail._mailer
}

/* ------------------------------------------------------------------ html */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const RULE = /^(?:-{3,}|[─-╿]{3,})$/

/**
 * Renders the WhatsApp-format message as HTML. The desk recognises that layout
 * (see WHATSAPP-FORMAT.md), so this mirrors it rather than inventing a second
 * one: *stars* become bold, the rules become dividers, and the bare DOCX URLs
 * become real links instead of text the reader has to copy.
 */
export function renderHtml(message: string, subject: string): string {
  const body = message
    .split('\n')
    .map((line) => {
      const t = line.trim()
      if (!t) return '<div style="height:10px"></div>'
      if (RULE.test(t)) {
        return '<hr style="border:none;border-top:1px solid #d9dee6;margin:18px 0">'
      }

      let html = escapeHtml(line)
      html = html.replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" style="color:#1a56b8;word-break:break-all">$1</a>',
      )
      // WhatsApp bold. Non-greedy, and never across a line break.
      html = html.replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
      html = html.replace(/^•\s*/, '<span style="color:#7a8290">&bull;</span>&nbsp;')
      return `<div>${html}</div>`
    })
    .join('\n')

  return `<!doctype html>
<html lang="mr">
<head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f5f7">
  <div style="max-width:680px;margin:0 auto;padding:24px 20px;background:#ffffff;
              font-family:'Noto Sans Devanagari','Nirmala UI',Arial,sans-serif;
              font-size:15px;line-height:1.7;color:#1c2430">
${body}
  </div>
</body>
</html>`
}

/* ------------------------------------------------------------------ send */

export interface Attachment {
  filename: string
  content: Buffer
}

export interface SendInput {
  to: string[]
  subject: string
  message: string
  attachments?: Attachment[]
}

export interface SendResult {
  accepted: string[]
  rejected: string[]
  messageId: string
}

export async function sendFold(input: SendInput): Promise<SendResult> {
  const cfg = mailConfig()
  if ('error' in cfg) throw new Error(cfg.error)

  const info = await transporter(cfg).sendMail({
    from: cfg.from,
    // The list goes in Bcc so recipients never see each other's addresses, and
    // To is the sending address itself — an empty To reads as spam.
    to: cfg.from,
    bcc: input.to,
    subject: input.subject,
    text: input.message,
    html: renderHtml(input.message, input.subject),
    attachments: input.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })),
  })

  return {
    accepted: (info.accepted ?? []).map(String),
    rejected: (info.rejected ?? []).map(String),
    messageId: info.messageId ?? '',
  }
}

/** Verifies the SMTP credentials without sending anything. */
export async function verifyMail(): Promise<void> {
  const cfg = mailConfig()
  if ('error' in cfg) throw new Error(cfg.error)
  await transporter(cfg).verify()
}

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/

export function isEmail(s: string): boolean {
  return EMAIL_RE.test(s.trim())
}

/** Splits a pasted list on commas, semicolons, or whitespace, and de-duplicates. */
export function parseRecipients(raw: string): string[] {
  const seen = new Set<string>()
  for (const part of raw.split(/[,;\s]+/)) {
    const v = part.trim().toLowerCase()
    if (v && isEmail(v)) seen.add(v)
  }
  return [...seen]
}
