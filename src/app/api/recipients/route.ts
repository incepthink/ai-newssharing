import { NextRequest, NextResponse } from 'next/server'
import { addRecipient, listRecipients, removeRecipient } from '@/lib/db'
import { isEmail, parseRecipients } from '@/lib/email'

export const dynamic = 'force-dynamic'

/** The saved email distribution list. */
export async function GET() {
  return NextResponse.json({ recipients: await listRecipients() })
}

/**
 * Accepts one address with an optional name, or a pasted block of addresses
 * that gets split and de-duplicated.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const raw: string = typeof body.email === 'string' ? body.email : ''
  const name: string | null = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : null

  const emails = parseRecipients(raw)
  if (!emails.length) {
    return NextResponse.json({ error: 'no valid email address found' }, { status: 400 })
  }

  // A name only makes sense when a single address was supplied.
  for (const e of emails) await addRecipient(e, emails.length === 1 ? name : null)

  return NextResponse.json({ added: emails, recipients: await listRecipients() })
}

export async function DELETE(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email') ?? ''
  if (!isEmail(email)) {
    return NextResponse.json({ error: 'pass a valid ?email=' }, { status: 400 })
  }
  await removeRecipient(email)
  return NextResponse.json({ recipients: await listRecipients() })
}
