import { NextRequest, NextResponse } from 'next/server'
import { getArticleByReleaseNo } from '@/lib/db'
import { buildArticleDocx } from '@/lib/docx/article'
import type { Language } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * The DOCX link as it appears in every WhatsApp message this desk has sent:
 *
 *     /dgipr/docs/ms-3374.docx        Marathi (no suffix)
 *     /dgipr/docs/ms-3349-en.docx     English
 *     /dgipr/docs/ms-3349-hi.docx     Hindi
 *
 * WHATSAPP-FORMAT.md specified this path as a set of static files that would be
 * generated and hosted somewhere. That hosting was never built, so the path
 * routed nowhere and every link sent under it returned a 404 — including links
 * already in recipients' phones, which no change to the message builder can
 * reach. This handler is what makes those links resolve: same URL, document
 * built on request from the approved row.
 *
 * It is keyed by release number rather than row id because that is what the
 * sent links contain. That makes it a permanent part of the surface, not a
 * migration step — the messages are out there and cannot be recalled.
 */

const FILENAME = /^ms-(.+?)(?:-(en|hi))?\.docx$/

type Ctx = { params: Promise<{ file: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { file } = await params

  const m = FILENAME.exec(decodeURIComponent(file))
  if (!m) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const [, releaseNo, suffix] = m
  const language = (suffix ?? 'mr') as Language

  const article = await getArticleByReleaseNo(releaseNo, language)
  // A link can outlive the row it named — a release withdrawn, a number
  // corrected. 404 is the honest answer; serving a different release under a
  // number a recipient was given would be worse than serving nothing.
  if (!article) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const buf = await buildArticleDocx(article)

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="ms-${releaseNo}${suffix ? `-${suffix}` : ''}.docx"`,
      // Approved text can still be corrected at the desk; a recipient opening
      // the link tomorrow should get the corrected copy, not a cached one.
      'Cache-Control': 'no-store',
    },
  })
}
