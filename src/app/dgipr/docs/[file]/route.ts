import { NextRequest, NextResponse } from 'next/server'
import { getArticle, getArticleByReleaseNo } from '@/lib/db'
import { buildArticleDocx } from '@/lib/docx/article'
import { docxFilename, parseDocxFilename } from '@/lib/whatsapp'
import type { Article } from '@/lib/types'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ file: string }> }

const notFound = () => NextResponse.json({ error: 'not found' }, { status: 404 })

/**
 * The DOCX link every WhatsApp fold message carries — ms-<वृत्त क्र.>.docx.
 * The path shape is the desk's, taken from the real DGIPR messages, so it is
 * answered here rather than redirected to /api/articles/[id]/docx.
 */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { file } = await params
  const parsed = parseDocxFilename(decodeURIComponent(file))
  if (!parsed) return notFound()

  const { key, language } = parsed
  let article: Article | null = await getArticleByReleaseNo(key, language)

  // An article with no release_no is linked by its id instead. Only accept the
  // row if it really is one of those — otherwise ms-<id> could serve an
  // unrelated article that happens to carry <id> as its release number.
  if (!article && /^\d+$/.test(key)) {
    const byId = await getArticle(Number(key))
    if (byId && byId.release_no === null && byId.language === language) article = byId
  }

  if (!article) return notFound()

  const buf = await buildArticleDocx(article)

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${docxFilename(article)}"`,
    },
  })
}
