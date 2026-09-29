import { NextRequest, NextResponse } from 'next/server'
import { foldArticles } from '@/lib/db'
import { buildFoldDocx, foldFileName } from '@/lib/docx/fold'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ date: string }> }

/**
 * The day's fold as one document. Regenerated on every request, so an article
 * approved late is simply in the next download — there is no cutoff.
 *
 * `?ids=12,7,9` narrows and reorders it for one download — the public page's
 * fold dialog, where a reader drops articles or moves them. It can only pick
 * from the day's approved articles: an id that is not in the fold is ignored,
 * so the parameter can never pull a pending or another day's release into the
 * file. The desk's stored order is untouched.
 */
export async function GET(req: NextRequest, { params }: Ctx) {
  const { date } = await params
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 })
  }

  let articles = await foldArticles(date)

  const ids = req.nextUrl.searchParams.get('ids')
  if (ids !== null) {
    const byId = new Map(articles.map((a) => [a.id, a]))
    const picked = [...new Set(ids.split(',').map(Number))].flatMap((id) => byId.get(id) ?? [])
    if (!picked.length) {
      return NextResponse.json({ error: 'none of these ids is in this fold' }, { status: 400 })
    }
    articles = picked
  }

  const buf = await buildFoldDocx(date, articles)

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${foldFileName(date)}"`,
    },
  })
}
