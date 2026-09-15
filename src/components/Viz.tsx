'use client'

import { useState } from 'react'
import { toDevanagariDigits } from '@/lib/marathi'

/**
 * Sequential ramp for article volume — one hue, light to dark.
 * Index 0 means "nothing here" and is allowed to recede toward the surface.
 */
const RAMP = [
  'var(--empty)',
  'var(--seq-100)',
  'var(--seq-200)',
  'var(--seq-300)',
  'var(--seq-400)',
  'var(--seq-500)',
  'var(--seq-600)',
  'var(--seq-700)',
]

export function heatColor(value: number, max: number): string {
  if (value <= 0 || max <= 0) return RAMP[0]
  const steps = RAMP.length - 1
  const idx = Math.max(1, Math.min(steps, Math.ceil((value / max) * steps)))
  return RAMP[idx]
}

export function HeatLegend({ max }: { max: number }) {
  return (
    <div className="num flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
      <span>०</span>
      <div className="flex overflow-hidden rounded-[3px]">
        {RAMP.slice(1).map((c, i) => (
          <span key={i} style={{ background: c, width: 20, height: 10, display: 'block' }} />
        ))}
      </div>
      <span>{toDevanagariDigits(max)}</span>
      <span className="ml-0.5">लेख</span>
    </div>
  )
}

export interface DailyPoint { date: string; count: number }

/**
 * Article volume over time. Single series, so no legend — the title names it.
 * Hover gives the exact value rather than labelling every bar; at ninety days
 * there is no room to label anything and at seven there is no need.
 */
export function VolumeChart({ data }: { data: DailyPoint[] }) {
  const [hover, setHover] = useState<number | null>(null)
  if (!data.length) {
    return (
      <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
        या कालावधीत माहिती नाही.
      </p>
    )
  }

  const max = Math.max(...data.map((d) => d.count), 1)
  const H = 132

  return (
    <div className="relative">
      {/* One rule at the top of the plot area, so a bar's height is read
          against something rather than floating. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed"
        style={{ borderColor: 'var(--grid)' }}
      >
        <span className="num absolute -top-2 right-0 bg-[color:var(--surface)] pl-1.5 text-[0.6875rem]" style={{ color: 'var(--faint)' }}>
          {toDevanagariDigits(max)}
        </span>
      </div>

      <div className="flex items-end gap-[2px]" style={{ height: H }}>
        {data.map((d, i) => {
          const h = Math.max(2, (d.count / max) * H)
          return (
            <div
              key={d.date}
              className="relative flex flex-1 cursor-default items-end justify-center"
              style={{ height: H }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              {/* Capped, so a seven-day window plots as bars rather than as
                  slabs the width of a hand. */}
              <div
                style={{
                  height: h,
                  width: '100%',
                  maxWidth: 34,
                  margin: '0 auto',
                  background: hover === i ? 'var(--seq-700)' : 'var(--bar)',
                  borderRadius: '3px 3px 0 0',
                  transition: 'background 110ms',
                }}
              />
            </div>
          )
        })}
      </div>

      <div className="num mt-2 flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>

      {hover !== null && (
        <div
          className="pointer-events-none absolute -top-2 z-10 rounded-[var(--r-sm)] border px-2 py-1 text-xs shadow-sm"
          style={{
            borderColor: 'var(--edge)',
            background: 'var(--surface)',
            left: `${(hover / Math.max(1, data.length - 1)) * 100}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <strong className="num">{toDevanagariDigits(data[hover].count)}</strong>
          <span className="num" style={{ color: 'var(--text-muted)' }}> · {data[hover].date}</span>
        </div>
      )}
    </div>
  )
}
