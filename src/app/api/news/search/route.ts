import { NextRequest, NextResponse } from 'next/server'
import { loadNewsCorpus } from '@/lib/news/items'
import { searchItems } from '@/lib/news/public'

export const dynamic = 'force-dynamic'

/**
 * The search palette on `/news`, as you type. The same corpus and the same
 * matching as the page's own `?q=` list, so "Enter" and "see all results"
 * cannot disagree with what the palette showed.
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 120)
  if (!q) return NextResponse.json({ results: [], total: 0 })
  const { items } = await loadNewsCorpus()
  const hits = searchItems(items, q)
  return NextResponse.json({ results: hits.slice(0, 12), total: hits.length })
}
