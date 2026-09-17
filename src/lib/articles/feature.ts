/**
 * News — the public-facing feature article.
 *
 * This is deliberately a wider record than the desk's `Article`. The desk cares
 * about status, release numbers and who filed; a citizen reading the portal
 * cares about which minister and which department the news belongs to, how long
 * it takes to read, and what it actually means for them. Those last two have no
 * home on the desk record, so they live here.
 *
 * Nothing in this module talks to the database, and nothing in it is a client
 * module: `/news/[id]` renders on the server and needs every label helper here,
 * so they must stay importable from a server component. Swapping the sample
 * data for `GET /api/articles?feature=1` later is one line in the page and no
 * change here.
 */

import { districtName } from '@/lib/districts'
import { toDevanagariDigits } from '@/lib/marathi'

/** What the section is called, wherever the product names it. The English word
 *  is the one the masthead and the breadcrumb use; the Marathi is the page's
 *  own title. Kept here so the two can never drift apart across six files. */
export const NEWS_LABEL = 'News'
export const NEWS_LABEL_MR = 'बातम्या'

/** Ministers are held as designations, never as named individuals: a portfolio
 *  outlives its holder, and sample data should not put words in a real person's
 *  mouth. `all` is the unfiltered choice rather than an empty string, so the
 *  select always has a value and the chip row has something to name. */
export const MINISTERS = [
  { key: 'all', mr: 'सर्व मंत्री' },
  { key: 'cm', mr: 'मुख्यमंत्री' },
  { key: 'dcm', mr: 'उपमुख्यमंत्री' },
  { key: 'agriculture', mr: 'कृषी मंत्री' },
  { key: 'industries', mr: 'उद्योग मंत्री' },
  { key: 'revenue', mr: 'महसूल मंत्री' },
  { key: 'school-education', mr: 'शालेय शिक्षण मंत्री' },
  { key: 'health', mr: 'सार्वजनिक आरोग्य मंत्री' },
  { key: 'wcd', mr: 'महिला व बालविकास मंत्री' },
  { key: 'urban', mr: 'नगरविकास मंत्री' },
  { key: 'rural', mr: 'ग्रामविकास मंत्री' },
] as const

export const DEPARTMENTS = [
  { key: 'all', mr: 'सर्व विभाग' },
  { key: 'agriculture', mr: 'कृषी व शेतकरी कल्याण' },
  { key: 'industries', mr: 'उद्योग' },
  { key: 'health', mr: 'सार्वजनिक आरोग्य' },
  { key: 'school-education', mr: 'शालेय शिक्षण' },
  { key: 'wcd', mr: 'महिला व बालविकास' },
  { key: 'revenue', mr: 'महसूल' },
  { key: 'urban', mr: 'नगरविकास' },
  { key: 'rural', mr: 'ग्रामविकास' },
  { key: 'water', mr: 'जलसंपदा' },
] as const

/** The kind of news, as the portal files it. A department says *who* published;
 *  a category says *what sort of thing happened*, which is the distinction the
 *  badge at the top of an article page is making. */
export const CATEGORIES = [
  { key: 'scheme', mr: 'योजना' },
  { key: 'cabinet', mr: 'मंत्रिमंडळ निर्णय' },
  { key: 'development', mr: 'विकासकामे' },
  { key: 'welfare', mr: 'लोककल्याण' },
  { key: 'administration', mr: 'प्रशासन' },
] as const

export type MinisterKey = (typeof MINISTERS)[number]['key']
export type DepartmentKey = (typeof DEPARTMENTS)[number]['key']
export type CategoryKey = (typeof CATEGORIES)[number]['key']

/** Sentinel district for news that belongs to the whole state rather than to
 *  one place. Kept out of `DISTRICTS` so the canonical 36 stay exactly 36. */
export const STATEWIDE = 'statewide'
export const STATEWIDE_LABEL = 'राज्यव्यापी'

export type SortOrder = 'newest' | 'oldest'

export const SORTS: { key: SortOrder; mr: string }[] = [
  { key: 'newest', mr: 'सर्वात नवीन प्रथम' },
  { key: 'oldest', mr: 'जुने प्रथम' },
]

/** A line lifted out of the body and set large in the margin of the story. */
export interface PullQuote {
  text: string
  /** Who said it — a designation, never a name. Optional: some pull quotes are
   *  a figure rather than a quotation. */
  attribution?: string
}

export interface FeatureArticle {
  id: string
  title: string
  /** The descriptive second deck, set under the headline on the article page. */
  subtitle: string
  /** The two-to-three line standfirst shown on the card. */
  excerpt: string
  /** The whole story in about sixty words — the callout a reader who will not
   *  read five paragraphs still leaves with. */
  summary60: string
  /** Body paragraphs in order — never one blob with newlines in it, because
   *  the article page, the DOCX and the AI context all want the same split. */
  body: string[]
  /** What a citizen takes away. Exported as the DOCX sub-heads and handed to
   *  the assistant as grounding; the article page leads with `summary60`
   *  instead, so these no longer appear on screen. */
  highlights: string[]
  /** An optional line to set large beside the story. */
  pullQuote?: PullQuote
  category: CategoryKey
  minister: Exclude<MinisterKey, 'all'>
  department: Exclude<DepartmentKey, 'all'>
  /** A canonical district key, or `STATEWIDE`. */
  district: string
  /** ISO date, YYYY-MM-DD. */
  publishedAt: string
  /** Free-text tags the search box also looks at. */
  keywords: string[]
  /** Place name opening the dateline, e.g. "मुंबई". */
  dateline: string
  /** Writer credit, as the fold prints it. */
  byline: string
  /** Path to the featured image under `public/`. Absent on every sample
   *  article: inventing press photographs for a prototype would put pictures
   *  in front of events that did not happen, so the hero falls back to a
   *  typographic plate instead. */
  heroImage?: string
}

const LABEL = {
  minister: new Map(MINISTERS.map((m) => [m.key, m.mr])),
  department: new Map(DEPARTMENTS.map((d) => [d.key, d.mr])),
  category: new Map(CATEGORIES.map((c) => [c.key, c.mr])),
}

export function ministerLabel(key: string): string {
  return LABEL.minister.get(key as MinisterKey) ?? key
}

export function departmentLabel(key: string): string {
  return LABEL.department.get(key as DepartmentKey) ?? key
}

export function categoryLabel(key: string): string {
  return LABEL.category.get(key as CategoryKey) ?? key
}

export function districtLabel(district: string): string {
  return district === STATEWIDE ? STATEWIDE_LABEL : districtName(district)
}

/** Where an article lives. One function, so the card, the share sheet and the
 *  `/articles` redirect cannot disagree about the shape of the URL. */
export function articleHref(id: string): string {
  return `/news/${encodeURIComponent(id)}`
}

/**
 * Reading time in whole minutes, floored at one.
 *
 * 180 words a minute rather than the 230 an English blog would assume:
 * Devanagari press-release prose, with its compound official nouns, is read
 * slower than conversational English, and a number that flatters the reader is
 * worse than no number.
 */
export function readingMinutes(body: string[]): number {
  const words = body.join(' ').trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 180))
}

/** "३ मिनिटे वाचन" — and "१ मिनिट वाचन", because the singular is a different word. */
export function readingLabel(article: FeatureArticle): string {
  const m = readingMinutes(article.body)
  return `${toDevanagariDigits(m)} ${m === 1 ? 'मिनिट' : 'मिनिटे'} वाचन`
}

/**
 * Does this article match a free-text query?
 *
 * Headline, excerpt, keywords — and the minister and department labels, so
 * typing "कृषी" finds agriculture news whether or not the word appears in the
 * headline. The body is deliberately excluded: matching on body text makes
 * almost everything match almost everything, and the result stops feeling like
 * a search.
 */
/* --- The filter state ------------------------------------------------------
   Held as one object rather than five `useState` calls: every reset, every
   chip dismissal and every "is anything filtered" check then touches one
   value, and adding a sixth facet later is a field rather than a refactor.
   ------------------------------------------------------------------------ */

export interface Filters {
  q: string
  minister: MinisterKey
  department: DepartmentKey
  /** A district key, `STATEWIDE`, or '' for all. */
  district: string
  sort: SortOrder
}

export const DEFAULT_FILTERS: Filters = {
  q: '',
  minister: 'all',
  department: 'all',
  district: '',
  sort: 'newest',
}

/** Is anything narrowing the list? Sort order is not a filter — it changes the
 *  order of the results, never which results there are. */
export function isFiltered(f: Filters): boolean {
  return (
    f.q.trim() !== '' ||
    f.minister !== 'all' ||
    f.department !== 'all' ||
    f.district !== ''
  )
}

/** Filter, then sort. Pure, so the page has no list logic of its own. */
export function applyFilters(articles: FeatureArticle[], f: Filters): FeatureArticle[] {
  const out = articles.filter(
    (a) =>
      (f.minister === 'all' || a.minister === f.minister) &&
      (f.department === 'all' || a.department === f.department) &&
      (f.district === '' || a.district === f.district) &&
      matchesQuery(a, f.q),
  )

  // Ties broken by id so the order is stable across re-renders — two releases
  // on the same date must not swap places when an unrelated filter changes.
  out.sort((x, y) => {
    const d = x.publishedAt.localeCompare(y.publishedAt)
    if (d !== 0) return f.sort === 'newest' ? -d : d
    return x.id.localeCompare(y.id)
  })
  return out
}

export function matchesQuery(a: FeatureArticle, needle: string): boolean {
  const q = needle.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    a.title,
    a.excerpt,
    ministerLabel(a.minister),
    departmentLabel(a.department),
    ...a.keywords,
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

/**
 * "संबंधित बातम्या" — what else to read after this one.
 *
 * Scored rather than filtered, because a strict "same department" rule leaves
 * the last article in a department with an empty row, which looks like a bug
 * rather than like an editorial judgement. Department is worth most: it is the
 * strongest signal that two releases are about the same programme. Minister,
 * category and shared keywords come next, district last — a reader in Nagpur
 * cares that two stories are about schools before they care that both are
 * Nagpur's.
 *
 * Anything that scores nothing is still eligible, ranked below everything that
 * scored, so the row is full whenever the corpus can fill it. Ties break by
 * date and then by id, so the row does not reshuffle between renders.
 */
export function relatedArticles(
  article: FeatureArticle,
  all: FeatureArticle[],
  limit = 3,
): FeatureArticle[] {
  const keywords = new Set(article.keywords)

  return all
    .filter((a) => a.id !== article.id)
    .map((a) => {
      const shared = a.keywords.filter((k) => keywords.has(k)).length
      const score =
        (a.department === article.department ? 6 : 0) +
        (a.minister === article.minister ? 4 : 0) +
        (a.category === article.category ? 2 : 0) +
        Math.min(shared, 3) * 2 +
        (a.district === article.district ? 1 : 0)
      return { a, score }
    })
    .sort(
      (x, y) =>
        y.score - x.score ||
        y.a.publishedAt.localeCompare(x.a.publishedAt) ||
        x.a.id.localeCompare(y.a.id),
    )
    .slice(0, limit)
    .map((s) => s.a)
}
