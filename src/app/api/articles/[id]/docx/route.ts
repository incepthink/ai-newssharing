import { NextRequest, NextResponse } from 'next/server'
import { getArticle } from '@/lib/db'
import { buildArticleDocx } from '@/lib/docx/article'
import { docxFilename } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

/** The per-article DOCX — the file a WhatsApp message links to. */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const article = await getArticle(Number(id))
  if (!article) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const buf = await buildArticleDocx(article)
  const name = docxFilename(article)

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${name}"`,
    },
  })
}
