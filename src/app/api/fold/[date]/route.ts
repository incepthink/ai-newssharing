import { NextRequest, NextResponse } from 'next/server'
import { foldArticles, getFold, setFoldOrder } from '@/lib/db'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ date: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { date } = await params
  return NextResponse.json({ fold: getFold(date), articles: foldArticles(date) })
}

/** Reorder the fold. The desk decides the sequence; there is no automatic rule. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { date } = await params
  const body = await req.json().catch(() => ({}))
  if (!Array.isArray(body.article_order)) {
    return NextResponse.json({ error: 'article_order must be an array of ids' }, { status: 400 })
  }
  const fold = setFoldOrder(date, body.article_order.map(Number))
  return NextResponse.json({ fold, articles: foldArticles(date) })
}
