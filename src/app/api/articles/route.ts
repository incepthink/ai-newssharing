import { NextRequest, NextResponse } from 'next/server'
import { createArticle, listArticles } from '@/lib/db'
import { extractArticle } from '@/lib/ai'
import { resolveDistrict } from '@/lib/districts'
import { todayIso } from '@/lib/marathi'
import type { Category, Language, Status } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams
  const articles = listArticles({
    fold_date: q.get('date') ?? undefined,
    status: (q.get('status') as Status) ?? undefined,
    category: (q.get('category') as Category) ?? undefined,
    district: q.get('district') ?? undefined,
    language: (q.get('language') as Language) ?? undefined,
    from: q.get('from') ?? undefined,
    to: q.get('to') ?? undefined,
  })
  return NextResponse.json({ articles })
}

/**
 * Submit an article. Every article in the system arrives here — including the
 * Chief Minister's secretariat releases and cabinet decisions. Nobody writes
 * articles at the desk. One LLM call works out the language, a headline, the
 * district, and whether this is CM business; the desk confirms that last one.

 
 *
 * If extraction fails we still save the article — losing a DLO's work because
 * an API call timed out would be worse than a missing title. The desk can fix
 * a blank title; it cannot recover text that was never stored.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const rawText: string = (body.raw_text ?? '').trim()
  if (!rawText) {
    return NextResponse.json({ error: 'raw_text is required' }, { status: 400 })
  }

  const foldDate: string = body.fold_date || todayIso()
  let extracted = null
  let extractionError: string | null = null

  try {
    extracted = await extractArticle(rawText)
  } catch (err) {
    extractionError = err instanceof Error ? err.message : String(err)
  }

  const article = createArticle({
    raw_text: rawText,
    body: rawText,
    title: extracted?.title ?? '',
    language: extracted?.language ?? 'mr',
    // A suggestion only. Extraction failure leaves it 'general' for the desk.
    category: extracted?.category ?? 'general',
    // A district the DLO picked by hand beats the model's guess.
    district: resolveDistrict(body.district) ?? extracted?.district ?? null,
    dateline: extracted?.dateline ?? null,
    submitted_by: body.submitted_by ?? 'dlo',
    fold_date: foldDate,
    status: 'pending',
  })

  return NextResponse.json({ article, extractionError }, { status: 201 })
}
