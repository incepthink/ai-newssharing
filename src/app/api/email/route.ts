import { NextRequest, NextResponse } from 'next/server'
import { foldArticles, listRecipients } from '@/lib/db'
import { buildFoldDocx, foldFileName } from '@/lib/docx/fold'
import { isMailConfigured, mailConfig, parseRecipients, sendFold } from '@/lib/email'
import type { Attachment } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/** Lets the share page disable the send button before the user types anything. */
export async function GET() {
  const cfg = mailConfig()
  return NextResponse.json({
    configured: !('error' in cfg),
    reason: 'error' in cfg ? cfg.error : null,
    from: 'error' in cfg ? null : cfg.from,
  })
}

/**
 * Sends a built fold message to the distribution list.
 *
 * The message text comes from the client rather than being regenerated here,
 * so what goes out is exactly what the desk read in the preview — regenerating
 * would re-run the summariser and could word it differently after approval.
 */
export async function POST(req: NextRequest) {
  if (!isMailConfigured()) {
    const cfg = mailConfig()
    return NextResponse.json(
      { error: 'error' in cfg ? cfg.error : 'SMTP is not configured' },
      { status: 503 },
    )
  }

  const body = await req.json().catch(() => ({}))
  const message: string = typeof body.message === 'string' ? body.message : ''
  const date: string | undefined = typeof body.date === 'string' ? body.date : undefined
  const subject: string =
    typeof body.subject === 'string' && body.subject.trim()
      ? body.subject.trim()
      : `DGIPR Daily News Summary - ${date ?? ''}`.trim()

  if (!message.trim()) {
    return NextResponse.json({ error: 'message is empty' }, { status: 400 })
  }

  // An explicit list overrides the saved one, so a one-off send needs no edits
  // to the distribution list.
  const override = Array.isArray(body.to) ? parseRecipients(body.to.join(',')) : []
  const to = override.length ? override : (await listRecipients()).map((r) => r.email)

  if (!to.length) {
    return NextResponse.json(
      { error: 'no recipients — add addresses to the list first' },
      { status: 400 },
    )
  }

  const attachments: Attachment[] = []
  if (body.attachDocx && date) {
    const articles = await foldArticles(date)
    if (articles.length) {
      attachments.push({
        filename: foldFileName(date),
        content: await buildFoldDocx(date, articles),
      })
    }
  }

  try {
    const result = await sendFold({ to, subject, message, attachments })
    return NextResponse.json({
      sent: result.accepted.length,
      rejected: result.rejected,
      recipients: to,
      attached: attachments.map((a) => a.filename),
      messageId: result.messageId,
    })
  } catch (err) {
    // SMTP failures are operational, not bugs — surface the reason so the desk
    // can tell a wrong password from a blocked port.
    const reason = err instanceof Error ? err.message : 'unknown SMTP error'
    return NextResponse.json({ error: reason }, { status: 502 })
  }
}
