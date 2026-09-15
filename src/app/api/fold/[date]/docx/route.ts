import { NextRequest, NextResponse } from 'next/server'
import { foldArticles } from '@/lib/db'
import { buildFoldDocx, foldFileName } from '@/lib/docx/fold'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ date: string }> }

/**
 * The day's fold as one document. Regenerated on every request, so an article
 * approved late is simply in the next download — there is no cutoff.
 */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { date } = await params
  const articles = foldArticles(date)
  const buf = await buildFoldDocx(date, articles)

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${foldFileName(date)}"`,
    },
  })
}
