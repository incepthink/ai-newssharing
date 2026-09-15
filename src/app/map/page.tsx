'use client'

import { useEffect, useMemo, useState } from 'react'
import { HeatLegend, VolumeChart, heatColor, type DailyPoint } from '@/components/Viz'
import { MaharashtraMap } from '@/components/map/MaharashtraMap'
import { DistrictPanel } from '@/components/map/DistrictPanel'
import { heatBands } from '@/components/map/geometry'
import { DISTRICTS, districtName } from '@/lib/districts'
import { toDevanagariDigits } from '@/lib/marathi'
import { IconMapPin, PageHeader, StatCard } from '@/components/ui'
import '@/components/viz.css'

interface Stats {
  from: string
  to: string
  districts: { district: string; count: number }[]
  daily: DailyPoint[]
}

const RANGES = [
  { days: 7, label: '७ दिवस' },
  { days: 30, label: '३० दिवस' },
  { days: 90, label: '९० दिवस' },
  { days: 365, label: 'वर्षभर' },
]

function shiftIso(iso: string, days: number) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d + days)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`
}

/** The ramp step colours, in the order `map.css` paints them. */
const BAND_COLORS = [
  'var(--seq-100)',
  'var(--seq-200)',
  'var(--seq-300)',
  'var(--seq-450)',
  'var(--seq-600)',
]

export default function MapPage() {
  const [days, setDays] = useState(30)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/stats?days=${days}`)
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false))
  }, [days])

  /** The one thing the map is painted from. Everything else on the page —
   *  the tiles, the bands, the ranked list — is derived from it too, so the
   *  map and the table can never disagree about a district. */
  const counts = useMemo(
    () => new Map((stats?.districts ?? []).map((d) => [d.district, d.count])),
    [stats],
  )

  const rows = useMemo(
    () =>
      DISTRICTS.map((d) => ({ key: d.key, name: d.mr, count: counts.get(d.key) ?? 0 }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'mr')),
    [counts],
  )

  /**
   * A daily series with its quiet days in it.
   *
   * The API returns only the days that have news, so a fortnight with four
   * filing days used to plot as four enormous slabs and read as "roughly four
   * a day, every day". A day with nothing is data — it is drawn as a day with
   * nothing.
   */
  const daily = useMemo(() => {
    if (!stats?.from || !stats?.to) return []
    const have = new Map(stats.daily.map((d) => [d.date, d.count]))
    const out: DailyPoint[] = []
    for (let iso = stats.from, guard = 0; guard < 400; iso = shiftIso(iso, 1), guard++) {
      out.push({ date: iso, count: have.get(iso) ?? 0 })
      if (iso === stats.to) break
    }
    return out
  }, [stats])

  const bands = useMemo(() => heatBands(counts), [counts])
  const max = Math.max(...rows.map((r) => r.count), 1)
  const total = rows.reduce((s, r) => s + r.count, 0)
  const covered = rows.filter((r) => r.count > 0).length
  const busiest = rows[0]

  return (
    <div className="viz-root space-y-6">
      <PageHeader
        eyebrow="राज्याचा नकाशा · Coverage"
        title="जिल्हानिहाय प्रमाण"
        description="कोणत्या जिल्ह्यातून किती बातम्या आल्या, कालानुरूप. फक्त मंजूर लेख मोजले जातात — डेस्कने जिल्हा तपासल्याशिवाय कोणताही लेख इथे येत नाही."
        actions={
          <div className="seg" role="group" aria-label="कालावधी">
            {RANGES.map((r) => (
              <button
                key={r.days}
                className="seg-item"
                data-active={days === r.days}
                onClick={() => setDays(r.days)}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="एकूण मंजूर लेख"
          value={toDevanagariDigits(total)}
          sub={stats ? `${stats.from} ते ${stats.to}` : '…'}
          tint="var(--seq-450)"
        />
        <StatCard
          label="जिल्हे समाविष्ट"
          value={`${toDevanagariDigits(covered)} / ${toDevanagariDigits(rows.length)}`}
          sub={covered < rows.length ? `${toDevanagariDigits(rows.length - covered)} जिल्ह्यांतून काहीही नाही` : 'सर्व जिल्हे'}
          tint="var(--ok)"
        />
        <StatCard
          label="सर्वाधिक"
          value={busiest && busiest.count > 0 ? busiest.name : '—'}
          sub={busiest && busiest.count > 0 ? `${toDevanagariDigits(busiest.count)} लेख` : 'या कालावधीत काहीही नाही'}
          tint="var(--accent)"
        />
      </div>

      {/* The map, and beside it whatever district the reader has opened. The
          panel takes a column of its own rather than floating over the state:
          on this page the map is a figure in a document, not the whole screen,
          and a sheet covering it would hide the thing it is describing. */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <div className="card overflow-hidden p-2">
          <MaharashtraMap
            counts={counts}
            selected={selected}
            onSelect={setSelected}
            pending={loading}
          />
          <div
            className="mt-1 flex flex-wrap items-center justify-between gap-3 border-t px-3 py-2.5"
            style={{ borderColor: 'var(--edge)' }}
          >
            <h2 className="text-sm font-semibold">जिल्हानिहाय उष्णता</h2>
            <BandLegend bands={bands} />
          </div>
        </div>

        {selected ? (
          <DistrictPanel
            districtId={selected}
            name={districtName(selected)}
            count={counts.get(selected) ?? 0}
            from={stats?.from ?? ''}
            to={stats?.to ?? ''}
            onClose={() => setSelected(null)}
          />
        ) : (
          <aside className="card self-start p-5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-[10px]"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              <IconMapPin size={18} />
            </span>
            <h3 className="mt-3.5 text-sm font-semibold">जिल्हा निवडा</h3>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              नकाशावरील कोणत्याही जिल्ह्यावर क्लिक करा — त्या कालावधीतील त्या जिल्ह्याचे मंजूर लेख इथे दिसतील.
            </p>
            <ul className="mt-4 list-disc space-y-1.5 pl-4 text-xs marker:text-[color:var(--edge-strong)]" style={{ color: 'var(--faint)' }}>
              <li>स्क्रोलने झूम करा</li>
              <li>ड्रॅगने नकाशा सरकवा</li>
              <li>खालच्या क्रमवारीतून थेट जिल्हा उघडा</li>
            </ul>
          </aside>
        )}
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">दैनंदिन प्रमाण</h2>
          <span className="num text-xs" style={{ color: 'var(--faint)' }}>
            {stats?.from} — {stats?.to}
          </span>
        </div>
        <div className="mt-4">
          {loading ? (
            <div className="flex h-[120px] items-end gap-[2px]">
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} className="skeleton grow" style={{ height: `${25 + ((i * 37) % 70)}%` }} />
              ))}
            </div>
          ) : (
            <VolumeChart data={daily} />
          )}
        </div>
      </section>

      {/* The same numbers as a ranked list. The map answers "where", this
          answers "in what order" — a question a choropleth is genuinely bad
          at, because two adjacent steps of a ramp cannot be ranked by eye. */}
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">क्रमवारी</h2>
          <HeatLegend max={max} />
        </div>

        <div className="mt-4 grid gap-x-8 gap-y-0.5 md:grid-cols-2">
          {rows.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setSelected(r.key === selected ? null : r.key)}
              className="group flex items-center gap-3 rounded-[var(--r-sm)] px-1.5 py-1.5 text-left transition-colors"
              style={
                r.key === selected
                  ? { background: 'var(--accent-soft)' }
                  : undefined
              }
              title={`${r.name} — ${r.count} लेख`}
            >
              <span className="w-28 shrink-0 truncate text-[0.8125rem] group-hover:underline">{r.name}</span>
              <span className="h-2.5 grow rounded-full" style={{ background: 'var(--empty)' }}>
                <span
                  className="block h-2.5 rounded-full transition-[width]"
                  style={{ width: `${Math.max(2, (r.count / max) * 100)}%`, background: heatColor(r.count, max) }}
                />
              </span>
              <span
                className="num w-7 shrink-0 text-right text-[0.8125rem]"
                style={{ color: r.count ? 'var(--text-secondary)' : 'var(--faint)' }}
              >
                {toDevanagariDigits(r.count)}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

/**
 * The key to the map's five steps, as the count range each one stands for.
 *
 * A continuous gradient bar would be a lie about this ramp: the steps are
 * quantiles over the districts that have any news at all, so what a colour
 * means is a range of counts, and the range is what the reader needs to read
 * the sheet. Nothing is drawn for a window with no news in it.
 */
function BandLegend({ bands }: { bands: { level: number; min: number; max: number }[] }) {
  if (!bands.length) return null

  return (
    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
      {bands.map((band) => (
        <span key={band.level} className="flex items-center gap-1.5">
          <span
            className="block h-2.5 w-5 rounded-[2px]"
            style={{ background: BAND_COLORS[band.level - 1] }}
          />
          <span className="num">
            {band.min === band.max
              ? toDevanagariDigits(band.min)
              : `${toDevanagariDigits(band.min)}–${toDevanagariDigits(band.max)}`}
          </span>
        </span>
      ))}
      <span>लेख</span>
    </div>
  )
}
