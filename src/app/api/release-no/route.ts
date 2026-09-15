import { NextResponse } from 'next/server'
import { suggestReleaseNo } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** Next वृत्त क्र. suggestion. Advisory — the desk can always override it. */
export async function GET() {
  return NextResponse.json({ release_no: suggestReleaseNo() })
}
