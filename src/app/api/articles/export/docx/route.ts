import { NextRequest, NextResponse } from 'next/server'
import { buildArticleDocx } from '@/lib/docx/article'
import { departmentLabel, STATEWIDE, type FeatureArticle } from '@/lib/articles/feature'
import type { Article } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * The .docx behind every "वर्ड फाइल" button on the public articles page.
 *
 * It takes the article in the request body rather than an id, because the
 * page is still running on sample data with no rows behind it. When these
 * articles come from the database this route collapses into the existing
 * `/api/articles/<id>/docx` and disappears.
 *
 * What it does *not* do is build its own document: it maps the public record
 * onto the desk's `Article` and hands it to `buildArticleDocx`, so a file a
 * citizen downloads is byte-for-byte the format the department publishes.
 * A second Word implementation would have drifted from FOLD-FORMAT within a
 * release.
 */
export async function POST(req: NextRequest) {
  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const article = (payload as { article?: unknown })?.article
  if (!isFeatureArticle(article)) {
    return NextResponse.json({ error: 'invalid article' }, { status: 400 })
  }

  const buf = await buildArticleDocx(toDeskArticle(article))

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${safeName(article.id)}.docx"`,
    },
  })
}

/**
 * Structural check, not a schema library.
 *
 * The body is attacker-controlled, and everything it reaches is a document
 * generator that will happily stringify whatever it is given. Only the fields
 * the mapping below actually reads are validated, and lengths are capped so a
 * single request cannot ask the server to build a 50 MB file.
 */
function isFeatureArticle(v: unknown): v is FeatureArticle {
  if (!v || typeof v !== 'object') return false
  const a = v as Record<string, unknown>
  const strings = (x: unknown, max: number) =>
    Array.isArray(x) && x.length <= max && x.every((s) => typeof s === 'string')

  return (
    typeof a.id === 'string' && a.id.length > 0 && a.id.length <= 120 &&
    typeof a.title === 'string' && a.title.length > 0 && a.title.length <= 500 &&
    typeof a.district === 'string' &&
    typeof a.publishedAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(a.publishedAt) &&
    typeof a.dateline === 'string' && a.dateline.length <= 120 &&
    typeof a.byline === 'string' && a.byline.length <= 200 &&
    typeof a.department === 'string' &&
    strings(a.body, 200) &&
    strings(a.highlights, 20)
  )
}

/** The public record, expressed as the record the fold generator understands. */
function toDeskArticle(a: FeatureArticle): Article {
  return {
    id: 0,
    category: 'general',
    raw_text: '',
    title: a.title,
    // The desk stores a body as one string with blank lines between paragraphs;
    // `paragraphsOf` splits it back out on the way into the document.
    body: a.body.join('\n\n'),
    district: a.district === STATEWIDE ? null : a.district,
    language: 'mr',
    // A release number is assigned by the news desk at proofreading. A public
    // reprint has not been through that, and inventing one here would put a
    // number on a document that no register can account for.
    release_no: null,
    office: null,
    department: departmentLabel(a.department),
    attribution: null,
    // Key highlights print as the centred bold sub-heads the format reserves
    // for exactly this.
    bullets: a.highlights,
    dateline: a.dateline,
    byline: a.byline,
    status: 'approved',
    submitted_by: 'mahasamvad',
    submitted_at: a.publishedAt,
    approved_at: a.publishedAt,
    fold_date: a.publishedAt,
  }
}

/** Keep the id fit for a Content-Disposition filename and for a file system. */
function safeName(id: string): string {
  return id.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80) || 'article'
}
