import { getArticle, listArticles } from '@/lib/db'
import { DGIPR_MR } from '@/lib/dgipr/marathi'
import { loadCorpus, toRelease, type Corpus, type Row } from '@/lib/dgipr/from-db'
import { releaseBodyLines } from '@/lib/dgipr/summary'
import { districtNameMr } from '@/lib/news/marathi'
import type { Article, Language } from '@/lib/types'
import { mrDigits, topicLabel, topicOf, type NewsItem } from './public'

/**
 * The approved corpus as the public news page reads it.
 *
 * `loadCorpus` stays the source of truth — the same call `/map` makes — and the
 * second read only annotates it with the two columns a release does not carry:
 * the language, and whether the row has a real approval time or only its fold
 * date. Nothing here adds a release or a field the desk did not write; the
 * topic and the विशेष लेख flag are readings of the text, documented where
 * they are made.
 */

export type Meta = { language: Language; timed: boolean }

export type NewsCorpus = {
  corpus: Corpus
  items: NewsItem[]
  /** Keyed by release id, for the server-side filters that need the row. */
  rows: Map<string, { row: Row; meta: Meta; item: NewsItem }>
}

export async function loadNewsCorpus(): Promise<NewsCorpus> {
  const [corpus, approved] = await Promise.all([loadCorpus(), listArticles({ status: 'approved' })])
  const meta = new Map<string, Meta>(
    approved.map((a) => [String(a.id), { language: a.language, timed: Boolean(a.approved_at) }]),
  )
  const rows = new Map<string, { row: Row; meta: Meta; item: NewsItem }>()
  const items = corpus.rows.map((row) => {
    const m = meta.get(row.release.id) ?? { language: 'mr' as Language, timed: false }
    const item = toNewsItem(row, m)
    rows.set(item.id, { row, meta: m, item })
    return item
  })
  return { corpus, items, rows }
}

export function toNewsItem(row: Row, meta: Meta): NewsItem {
  const r = row.release
  const summary = r.summary60Mr?.trim() || null
  const topic = topicOf(r.titleMr, summary)
  const at = new Date(meta.timed ? row.article.publishedAt : `${r.date}T12:00:00Z`)
  const valid = !Number.isNaN(at.getTime())
  const time = meta.timed && valid ? fmt(at, { hour: 'numeric', minute: '2-digit', hourCycle: 'h23' }) : null
  const day = valid ? fmt(at, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : r.date

  return {
    id: r.id,
    href: r.readerUrl ?? `/news/${r.id}`,
    docx: r.docxUrl ?? null,
    title: r.titleMr,
    summary,
    place: r.districtId ? districtNameMr(r.districtId) : DGIPR_MR.statewide,
    districtId: r.districtId,
    topic,
    topicLabel: topic ? topicLabel(topic) : (deptLabel(r.departmentMr) ?? 'प्रसिद्धीपत्रक'),
    dept: deptLabel(r.departmentMr),
    date: r.date,
    dateLabel: valid ? fmt(at, { day: 'numeric', month: 'short' }) : r.date,
    time,
    dateFull: time ? `${day}, ${time}` : day,
    no: r.releaseNo ? mrDigits(r.releaseNo) : null,
    img: r.posterUrl,
    credit: r.posterCreditMr ?? null,
    video: r.videoUrl ?? null,
    cm: r.featured,
    ministers: row.ministers,
    language: meta.language,
    feature: isFeature(r.titleMr, r.datelineMr, r.summaryMr),
  }
}

/**
 * Whether a row reads as a विशेष लेख — a long-form piece — rather than a
 * release. There is no column for it: Mahasamvad files its features under a
 * category the import does not keep. What a feature does not have is a
 * dateline (`मुंबई, दि. ३ :`), because it is not reporting an event, and what
 * it does have is length. A release that says so in its headline counts too.
 */
function isFeature(title: string, dateline: string | null, text: string): boolean {
  if (/विशेष लेख/.test(title)) return true
  if (/जय महाराष्ट्र|दिलखुलास/.test(title)) return false
  if (dateline || text.length <= 2500) return false
  /* A release opens on its standfirst lines and then the dateline —
     `नांदेड (जिमाका), दि. १९:`, `नागपूर दि. 21:`, `Mumbai, September 2 :` —
     so the dateline is looked for in the opening lines, not only the first. */
  const opening = text.slice(0, 900)
  return !(DATELINE_MR.test(opening) || DATELINE_EN.test(opening))
}

const DATELINE_MR = /(?:^|\n)[^\n]{1,60}?[\s,(](?:दि|ता)\s*\.?\s*[०-९0-9]{1,2}/
const DATELINE_EN = /(?:^|\n)[A-Z][A-Za-z ]{1,30},\s*[A-Z][a-z]+\s+\d{1,2}\s*:/

/** `(गृह विभाग)` as the sheet prints it, without the sheet's brackets. */
export function deptLabel(dept: string | null | undefined): string | null {
  return dept ? dept.replace(/^\s*\(\s*|\s*\)\s*$/g, '') : null
}

function fmt(at: Date, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('mr-IN', { timeZone: 'Asia/Kolkata', ...opts }).format(at)
}

/* ------------------------------------------------------------- one release */

export type ReaderPayload = {
  item: NewsItem
  /** The approved text, line by line, as the desk holds it. */
  body: string[]
  issuedBy: string | null
  related: NewsItem[]
}

/**
 * Everything the reading panel shows for one release: its full text and up to
 * three related releases — same district, else same topic, else same
 * department. Approved rows only; anything else is not found.
 */
export async function readerPayload(id: string): Promise<ReaderPayload | null> {
  const n = Number(id)
  if (!Number.isInteger(n) || n <= 0) return null
  const article: Article | null = await getArticle(n)
  if (!article || article.status !== 'approved') return null

  const { items } = await loadNewsCorpus()
  const item = items.find((x) => x.id === id)
  if (!item) return null

  const release = toRelease(article)
  const body = releaseBodyLines(release.summaryMr, { titleMr: release.titleMr, attributionMr: release.attributionMr })

  const others = items.filter((x) => x.id !== id)
  const near = others.filter((x) => (item.districtId && x.districtId === item.districtId) || (item.topic && x.topic === item.topic))
  const sameDept = others.filter((x) => item.dept && x.dept === item.dept && !near.includes(x))

  return {
    item,
    body,
    issuedBy: release.authorMr,
    related: [...near, ...sameDept].slice(0, 3),
  }
}
