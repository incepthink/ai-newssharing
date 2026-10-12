import {
  Building,
  Droplets,
  Factory,
  HeartPulse,
  Landmark,
  Newspaper,
  ShieldAlert,
  Sprout,
  Trees,
  type LucideIcon,
} from "lucide-react";

import { TOPICS, type TopicId } from "@/lib/news/public";

/**
 * How each topic is drawn on the map: a glyph on a disc of its own hue.
 *
 * The topics are `/news`'s chips — the same keyword rules, read the same way —
 * so the registry adds only what a map needs and a chip does not: an icon and
 * a colour. The hues are the sector tokens maharashtra-is-building chose to
 * clear 3:1 against a white glyph, so the icon never has to know what it is
 * standing on.
 *
 * `general` is a release no rule matched. It still gets a mark, in the
 * directorate's own green, because "a release came out of here" is true
 * whether or not a keyword caught its subject.
 */
export type TopicMarkId = TopicId | "general";

export type TopicMark = {
  id: TopicMarkId;
  labelMr: string;
  icon: LucideIcon;
  tint: string;
};

const LOOK: Record<TopicId, { icon: LucideIcon; tint: string }> = {
  drought: { icon: Droplets, tint: "var(--color-sector-water)" },
  farming: { icon: Sprout, tint: "var(--color-sector-agriculture)" },
  industry: { icon: Factory, tint: "var(--color-sector-manufacturing)" },
  "health-education": { icon: HeartPulse, tint: "var(--color-sector-research)" },
  culture: { icon: Landmark, tint: "var(--color-sector-public-systems)" },
  safety: { icon: ShieldAlert, tint: "var(--color-sector-transportation)" },
  cities: { icon: Building, tint: "var(--color-sector-infrastructure)" },
  environment: { icon: Trees, tint: "var(--color-sector-environment)" },
};

/** In chip order, then the catch-all — the order the legend prints. */
export const TOPIC_MARKS: TopicMark[] = [
  ...TOPICS.map((topic) => ({ id: topic.id, labelMr: topic.label, ...LOOK[topic.id] })),
  { id: "general", labelMr: "इतर प्रसिद्धीपत्रके", icon: Newspaper, tint: "var(--color-official)" },
];

const BY_ID = new Map(TOPIC_MARKS.map((mark) => [mark.id, mark]));

export function topicMarkOf(topic: TopicId | null | undefined): TopicMark {
  return BY_ID.get(topic ?? "general") ?? BY_ID.get("general")!;
}
