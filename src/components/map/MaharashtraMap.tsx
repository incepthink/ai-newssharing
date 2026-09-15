'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MAP, heatLevels, type DistrictShape } from './geometry'
import { useMapCamera } from './use-map-camera'
import { toDevanagariDigits } from '@/lib/marathi'
import './map.css'

/** Half the readout's widest state, used to keep it inside the frame. */
const PLATE_REACH = 130
/** Above this the plate would run off the top, so it flips under the pointer. */
const PLATE_HEIGHT = 96
/** How long the coast-to-Vidarbha entrance sweep takes, end to end. */
const SWEEP_MS = 620

interface MaharashtraMapProps {
  /** District key to approved-article count for the window on screen. */
  counts: Map<string, number>
  /** The district whose panel is open, drawn as picked out. */
  selected: string | null
  /** Fires for empty districts too — see `pickDistrict`. */
  onSelect: (districtId: string | null) => void
  /** True while the window is being refetched. The map stays live. */
  pending?: boolean
}

/**
 * The state coloured in by how much news came out of each district.
 *
 * The choropleth is the mark rather than a pin per article, and that is a
 * claim about what the data knows: an article carries a district and nothing
 * finer, so a pin would have to be dropped on a district centroid — a dot in a
 * field outside Ambajogai, inviting the reader to believe something happened
 * there. Colouring the whole shape says exactly what is known. The unit of the
 * data becomes the unit of the mark.
 *
 * Ported from `maharashtra-is-building`. The boundaries are the same ones,
 * projected offline (`scripts/build-map-geometry.mjs`); the camera is the same
 * gesture model rewritten without the animation library; the ramp is this
 * project's own blue sequential scale rather than that one's violet, because
 * the heat table and the legend on the same page already speak in it.
 */
export function MaharashtraMap({ counts, selected, onSelect, pending }: MaharashtraMapProps) {
  const { svgRef, groupRef, isPanning, hasDragged, zoomBy, reset, surfaceProps } = useMapCamera(
    MAP.size,
  )

  const frameRef = useRef<HTMLDivElement>(null)
  const frameBox = useRef<DOMRect | null>(null)
  const plateRef = useRef<HTMLDivElement>(null)
  const [pointed, setPointed] = useState<DistrictShape | null>(null)
  const [plateBelow, setPlateBelow] = useState(false)

  const levels = useMemo(() => heatLevels(counts), [counts])

  /**
   * What each shape is called, for anyone reading the map without seeing it.
   *
   * The fill carries a number now, so a title of only the district's name
   * would hand a screen reader thirty-six place names and none of the data.
   * Every district gets a label, including the ones with nothing in the
   * window: "no news" is an answer, and a shape that says nothing at all is
   * indistinguishable from one the map forgot.
   */
  const labels = useMemo(() => {
    const named: Record<string, string> = {}
    for (const district of MAP.districts) {
      const count = counts.get(district.id) ?? 0
      named[district.id] =
        count === 0
          ? `${district.mr} — बातमी नाही`
          : `${district.mr} — ${toDevanagariDigits(count)} लेख`
    }
    return named
  }, [counts])

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return

    const measure = () => {
      frameBox.current = frame.getBoundingClientRect()
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(frame)
    window.addEventListener('scroll', measure, true)

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', measure, true)
    }
  }, [])

  /**
   * The plate follows the pointer by writing its own transform, not by
   * re-rendering: a pointermove fires per frame, and putting the cursor in
   * React state would rebuild the whole map to move a tooltip.
   */
  const trackPointer = useCallback((event: { clientX: number; clientY: number }) => {
    const box = frameBox.current
    if (!box) return

    const top = event.clientY - box.top
    const left = clampToFrame(event.clientX - box.left, box.width)

    plateRef.current?.style.setProperty('--plate-x', `${left}px`)
    plateRef.current?.style.setProperty('--plate-y', `${top}px`)
    // React bails out when the value is unchanged, so this is a no-op for all
    // but the two moves that actually cross the threshold.
    setPlateBelow(top < PLATE_HEIGHT)
  }, [])

  const enter = useCallback(
    (district: DistrictShape) => {
      if (isPanning) return
      setPointed(district)
    },
    [isPanning],
  )

  const leave = useCallback((district: DistrictShape) => {
    setPointed((current) => (current?.id === district.id ? null : current))
  }, [])

  /**
   * Click the land: open that district, or close it if it was already open.
   *
   * It fires whether or not the district has any news, and that is the point.
   * "Is anything happening near me" is the question a reader arrives with, and
   * a district that refuses to respond to a click reads as a broken map rather
   * than as an empty one. The panel answers "nothing in this window" in words,
   * in the place the question was asked.
   *
   * A drag that ended over a district is a pan, not a click, so `hasDragged`
   * gets the first word.
   */
  const pickDistrict = useCallback(
    (district: DistrictShape) => {
      if (hasDragged()) return
      onSelect(selected === district.id ? null : district.id)
    },
    [hasDragged, onSelect, selected],
  )

  const pointedCount = pointed ? (counts.get(pointed.id) ?? 0) : 0

  return (
    <div
      ref={frameRef}
      className="map-frame"
      tabIndex={-1}
      data-panning={isPanning || undefined}
      data-pending={pending || undefined}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onSelect(null)
        if (event.key === '+' || event.key === '=') zoomBy(1.5)
        if (event.key === '-') zoomBy(1 / 1.5)
      }}
    >
      <div className="map-sheet-grid" aria-hidden />

      <svg
        ref={svgRef}
        viewBox={MAP.viewBox}
        className="map-surface"
        role="img"
        aria-label="महाराष्ट्रातील ३६ जिल्ह्यांचा बातमी-नकाशा"
        preserveAspectRatio="xMidYMid meet"
        {...surfaceProps}
        onClick={(event) => {
          // A click that landed on the sea rather than on a district.
          if (event.target !== event.currentTarget || hasDragged()) return
          onSelect(null)
        }}
      >
        <defs>
          {/* Defined once and referenced four times — the sheet, its shadow,
              the clip and the coastline — instead of four copies of an 80 kB
              path string in the DOM. */}
          <path id="map-land-shape" d={MAP.landPath} />
          <clipPath id="map-land-clip">
            <use href="#map-land-shape" />
          </clipPath>

          <linearGradient id="map-land-fill" x1="0" y1="0" x2="0.7" y2="1">
            <stop offset="0%" stopColor="var(--land)" />
            <stop offset="100%" stopColor="var(--land-deep)" />
          </linearGradient>

          {/* The cast under the state. There is no paper beneath the land —
              the frame is the page — so this is the one thing separating the
              two, and a shape this large needs a long cast to read as raised
              rather than as a shape with a dark edge. */}
          <filter id="map-contact" x="-18%" y="-18%" width="136%" height="136%">
            <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#2a2622" floodOpacity="0.14" />
          </filter>
        </defs>

        <g ref={groupRef} className="map-camera">
          {/* The sheet: one gradient across the whole silhouette. Everything
              else is printed on top of this one shape. */}
          <use
            href="#map-land-shape"
            className="map-sheet"
            fill="url(#map-land-fill)"
            filter="url(#map-contact)"
            aria-hidden
          />

          <g clipPath="url(#map-land-clip)">
            {/* The choropleth, under every line on the sheet so no border is
                ever printed over. Its own layer rather than a fill on the
                district shapes: those are painted largest-first so small ones
                stay hoverable, and a fill there would have Mumbai City's
                colour overpainted by Thane's border. */}
            <g className="map-choropleth" aria-hidden>
              {MAP.districts.map((district) => {
                const level = levels[district.id] ?? 0
                // Level 0 is not the bottom of the ramp, it is the absence of
                // one. "No news reached us from here" and "least news in the
                // state" are different statements; one colour would merge them.
                if (level < 1) return null

                return (
                  <path
                    key={district.id}
                    className="map-choropleth-fill"
                    data-level={level}
                    d={district.d}
                  />
                )
              })}
            </g>

            <g className="map-districts">
              {MAP.districts.map((district) => (
                <DistrictPath
                  key={district.id}
                  district={district}
                  delay={(district.centroid[0] / MAP.size[0]) * SWEEP_MS}
                  label={labels[district.id]}
                  onPointerEnter={enter}
                  onLeave={leave}
                  onMove={trackPointer}
                  onSelect={pickDistrict}
                />
              ))}
            </g>

            {/* The district whose panel is open. Its own layer above the
                hairlines for the same reason the choropleth is one: as a state
                on the shape, a lit Mumbai City would have Thane's border drawn
                over the top of it. Inert to the pointer, so hover still
                belongs to the hit area underneath. */}
            <g className="map-lit" aria-hidden>
              {MAP.districts
                .filter((district) => district.id === selected)
                .map((district) => (
                  <path key={district.id} className="map-district-lit" d={district.d} />
                ))}
            </g>
          </g>

          {/* The state's outer line, drawn last so no internal border ever
              crosses it. Wider than anything inside it. */}
          <use href="#map-land-shape" className="map-coast" aria-hidden />
        </g>
      </svg>

      {/* The plate that trails the pointer. `aria-hidden` because it follows a
          cursor; the title on each district is what a screen reader reads. */}
      <div
        ref={plateRef}
        className="map-readout"
        data-visible={pointed ? '' : undefined}
        data-below={plateBelow ? '' : undefined}
        aria-hidden
      >
        <div className="map-readout-card">
          <span className="map-readout-name">{pointed?.mr}</span>
          <span className="map-readout-count">
            {pointedCount === 0 ? 'बातमी नाही' : `${toDevanagariDigits(pointedCount)} लेख`}
          </span>
        </div>
      </div>

      <div className="map-controls">
        <button type="button" onClick={() => zoomBy(1.6)} aria-label="जवळ">
          <Glyph d="M8 3.5v9M3.5 8h9" />
        </button>
        <span className="map-controls-rule" aria-hidden />
        <button type="button" onClick={() => zoomBy(1 / 1.6)} aria-label="दूर">
          <Glyph d="M3.5 8h9" />
        </button>
        <span className="map-controls-rule" aria-hidden />
        <button type="button" onClick={reset} aria-label="पूर्ववत">
          <Glyph d="M6 2.5v3.5H2.5M10 13.5V10h3.5M2.5 10H6v3.5M13.5 6H10V2.5" />
        </button>
      </div>

      <p className="map-attribution">
        जिल्हा सीमा: geoBoundaries (ADM2). रंग = मंजूर लेखांची संख्या, राज्यातील क्रमवारीनुसार.
      </p>
    </div>
  )
}

/**
 * One district: a hairline and a hit area over the shared sheet.
 *
 * Memoised, because the frame re-renders whenever the pointer crosses into a
 * new shape and thirty-six unchanged silhouettes should not be rebuilt for it.
 */
const DistrictPath = memo(function DistrictPath({
  district,
  delay,
  label,
  onPointerEnter,
  onLeave,
  onMove,
  onSelect,
}: {
  district: DistrictShape
  /** Staggers the entrance so the state fills in from the coast eastward. */
  delay: number
  label: string
  onPointerEnter: (district: DistrictShape) => void
  onLeave: (district: DistrictShape) => void
  onMove: (event: React.PointerEvent<SVGPathElement>) => void
  onSelect: (district: DistrictShape) => void
}) {
  return (
    <path
      d={district.d}
      className="map-district"
      style={{ animationDelay: `${delay}ms` }}
      onPointerEnter={() => onPointerEnter(district)}
      onPointerLeave={() => onLeave(district)}
      onPointerMove={onMove}
      onClick={() => onSelect(district)}
    >
      <title>{label}</title>
    </path>
  )
})

function Glyph({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d={d} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function clampToFrame(value: number, frameWidth: number): number {
  if (frameWidth < PLATE_REACH * 2) return frameWidth / 2
  return Math.min(frameWidth - PLATE_REACH, Math.max(PLATE_REACH, value))
}
