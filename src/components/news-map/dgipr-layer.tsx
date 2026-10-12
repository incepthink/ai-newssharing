"use client";

import { type MotionValue } from "motion/react";
import { memo, useEffect, useMemo, useRef } from "react";

import { TOPIC_MARKS, topicMarkOf, type TopicMark } from "@/data/topic-marks";
import { datelineMr, releaseCountMr } from "@/lib/dgipr/marathi";
import { toDevanagari } from "@/lib/news/marathi";
import type { DistrictShape } from "@/types/map";
import type { DgiprRelease } from "@/types/dgipr";

/** The disc the topic glyph sits on, in screen pixels — see `useStake`. */
const HEAD = 10;
/** The glyph inside it — sized off `HEAD` so the two stay in proportion. */
const GLYPH = Math.round(HEAD * 1.2);
/** How far a lone head stands above its district's centroid. */
const LIFT = 20;
/** How far fanned heads stand from the centroid, per ring. */
const RING = 26;
/** Heads per ring before a second ring opens outside the first. */
const PER_RING = 6;

type Group = {
  districtId: string;
  mark: TopicMark;
  /** This district's releases on this topic, newest first. */
  releases: DgiprRelease[];
  /** Where the head sits, relative to the centroid. */
  head: [x: number, y: number];
};

type Placed = {
  districtId: string;
  at: [x: number, y: number];
  groups: Group[];
};

type DgiprLayerProps = {
  /** Grouped by district on the server; unplaced releases never arrive here. */
  byDistrict: Record<string, DgiprRelease[]>;
  districts: DistrictShape[];
  /** The camera's zoom, which every mark counter-scales against. */
  scale: MotionValue<number>;
  selectedId: string | null;
  onSelect: (release: DgiprRelease) => void;
};

/**
 * Government press releases, one pin per subject per district.
 *
 * The pin is maharashtra-is-building's: an anchor on the ground, a stem, and a
 * disc in the subject's hue with the subject's glyph on it — so शेती reads as
 * a sprout, दुष्काळ as a drop, and a reader can see *what* a district is
 * issuing about before opening anything. The subjects are `/news`'s topic
 * chips, read by the same rule; see `data/topic-marks.ts`.
 *
 * The anchor is the district centroid, because a dateline is not a coordinate.
 * Several subjects in one district share that one anchor and fan their heads
 * around it, which says "these are all here" without claiming any of them is
 * at a different point. Releases on the same subject stack into one head with
 * a count, opening the newest; the panel lists the rest.
 */
export const DgiprLayer = memo(function DgiprLayer({
  byDistrict,
  districts,
  scale,
  selectedId,
  onSelect,
}: DgiprLayerProps) {
  const placed = useMemo(() => place(byDistrict, districts), [byDistrict, districts]);

  return (
    <g className="map-dgipr">
      {placed.map(({ districtId, at, groups }) => (
        <DistrictMarks
          key={districtId}
          at={at}
          groups={groups}
          scale={scale}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </g>
  );
});

/**
 * One anchor per district, standing on the centroid, with a head per subject.
 *
 * Subjects are ordered by the legend's order, so the same district lays out
 * the same way on every render and a reader's eye can come back to a mark.
 */
function place(
  byDistrict: Record<string, DgiprRelease[]>,
  districts: DistrictShape[],
): Placed[] {
  const centroids = new Map(districts.map((district) => [district.id, district.centroid]));
  const order = new Map(TOPIC_MARKS.map((mark, index) => [mark.id, index]));
  const placed: Placed[] = [];

  for (const [districtId, releases] of Object.entries(byDistrict)) {
    const centroid = centroids.get(districtId);
    if (!centroid || releases.length === 0) continue;

    const bySubject = new Map<TopicMark, DgiprRelease[]>();

    // Newest first is how the server hands them over, and each bucket keeps it.
    for (const release of releases) {
      const mark = topicMarkOf(release.topic);
      const bucket = bySubject.get(mark);

      if (bucket) bucket.push(release);
      else bySubject.set(mark, [release]);
    }

    const subjects = [...bySubject.entries()].sort(
      ([a], [b]) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
    );

    placed.push({
      districtId,
      at: [centroid[0], centroid[1]],
      groups: subjects.map(([mark, list], index) => ({
        districtId,
        mark,
        releases: list,
        head: fan(subjects.length, index),
      })),
    });
  }

  return placed;
}

/** A deterministic rosette: a lone head stands straight up, several ring it. */
function fan(count: number, index: number): [number, number] {
  if (count < 2) return [0, -LIFT];

  const ring = Math.floor(index / PER_RING) + 1;
  const slot = index % PER_RING;
  const slots = Math.min(count - (ring - 1) * PER_RING, PER_RING);
  // Starts at the top and goes clockwise; the second ring is turned half a
  // slot so its heads sit in the gaps of the first.
  const angle = ((slot + (ring - 1) * 0.5) / slots) * Math.PI * 2 - Math.PI / 2;

  return [Math.cos(angle) * RING * ring, Math.sin(angle) * RING * ring];
}

function DistrictMarks({
  at,
  groups,
  scale,
  selectedId,
  onSelect,
}: {
  at: [x: number, y: number];
  groups: Group[];
  scale: MotionValue<number>;
  selectedId: string | null;
  onSelect: (release: DgiprRelease) => void;
}) {
  const ref = useStake(at, scale);

  return (
    <g ref={ref} className="map-dgipr-district" transform={`translate(${at[0]} ${at[1]})`}>
      {/* The stems first and the heads after, so no stem is ever drawn across
          a neighbouring head in a crowded rosette. */}
      {groups.map(({ mark, head }) => (
        <path key={mark.id} className="map-dgipr-stem" d={stemPath(head[0], head[1], HEAD)} />
      ))}

      {/* One anchor for the whole district: the place the dateline names. */}
      <circle className="map-dgipr-anchor" r="2" />

      {groups.map((group, index) => (
        <TopicPin
          key={group.mark.id}
          group={group}
          delay={index * 40}
          selected={group.releases.some((release) => release.id === selectedId)}
          onSelect={onSelect}
        />
      ))}
    </g>
  );
}

function TopicPin({
  group,
  delay,
  selected,
  onSelect,
}: {
  group: Group;
  delay: number;
  selected: boolean;
  onSelect: (release: DgiprRelease) => void;
}) {
  const { mark, releases, head } = group;
  const [x, y] = head;
  const lead = releases[0];
  const Icon = mark.icon;
  const stacked = releases.length;

  return (
    <g
      className="map-dgipr-mark"
      data-selected={selected || undefined}
      style={{ animationDelay: `${delay}ms` }}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={() => onSelect(lead)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;

        event.preventDefault();
        onSelect(lead);
      }}
    >
      {/* The subject, the place, the count and the headline the mark opens. */}
      <title>
        {`${mark.labelMr} · ${datelineMr(lead)} — ${releaseCountMr(stacked)}: ${lead.titleMr}`}
      </title>

      <g className="map-dgipr-body">
        <circle className="map-dgipr-ring" cx={x} cy={y} r={HEAD + 3.5} />
        <circle className="map-dgipr-head" cx={x} cy={y} r={HEAD} style={{ fill: mark.tint }} />
        <Icon
          className="map-dgipr-icon"
          x={x - GLYPH / 2}
          y={y - GLYPH / 2}
          width={GLYPH}
          height={GLYPH}
          strokeWidth={2.2}
          aria-hidden
        />

        {/* Said only when the subject has more than one release here. */}
        {stacked > 1 ? (
          <g className="map-dgipr-badge" transform={`translate(${x + HEAD * 0.8} ${y - HEAD * 0.8})`}>
            <circle r="4.6" />
            <text dy="0.35em">{toDevanagari(stacked)}</text>
          </g>
        ) : null}
      </g>

      {/* A finger-sized target over the head. */}
      <circle className="map-dgipr-hit" cx={x} cy={y} r={HEAD + 3} />
    </g>
  );
}

/**
 * The stem, from just outside the anchor to just inside the head, along
 * whatever angle the fan produced. Trimmed at both ends so it never shows
 * through the anchor dot or crosses the disc it is holding up.
 */
function stemPath(x: number, y: number, headRadius: number): string {
  const length = Math.hypot(x, y);

  if (length < 1) return "";

  const unitX = x / length;
  const unitY = y / length;
  const start = 2.5;
  const end = Math.max(start, length - headRadius - 0.5);
  const round = (value: number) => Math.round(value * 100) / 100;

  return `M${round(unitX * start)} ${round(unitY * start)} L${round(unitX * end)} ${round(unitY * end)}`;
}

/**
 * Holds a mark at one size on screen however far the camera is zoomed in.
 *
 * The same stake `PinLayer` uses and for the same reason — the layer is drawn
 * inside `MapCanvas`'s camera group so a mark travels with the land, and the
 * camera is a scale, so every mark has to carry the inverse. Duplicated rather
 * than shared because the two layers are otherwise independent, and a hook
 * lifted out of one of them is the seam a future third layer gets forced
 * through.
 */
function useStake([x, y]: [x: number, y: number], scale: MotionValue<number>) {
  const ref = useRef<SVGGElement>(null);

  useEffect(() => {
    const stake = () => {
      ref.current?.setAttribute("transform", `translate(${x} ${y}) scale(${1 / scale.get()})`);
    };

    stake();

    return scale.on("change", stake);
  }, [x, y, scale]);

  return ref;
}
