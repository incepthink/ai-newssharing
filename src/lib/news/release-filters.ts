import { MINISTER_BY_ID } from '@/data/ministers'
import { resolveDistrict } from '@/lib/districts'
import type { Language } from '@/lib/types'
import { isTopic, type NewsItem, type TopicId } from './public'

/**
 * The filters of सर्व मंजूर प्रसिद्धीपत्रके, as GET parameters. Shared by the
 * server page (first paint, no-JS links), `/api/news/releases` (the list as
 * the reader changes a filter) and the client island that drives it, so the
 * three read and write one URL the same way.
 *
 * Nothing here touches the database; the filtering itself is in
 * `lib/news/releases.ts`.
 */

export const PAGE_SIZE = 8
export const STATEWIDE = 'statewide'
export const LANG_MR: Record<Language, string> = { mr: 'मराठी', hi: 'हिंदी', en: 'English' }

export type Query = Record<string, string | string[] | undefined>

export type Filters = {
  q: string
  district: string
  /** A roster id from `data/ministers.ts`, or '' for every minister. */
  minister: string
  dept: string
  lang: Language | ''
  from: string
  to: string
  cm: boolean
  topic: TopicId | ''
  page: number
}

/** One page of the filtered list, as the page and the API both hand it on. */
export type ReleasePage = {
  shown: NewsItem[]
  /** Rows matching the filters. */
  matched: number
  /** Rows in the whole corpus, for "N पैकी M". */
  total: number
  page: number
  pages: number
  /** The department filter's display name, which needs the server's table. */
  deptName: string | null
}

function one(value: string | string[] | null | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? ''
}

export function parseFilters(query: Query | URLSearchParams): Filters {
  const get = (k: string) => one(query instanceof URLSearchParams ? query.get(k) : query[k])
  const asked = get('district')
  const minister = get('minister')
  const lang = get('lang')
  const topic = get('topic')
  const date = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '')
  return {
    q: get('q').slice(0, 120),
    /* Resolved, never trusted: a district the corpus has never heard of would
       silently filter everything away and look like an outage. */
    district: asked === STATEWIDE ? STATEWIDE : (resolveDistrict(asked) ?? ''),
    minister: MINISTER_BY_ID.has(minister) ? minister : '',
    dept: get('dept'),
    lang: lang === 'mr' || lang === 'hi' || lang === 'en' ? lang : '',
    from: date(get('from')),
    to: date(get('to')),
    cm: get('cat') === 'cm',
    topic: isTopic(topic) ? topic : '',
    page: Math.max(1, Number.parseInt(get('page'), 10) || 1),
  }
}

export function isNarrowed(f: Filters): boolean {
  return Boolean(f.q || f.district || f.minister || f.dept || f.lang || f.from || f.to || f.cm || f.topic)
}

/** Any change other than paging goes back to page one. */
export function nextFilters(current: Filters, patch: Partial<Filters>): Filters {
  const next = { ...current, ...patch }
  if (!('page' in patch)) next.page = 1
  return next
}

export function queryOf(f: Filters): string {
  const params = new URLSearchParams()
  if (f.q) params.set('q', f.q)
  if (f.topic) params.set('topic', f.topic)
  if (f.district) params.set('district', f.district)
  if (f.minister) params.set('minister', f.minister)
  if (f.dept) params.set('dept', f.dept)
  if (f.lang) params.set('lang', f.lang)
  if (f.from) params.set('from', f.from)
  if (f.to) params.set('to', f.to)
  if (f.cm) params.set('cat', 'cm')
  if (f.page > 1) params.set('page', String(f.page))
  return params.toString()
}

/** Every link on the page is built here, so the reader's filters, district
 *  and language survive it unless the link is the one changing them. */
export function buildHref(current: Filters, patch: Partial<Filters>, hash = ''): string {
  const qs = queryOf(nextFilters(current, patch))
  return `/news${qs ? `?${qs}` : ''}${hash}`
}
