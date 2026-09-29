import { NextRequest, NextResponse } from 'next/server'
import { createMedia } from '@/lib/db'
import { MEDIA_CHUNK_BYTES, mediaHref, mediaProblem } from '@/lib/media'

export const dynamic = 'force-dynamic'

/**
 * Open an upload. The client then sends the bytes to `PUT /api/media/[id]`
 * one chunk at a time — see `uploadMedia` in `lib/media.ts`.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const mime = typeof body.mime === 'string' ? body.mime.toLowerCase() : ''
  const size = Number(body.size)
  const name = typeof body.name === 'string' ? body.name.slice(0, 200) : null

  const problem = mediaProblem(mime, size)
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  const media = await createMedia(mime, size, name)
  return NextResponse.json({
    id: media.id,
    url: mediaHref(media.id),
    chunkBytes: MEDIA_CHUNK_BYTES,
    parts: Math.ceil(size / MEDIA_CHUNK_BYTES),
  })
}
