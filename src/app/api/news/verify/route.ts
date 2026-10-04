import { NextRequest, NextResponse } from 'next/server'
import { loadNewsCorpus } from '@/lib/news/items'
import { verifyMessage } from '@/lib/news/public'

export const dynamic = 'force-dynamic'

/**
 * फॅक्ट चेक: a pasted message or वृत्त क्र. against the approved releases.
 * It reports what the record holds — a match, a partial match, or nothing —
 * and never rules on whether a claim is true.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { text?: unknown }
  const text = typeof body.text === 'string' ? body.text.slice(0, 4000) : ''
  if (!text.trim()) return NextResponse.json({ error: 'मजकूर रिकामा आहे.' }, { status: 400 })

  const { items } = await loadNewsCorpus()
  const verdict = verifyMessage(items, text)
  if (!verdict) return NextResponse.json({ error: 'मजकूर रिकामा आहे.' }, { status: 400 })

  const byId = new Map(items.map((x) => [x.id, x]))
  const ids = 'ids' in verdict ? verdict.ids : []
  return NextResponse.json({ verdict, items: ids.flatMap((id) => byId.get(id) ?? []) })
}
