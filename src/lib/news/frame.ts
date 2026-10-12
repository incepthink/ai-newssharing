import { headers } from 'next/headers'
import { TRENDING } from '@/data/news-editorial'
import { foldArticles } from '@/lib/db'
import { todayIso } from '@/lib/marathi'
import { toFoldItem, type FoldItem } from './fold-item'
import { loadNewsCorpus, type NewsCorpus } from './items'
import { searchItems, type NewsItem } from './public'

/**
 * What every page inside `NewsFrame` reads before it renders: the approved
 * corpus, today's fold for the masthead's button, and the site's origin for
 * WhatsApp links. One call, so `/news` and the योजना and व्हिडिओ pages cannot
 * drift apart on what the masthead and the palette show.
 */
export type Frame = {
  today: string
  foldItems: FoldItem[]
  recent: NewsItem[]
  suggestions: Array<{ label: string; query: string }>
  origin: string
  approvedAt: string | null
}

export async function loadFrame(): Promise<NewsCorpus & { frame: Frame }> {
  const today = todayIso()
  const [news, todayFold, origin] = await Promise.all([loadNewsCorpus(), foldArticles(today), requestOrigin()])
  const trending = TRENDING.filter((t) => searchItems(news.items, t.query).length > 0)
  return {
    ...news,
    frame: {
      today,
      foldItems: todayFold.map(toFoldItem),
      recent: news.items.slice(0, 4),
      suggestions: trending.slice(0, 5),
      origin,
      approvedAt: news.corpus.approvedAt,
    },
  }
}

/** `?q=` and `?n=` on a hub page: the words, and how many rows to show. */
export function hubQuery(query: Record<string, string | string[] | undefined>, pageSize: number): { q: string; n: number } {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? ''
  const n = Number.parseInt(one(query.n), 10)
  return {
    q: one(query.q).slice(0, 120),
    n: Number.isFinite(n) ? Math.min(Math.max(n, pageSize), 500) : pageSize,
  }
}

/** The whole corpus's answer to the words — what `/api/news/search` returns,
 *  so the first paint and the island agree. */
export function searchAll(items: NewsItem[], q: string): { results: NewsItem[]; total: number } {
  if (!q) return { results: [], total: 0 }
  const hits = searchItems(items, q)
  return { results: hits.slice(0, 12), total: hits.length }
}

/** The site's own origin, for the absolute link a WhatsApp share needs. */
export async function requestOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}
