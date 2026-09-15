import { NextRequest, NextResponse } from 'next/server'
import { dailyCounts, districtCounts } from '@/lib/db'
import { todayIso } from '@/lib/marathi'

export const dynamic = 'force-dynamic'

function shiftDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d + days)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`
}

/**
 * Heatmap data. Approved articles only — unreviewed district guesses would
 * turn the map into fiction.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams
  const to = q.get('to') ?? todayIso()
  const days = Number(q.get('days') ?? 30)
  const from = q.get('from') ?? shiftDays(to, -(days - 1))

  return NextResponse.json({
    from,
    to,
    districts: districtCounts(from, to),
    daily: dailyCounts(from, to),
  })
}
