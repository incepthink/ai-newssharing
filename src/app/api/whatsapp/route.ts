import { NextRequest, NextResponse } from 'next/server'
import { foldArticles, getArticle } from '@/lib/db'
import { summarise } from '@/lib/ai'
import { buildMessages } from '@/lib/whatsapp'
import type { Article } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * Build the WhatsApp message. Either the whole fold for a date, or just the
 * articles the user ticked.
 *
 * Summaries are generated here rather than stored, so they always reflect the
 * text as approved — not as submitted.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const date: string | undefined = body.date
  const ids: number[] | undefined = Array.isArray(body.ids) ? body.ids.map(Number) : undefined

  let articles: Article[] = []
  if (ids?.length) {
    articles = (await Promise.all(ids.map((id) => getArticle(id)))).filter((a): a is Article => !!a)
  } else if (date) {
    articles = await foldArticles(date)
  } else {
    return NextResponse.json({ error: 'pass either ids[] or date' }, { status: 400 })
  }

  if (!articles.length) {
    return NextResponse.json({ error: 'no approved articles to share' }, { status: 404 })
  }

  const foldDate = date ?? articles[0].fold_date
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? req.nextUrl.origin

  const items = await Promise.all(
    articles.map(async (article) => {
      try {
        return { article, summary: await summarise(article) }
      } catch {
        // Fall back to the opening of the approved text. Better a real excerpt
        // than an empty block — and we never silently drop an article.
        const fallback = article.body.split(/\n+/).find(Boolean) ?? ''
        return { article, summary: fallback.slice(0, 400) }
      }
    }),
  )

  return NextResponse.json({ messages: buildMessages(foldDate, items, baseUrl) })
}
