/**
 * Photographs and videos the desk attaches to a release.
 *
 * They live in Postgres, beside the rows they belong to, because that is the
 * one durable store this app has: a serverless instance's disk is gone by the
 * next request, and nothing else is provisioned. A file is written in fixed
 * chunks rather than in one request, since a hosted function refuses a body
 * much past 4 MB and a two-minute clip is thirty times that.
 *
 * This module is shared by the desk's browser code and the API routes, so it
 * holds no server imports — the SQL is in `lib/db.ts`.
 */

export type MediaKind = 'image' | 'video'

/** Under the 4.5 MB request-body ceiling of a hosted function, with room. */
export const MEDIA_CHUNK_BYTES = 4 * 1024 * 1024

export const MEDIA_LIMIT_BYTES: Record<MediaKind, number> = {
  image: 15 * 1024 * 1024,
  video: 100 * 1024 * 1024,
}

/**
 * What a browser can show inline. SVG is left out on purpose: it is a
 * document that can carry script, and this app serves the bytes back from its
 * own origin.
 */
const ALLOWED: Record<string, MediaKind> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
  'image/avif': 'image',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
  'video/ogg': 'video',
}

export const IMAGE_ACCEPT = Object.keys(ALLOWED).filter((m) => ALLOWED[m] === 'image').join(',')
export const VIDEO_ACCEPT = Object.keys(ALLOWED).filter((m) => ALLOWED[m] === 'video').join(',')

export function mediaKind(mime: string): MediaKind | null {
  return ALLOWED[mime.toLowerCase()] ?? null
}

export function mediaHref(id: number | string): string {
  return `/api/media/${id}`
}

/** Why a file cannot be taken, in the desk's language — or null if it can. */
export function mediaProblem(mime: string, size: number, expected?: MediaKind): string | null {
  const kind = mediaKind(mime)
  if (!kind || (expected && kind !== expected)) {
    return expected === 'video'
      ? 'हा व्हिडिओ प्रकार चालत नाही — MP4 किंवा WebM वापरा.'
      : expected === 'image'
        ? 'हा छायाचित्र प्रकार चालत नाही — JPG, PNG किंवा WebP वापरा.'
        : 'हा फाइल प्रकार चालत नाही.'
  }
  if (!(size > 0)) return 'फाइल रिकामी आहे.'
  if (size > MEDIA_LIMIT_BYTES[kind]) {
    const mb = Math.round(MEDIA_LIMIT_BYTES[kind] / (1024 * 1024))
    return `फाइल खूप मोठी आहे — कमाल ${mb} MB.`
  }
  return null
}

/**
 * Send a file up in chunks and return the URL it is served from.
 *
 * Each chunk is retried once: on a slow district connection one dropped
 * request should not throw away the forty that already went through.
 */
export async function uploadMedia(
  file: File,
  expected: MediaKind,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  const problem = mediaProblem(file.type, file.size, expected)
  if (problem) throw new Error(problem)

  const created = await fetch('/api/media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mime: file.type, size: file.size, name: file.name }),
  })
  const meta = await created.json().catch(() => ({}))
  if (!created.ok) throw new Error(meta.error ?? 'अपलोड सुरू झाले नाही.')

  const parts = Math.ceil(file.size / MEDIA_CHUNK_BYTES)
  onProgress?.(0)

  for (let part = 0; part < parts; part++) {
    const chunk = file.slice(part * MEDIA_CHUNK_BYTES, (part + 1) * MEDIA_CHUNK_BYTES)
    let res: Response | null = null
    for (let attempt = 0; attempt < 2 && !res?.ok; attempt++) {
      res = await fetch(`/api/media/${meta.id}?part=${part}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: chunk,
      }).catch(() => null)
    }
    if (!res?.ok) {
      const err = await res?.json().catch(() => ({}))
      throw new Error(err?.error ?? 'अपलोड मध्येच थांबले — पुन्हा प्रयत्न करा.')
    }
    onProgress?.((part + 1) / parts)
  }

  return mediaHref(meta.id)
}
