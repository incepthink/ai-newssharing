import { NextRequest, NextResponse } from 'next/server'
import { loadNewsCorpus } from '@/lib/news/items'
import { parseFilters } from '@/lib/news/release-filters'
import { releasePage } from '@/lib/news/releases'

export const dynamic = 'force-dynamic'

/**
 * सर्व मंजूर प्रसिद्धीपत्रके, one page at a time, for the filters on `/news`.
 * Takes the page's own query string, so a filter changed in place and the
 * same URL opened fresh show the same rows. Only the corpus is read — not the
 * fold, the map or anything else the full page needs.
 */
export async function GET(req: NextRequest) {
  const filters = parseFilters(req.nextUrl.searchParams)
  try {
    const { items } = await loadNewsCorpus()
    return NextResponse.json(releasePage(items, filters))
  } catch (err) {
    console.error('[api/news/releases]', err)
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }
}
