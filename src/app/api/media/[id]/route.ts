import { NextRequest, NextResponse } from 'next/server'
import { getMedia, putMediaChunk, readMediaChunk } from '@/lib/db'
import { MEDIA_CHUNK_BYTES } from '@/lib/media'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

function mediaId(raw: string): number | null {
  return /^\d+$/.test(raw) ? Number(raw) : null
}

/**
 * One chunk of an upload, as raw bytes, at `?part=N`.
 *
 * Every part but the last must be exactly `MEDIA_CHUNK_BYTES` long, and the
 * last must hold the remainder — so the server can find any byte offset by
 * division when it serves the file, without keeping an index of chunk sizes.
 */
export async function PUT(req: NextRequest, { params }: Ctx) {
  const id = mediaId((await params).id)
  const media = id === null ? null : await getMedia(id)
  if (!media) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const part = Number(req.nextUrl.searchParams.get('part'))
  const parts = Math.ceil(media.size / MEDIA_CHUNK_BYTES)
  if (!Number.isInteger(part) || part < 0 || part >= parts) {
    return NextResponse.json({ error: 'bad part' }, { status: 400 })
  }

  const data = Buffer.from(await req.arrayBuffer())
  const expected = part === parts - 1 ? media.size - part * MEDIA_CHUNK_BYTES : MEDIA_CHUNK_BYTES
  if (data.length !== expected) {
    return NextResponse.json({ error: `part ${part} should be ${expected} bytes` }, { status: 400 })
  }

  const stored = await putMediaChunk(media.id, part, data)
  return NextResponse.json({ received: stored?.received ?? 0, complete: stored?.received === media.size })
}

/**
 * The file, streamed chunk by chunk out of Postgres.
 *
 * Range requests are honoured because a `<video>` depends on them — Safari
 * will not play a video at all without, and every browser needs them to seek.
 * The body is pulled lazily, so a player that asks for `bytes=0-` and then
 * hangs up after the first frame costs one chunk read, not the whole file.
 *
 * An upload is immutable once complete — replacing a photo uploads a new file
 * under a new id — so it is cached for as long as a browser will keep it.
 */
export async function GET(req: NextRequest, { params }: Ctx) {
  const id = mediaId((await params).id)
  const media = id === null ? null : await getMedia(id)
  if (!media || media.received !== media.size) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const range = parseRange(req.headers.get('range'), media.size)
  if (range === 'unsatisfiable') {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${media.size}` } })
  }

  const [start, end] = range ?? [0, media.size - 1]
  const headers: Record<string, string> = {
    'Content-Type': media.mime,
    'Content-Length': String(end - start + 1),
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  }
  if (range) headers['Content-Range'] = `bytes ${start}-${end}/${media.size}`

  return new Response(streamRange(media.id, start, end), { status: range ? 206 : 200, headers })
}

/**
 * A single `bytes=` range, clamped to the file. Multi-range requests are
 * answered with the whole file, which the spec allows and no player sends.
 */
function parseRange(header: string | null, size: number): [number, number] | 'unsatisfiable' | null {
  const m = header?.match(/^bytes=(\d*)-(\d*)$/)
  if (!m || (!m[1] && !m[2])) return null

  let start: number
  let end: number
  if (!m[1]) {
    // `bytes=-500`: the last 500 bytes.
    start = Math.max(size - Number(m[2]), 0)
    end = size - 1
  } else {
    start = Number(m[1])
    end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1
  }
  return start > end || start >= size ? 'unsatisfiable' : [start, end]
}

function streamRange(id: number, start: number, end: number): ReadableStream<Uint8Array> {
  let seq = Math.floor(start / MEDIA_CHUNK_BYTES)
  const last = Math.floor(end / MEDIA_CHUNK_BYTES)

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (seq > last) {
        controller.close()
        return
      }
      const data = await readMediaChunk(id, seq)
      if (!data) {
        controller.error(new Error(`media ${id} is missing chunk ${seq}`))
        return
      }
      const base = seq * MEDIA_CHUNK_BYTES
      controller.enqueue(data.subarray(Math.max(start - base, 0), Math.min(end - base + 1, data.length)))
      seq++
    },
  })
}
