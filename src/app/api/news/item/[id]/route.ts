import { NextRequest, NextResponse } from 'next/server'
import { readerPayload } from '@/lib/news/items'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

/** One approved release for the reading panel: full text and related. */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const payload = await readerPayload(id)
  if (!payload) return NextResponse.json({ error: 'हे प्रसिद्धीपत्रक सापडले नाही.' }, { status: 404 })
  return NextResponse.json(payload)
}
