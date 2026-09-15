import { NextRequest, NextResponse } from 'next/server'
import { deleteArticle, getArticle, updateArticle } from '@/lib/db'
import { resolveDistrict } from '@/lib/districts'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const article = await getArticle(Number(id))
  if (!article) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ article })
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const patch = await req.json().catch(() => ({}))

  // District is the one field the heatmap depends on, so normalise whatever
  // the desk sends rather than trusting the string.
  if ('district' in patch) {
    patch.district = patch.district ? resolveDistrict(patch.district) ?? patch.district : null
  }

  // The desk's segregation call is the one thing it decides here, so keep the
  // column to the two values the queue filters on.
  if ('category' in patch && patch.category !== 'cm') patch.category = 'general'

  const article = await updateArticle(Number(id), patch)
  if (!article) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ article })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params
  await deleteArticle(Number(id))
  return NextResponse.json({ ok: true })
}
