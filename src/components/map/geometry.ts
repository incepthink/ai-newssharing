import raw from '@/data/maharashtra-geometry.json'
import { DISTRICTS } from '@/lib/districts'

/** One district, already projected into the map's viewBox coordinate space. */
export interface DistrictShape {
  /** The same canonical key the database stores. See `lib/districts.ts`. */
  id: string
  mr: string
  /** SVG path data in viewBox units. */
  d: string
  centroid: [x: number, y: number]
  /** Projected area in square viewBox units — drives paint order. */
  area: number
}

export interface MapGeometry {
  /** Always `0 0 W H` — the projection is pre-translated to suit. */
  viewBox: string
  size: [width: number, height: number]
  /** Union of all 36 districts as one path, stroked as the coastline. */
  landPath: string
  /** Sorted largest-first so small districts stay hoverable on top. */
  districts: DistrictShape[]
}

const NAMES = new Map(DISTRICTS.map((d) => [d.key, d.mr]))

/**
 * The boundaries, built offline by `scripts/build-map-geometry.mjs` and joined
 * here to the Marathi names this app already keeps.
 *
 * Geometry and naming are deliberately kept apart: the shapes come from a
 * boundary file with a vintage of its own, and `lib/districts.ts` is what the
 * desk, the heat table and the database all agree a district is called. A
 * rename — Aurangabad to Chhatrapati Sambhajinagar — is an edit in one place.
 */
export const MAP: MapGeometry = {
  viewBox: raw.viewBox,
  size: raw.size as [number, number],
  landPath: raw.landPath,
  districts: raw.districts.map((d) => ({
    id: d.id,
    mr: NAMES.get(d.id) ?? d.id,
    d: d.d,
    centroid: d.centroid as [number, number],
    area: d.area,
  })),
}

/** How many ramp steps the choropleth has. Level 0 is not a step — see below. */
export const LEVELS = 5

/**
 * District key to ramp step, 1–5, by quantile over the districts that have any
 * news at all.
 *
 * Quantiles rather than equal-width bins because the distribution is not
 * remotely even: Mumbai and Pune file several times what Gadchiroli does, and
 * five equal slices of that range put thirty districts in the palest one and
 * paint the map as an empty state. Ranking answers the question a reader
 * actually has — where is this district in the state — and keeps every step
 * populated.
 *
 * Districts with no articles are absent from the result rather than given
 * level 0. "No news reached us from here" and "least news in the state" are
 * different statements and must not share a colour.
 */
export function heatLevels(counts: Map<string, number>): Record<string, number> {
  const ranked = [...counts.values()].filter((n) => n > 0).sort((a, b) => a - b)
  if (!ranked.length) return {}

  const levels: Record<string, number> = {}
  for (const [key, count] of counts) {
    if (count > 0) levels[key] = levelOf(count, ranked)
  }
  return levels
}

/** The bands behind the legend: the count range each step stands for. */
export function heatBands(counts: Map<string, number>): { level: number; min: number; max: number }[] {
  const ranked = [...counts.values()].filter((n) => n > 0).sort((a, b) => a - b)
  if (!ranked.length) return []

  const bands = new Map<number, { min: number; max: number }>()
  for (const count of ranked) {
    const level = levelOf(count, ranked)
    const band = bands.get(level)
    bands.set(level, {
      min: Math.min(band?.min ?? count, count),
      max: Math.max(band?.max ?? count, count),
    })
  }

  return [...bands.entries()]
    .map(([level, band]) => ({ level, ...band }))
    .sort((a, b) => a.level - b.level)
}

/**
 * Where `count` ranks among the non-zero counts, as a step.
 *
 * Ties land on the same step by construction — the rank used is the first
 * index at which the value appears — so two districts on four articles are
 * never painted differently.
 */
function levelOf(count: number, ranked: number[]): number {
  const rank = ranked.indexOf(count)
  return Math.min(LEVELS, Math.floor((rank / ranked.length) * LEVELS) + 1)
}
