import { SPECIAL_COVERAGE, VIDEO_PROGRAMMES, type SpecialCoverage, type VideoProgramme } from '@/data/news-editorial'
import { searchItems, type NewsItem } from './public'

/**
 * What the योजना and व्हिडिओ pages (and their bands on `/news`) hold, read
 * from the approved corpus. Pure, like `./public.ts`: the same selection on
 * the home page's bands, the hub pages and each scheme's or programme's own
 * page, so a release cannot be in one and missing from another.
 */

const hasMedia = (i: NewsItem) => Boolean(i.img || i.video)

/** Releases with a photograph or a video first, each group newest first. */
export function mediaFirst(rows: NewsItem[]): NewsItem[] {
  return [...rows.filter(hasMedia), ...rows.filter((i) => !hasMedia(i))]
}

/* ------------------------------------------------------------------ योजना */

export function schemeBySlug(slug: string): SpecialCoverage | undefined {
  return SPECIAL_COVERAGE.find((c) => c.anchor === slug)
}

/** `दुष्काळ २०२६` — the title up to its colon, for chips and badges. */
export function schemeName(c: SpecialCoverage): string {
  return c.title.split(' : ')[0].trim()
}

/** The words a chip for the whole scheme searches. */
export function schemeQuery(c: SpecialCoverage): string {
  return 'query' in c.select ? c.select.query : schemeName(c).replace(/\s*[०-९\d]+$/, '')
}

/** The releases a scheme covers: the posts Mahasamvad files under its
 *  category, with the ones its topic rule picks out or a search of the corpus
 *  finds. Newest first. */
export function schemeReleases(items: NewsItem[], c: SpecialCoverage): NewsItem[] {
  const sel = c.select
  const picked = new Set('topic' in sel ? items.filter((i) => i.topic === sel.topic) : searchItems(items, sel.query))
  return items.filter((i) => picked.has(i) || (c.category !== undefined && i.categories.includes(c.category)))
}

/** A decision is shown only when a search for it finds an approved release. */
export function liveDecisions(items: NewsItem[], c: SpecialCoverage): SpecialCoverage['decisions'] {
  return c.decisions.filter((d) => searchItems(items, d.query).length > 0)
}

/** The releases each figure was taken from, found in the corpus where they
 *  are there. */
export function figureSources(items: NewsItem[], c: SpecialCoverage): Array<{ no: string; item: NewsItem | null }> {
  return [...new Set(c.figures.map((f) => f.source))].map((no) => ({ no, item: items.find((i) => i.no === no) ?? null }))
}

/* ---------------------------------------------------------------- व्हिडिओ */

export function programmeBySlug(slug: string): VideoProgramme | undefined {
  return VIDEO_PROGRAMMES.find((p) => p.slug === slug)
}

/**
 * Each programme's episodes, keyed by slug. An episode is the directorate's
 * announcement of the programme's interview — its headline names the
 * programme and says मुलाखत. A story that only quotes the slogan
 * ("…‘जय महाराष्ट्र’चा निनाद") is not one.
 *
 * Most interviews air on both programmes under one joint release, whose
 * photograph is the जय महाराष्ट्र card. So दिलखुलास leads with its newest
 * episode of its own, else one जय महाराष्ट्र is not already leading.
 */
export function programmeEpisodes(items: NewsItem[]): Map<string, NewsItem[]> {
  const episodesOf = (name: string) => items.filter((i) => i.title.includes(name) && i.title.includes('मुलाखत'))
  const out = new Map<string, NewsItem[]>()
  for (const p of VIDEO_PROGRAMMES) out.set(p.slug, episodesOf(p.name))

  const jai = out.get('jai-maharashtra') ?? []
  const dil = out.get('dilkhulas') ?? []
  const lead =
    dil.find((i) => !i.title.includes('जय महाराष्ट्र')) ?? dil.find((i) => i.id !== jai[0]?.id) ?? dil[0]
  if (lead) out.set('dilkhulas', [lead, ...dil.filter((i) => i !== lead)])
  return out
}
