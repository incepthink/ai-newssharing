import { NextRequest, NextResponse } from 'next/server'
import { answerFromReleases, type AskTurn } from '@/lib/ai'
import { loadNewsCorpus } from '@/lib/news/items'
import { asksFactCheck, mrDigits, retrieve, ruleAnswer, type NewsItem } from '@/lib/news/public'
import { todayIso } from '@/lib/marathi'

export const dynamic = 'force-dynamic'

/**
 * महासंवाद सहाय्यक.
 *
 * Retrieval over the approved releases first, then — when an API key is
 * configured — a model that may answer only from what was retrieved. The rule
 * is the same either way: answer only from approved releases, always show the
 * sources, and say so when nothing is found. With no key, or when the model
 * fails, the rule-based answer stands in; it is never a guess either.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { question?: unknown; history?: unknown }
  const question = typeof body.question === 'string' ? body.question.trim().slice(0, 1500) : ''
  if (!question) return NextResponse.json({ error: 'प्रश्न रिकामा आहे.' }, { status: 400 })

  const { items, rows } = await loadNewsCorpus()
  const byId = new Map(items.map((x) => [x.id, x]))
  const today = todayIso()
  const reply = (text: string, cites: string[], fc = false) =>
    NextResponse.json({ text, cites: cites.flatMap((id) => byId.get(id) ?? []).slice(0, 3), fc })

  /* A fact-check question, a वृत्त क्र. or "today" have exact answers in the
     record; the rules give them without a model's paraphrase. */
  const t = mrDigits(question)
  if (asksFactCheck(t) || /[०-९]{6}/.test(t) || /आज|ताज/.test(t)) {
    const a = ruleAnswer(items, question, today)
    return reply(a.text, a.cites, a.fc)
  }

  const sources = retrieve(items, question, 6)
  if (!sources.length) {
    /* Nothing shares enough words with the question; the rules still know
       a district or a topic when one is named, and say so when not. */
    const a = ruleAnswer(items, question, today)
    return reply(a.text, a.cites, a.fc)
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const { answer, sources: used } = await answerFromReleases(
        question,
        sources.map((s) => ({
          title: s.title,
          place: s.place,
          date: s.dateFull,
          releaseNo: s.no,
          text: rows.get(s.id)?.row.release.summaryMr ?? s.summary ?? '',
        })),
        history(body.history),
      )
      if (answer) {
        const cited = used.flatMap((n) => sources[n - 1] ?? []).map((s: NewsItem) => s.id)
        return reply(answer, [...new Set(cited)])
      }
    } catch {
      /* Fall through to the rules: a citizen gets an answer from the record,
         not an error from a vendor. */
    }
  }

  const a = ruleAnswer(items, question, today)
  return reply(a.text, a.cites, a.fc)
}

function history(v: unknown): AskTurn[] {
  if (!Array.isArray(v)) return []
  return v
    .filter(
      (t): t is AskTurn =>
        Boolean(t) && typeof t === 'object' && (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string',
    )
    .slice(-6)
}
