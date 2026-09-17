import { NextRequest, NextResponse } from 'next/server'
import { askAboutArticle, type AskContext, type AskTurn } from '@/lib/ai'

export const dynamic = 'force-dynamic'

/**
 * One turn of the article assistant on the public वृत्त विशेष page.
 *
 * Every message the client shows the reader is Marathi and comes from here,
 * including the failures — an English stack-trace fragment in a citizen-facing
 * chat panel is worse than no message at all. The drawer prints `error`
 * verbatim, so nothing in this file may return raw exception text.
 */
export async function POST(req: NextRequest) {
  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'विनंती समजली नाही.' }, { status: 400 })
  }

  const body = (payload ?? {}) as Record<string, unknown>

  const question = typeof body.question === 'string' ? body.question.trim() : ''
  if (!question) {
    return NextResponse.json({ error: 'प्रश्न रिकामा आहे.' }, { status: 400 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'सहाय्यक सध्या उपलब्ध नाही. कृपया लेख थेट वाचा.' },
      { status: 503 },
    )
  }

  try {
    const reply = await askAboutArticle(question, context(body.article), history(body.history))
    if (!reply) {
      return NextResponse.json(
        { error: 'उत्तर तयार करता आले नाही. प्रश्न थोडा वेगळ्या शब्दांत विचारून पहा.' },
        { status: 502 },
      )
    }
    return NextResponse.json({ reply })
  } catch {
    return NextResponse.json(
      { error: 'उत्तर मिळवता आले नाही. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.' },
      { status: 502 },
    )
  }
}

/** The grounding article, or null. Anything malformed becomes null rather than
 *  a 400: a general answer is a better outcome than a red bubble. */
function context(v: unknown): AskContext | null {
  if (!v || typeof v !== 'object') return null
  const a = v as Record<string, unknown>
  if (typeof a.title !== 'string' || !Array.isArray(a.body)) return null

  return {
    title: a.title.slice(0, 500),
    body: a.body.filter((p): p is string => typeof p === 'string').slice(0, 60),
    highlights: Array.isArray(a.highlights)
      ? a.highlights.filter((h): h is string => typeof h === 'string').slice(0, 10)
      : [],
  }
}

/** Prior turns, capped. The client already trims to the last eight; this is the
 *  server not trusting it to. */
function history(v: unknown): AskTurn[] {
  if (!Array.isArray(v)) return []
  return v
    .filter(
      (t): t is AskTurn =>
        Boolean(t) &&
        typeof t === 'object' &&
        (t.role === 'user' || t.role === 'assistant') &&
        typeof t.content === 'string',
    )
    .slice(-8)
}
