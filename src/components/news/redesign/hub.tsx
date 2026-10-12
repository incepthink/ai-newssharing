'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { mrDigits, searchItems, type NewsItem } from '@/lib/news/public'
import { StoryPhoto } from '@/components/news/story-photo'
import { IPlay, ISearch } from './icons'
import { ReleaseRow } from './releases'
import { HUB_SEARCH_ID, ReadLink } from './triggers'
import { plainClick } from './ui'

/**
 * The big search on the योजना and व्हिडिओ pages, and the list it searches.
 *
 * The page hands over its scope — every release of its schemes, or every
 * episode of its programmes — and the box filters that as the reader types,
 * with the same `searchItems` the palette and `/news` use. Anything outside
 * the scope still answers: the rest of the corpus is asked through
 * `/api/news/search` and shown under it, with the way through to the full list
 * on `/news`. So the box searches for anything, and what belongs to the page
 * comes first.
 *
 * The words live in `?q=` (rewritten in place), so a search is a link; the
 * server renders the same view first, and without JavaScript the box is a GET
 * form and "आणखी" a link.
 */

export type HubEntry = { item: NewsItem; badge?: string }
export type HubOthers = { results: NewsItem[]; total: number }

/** How many of the rest of the corpus to show under the page's own. */
export const OTHERS_SHOWN = 6

export function HubBrowser({
  entries,
  initialQ,
  initialOthers,
  initialCount,
  pageSize,
  path,
  origin,
  placeholder,
  suggestions = [],
  layout = 'rows',
  listWhenEmpty = true,
  scopeLabel,
  noun,
  featuredId,
  children,
}: {
  /** The page's own releases, newest first. */
  entries: HubEntry[]
  initialQ: string
  initialOthers: HubOthers
  initialCount: number
  pageSize: number
  /** This page's path, for the URL and the no-JS form. */
  path: string
  origin: string
  placeholder: string
  /** Chips under the box; each fills it. */
  suggestions?: Array<{ label: string; query: string }>
  layout?: 'rows' | 'grid'
  /** With nothing typed: list the whole scope, or only `children`. */
  listWhenEmpty?: boolean
  /** The heading over the page's own matches. */
  scopeLabel: string
  /** बातम्या, भाग — what the count counts. */
  noun: string
  /** Shown large above the box already: left out of the list until the
   *  reader searches. */
  featuredId?: string
  /** Shown under the results — the hub's cards. */
  children?: ReactNode
}) {
  const [term, setTerm] = useState(initialQ)
  const [q, setQ] = useState(initialQ)
  const [count, setCount] = useState(initialCount)
  const [others, setOthers] = useState<HubOthers>(initialOthers)
  const [othersLoading, setOthersLoading] = useState(false)
  const inflight = useRef<AbortController | null>(null)
  const first = useRef(true)

  /* Filter a moment after the reader pauses. */
  useEffect(() => {
    const next = term.trim()
    if (next === q) return
    const t = window.setTimeout(() => apply(next), 250)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, q])

  /* The rest of the corpus, for the words now applied. The server already
     answered for the words the page opened with. */
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    inflight.current?.abort()
    if (!q) {
      setOthers({ results: [], total: 0 })
      setOthersLoading(false)
      return
    }
    const ctrl = new AbortController()
    inflight.current = ctrl
    setOthersLoading(true)
    fetch(`/api/news/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal, cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<HubOthers>) : Promise.reject(new Error(String(r.status)))))
      .then((body) => setOthers(body))
      .catch(() => {
        if (!ctrl.signal.aborted) setOthers({ results: [], total: 0 })
      })
      .finally(() => {
        if (inflight.current === ctrl) {
          inflight.current = null
          setOthersLoading(false)
        }
      })
    return () => ctrl.abort()
  }, [q])

  function apply(next: string) {
    setQ(next)
    setCount(pageSize)
    if (next !== term.trim()) setTerm(next)
    window.history.replaceState(null, '', `${path}${next ? `?q=${encodeURIComponent(next)}` : ''}${window.location.hash}`)
  }

  const scopeIds = useMemo(() => new Set(entries.map((e) => e.item.id)), [entries])
  const matched = useMemo(() => {
    if (!q) return featuredId ? entries.filter((e) => e.item.id !== featuredId) : entries
    const hits = new Set(searchItems(entries.map((e) => e.item), q).map((i) => i.id))
    return entries.filter((e) => hits.has(e.item.id))
  }, [entries, q, featuredId])
  const outside = others.results.filter((i) => !scopeIds.has(i.id)).slice(0, OTHERS_SHOWN)

  const showList = Boolean(q) || listWhenEmpty
  const shown = matched.slice(0, count)
  const status = q
    ? `“${q}” — ${scopeLabel}: ${mrDigits(matched.length)}`
    : listWhenEmpty
      ? `${mrDigits(entries.length)} ${noun}`
      : ''

  const moreHref = `${path}?${new URLSearchParams({ ...(q ? { q } : {}), n: String(count + pageSize) })}`

  return (
    <>
      <div className="relative z-[2] -mt-9 rounded-[22px] bg-white p-4 shadow-[0_1px_0_#F0DCC8,0_24px_48px_-28px_rgba(120,30,30,0.45)] lg:-mt-12 lg:rounded-[28px] lg:p-7">
        <form
          action={path}
          method="get"
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            apply(term.trim())
          }}
          className="relative"
        >
          <label htmlFor={HUB_SEARCH_ID} className="sr-only">
            शोधा
          </label>
          <ISearch size={24} strokeWidth={2.2} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-nr-primary lg:left-6" />
          <input
            id={HUB_SEARCH_ID}
            name="q"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={placeholder}
            className="h-[60px] w-full rounded-full border-2 border-[#DDD3C5] bg-nr-ground pl-14 pr-28 text-[1.0625rem] font-semibold text-[#2A221D] outline-none placeholder:font-normal placeholder:text-nr-muted hover:border-nr-primary focus-visible:border-nr-primary focus-visible:ring-4 focus-visible:ring-nr-primary/20 lg:h-[72px] lg:pl-16 lg:pr-36 lg:text-xl"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 h-11 -translate-y-1/2 rounded-full bg-nr-primary px-5 text-[0.9375rem] font-extrabold text-white lg:right-3 lg:h-[52px] lg:px-7 lg:text-base"
          >
            शोधा
          </button>
        </form>

        {suggestions.length > 0 && (
          <div role="group" aria-label="सुचवलेले शोध" className="nr-scroll -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:mt-4 lg:flex-wrap lg:gap-2 lg:px-0">
            {suggestions.map((s) => {
              const on = q === s.query
              return (
                <a
                  key={s.label}
                  href={on ? path : `${path}?q=${encodeURIComponent(s.query)}`}
                  aria-current={on ? 'true' : undefined}
                  onClick={(e) => {
                    if (!plainClick(e)) return
                    e.preventDefault()
                    apply(on ? '' : s.query)
                  }}
                  className={`flex h-10 shrink-0 items-center whitespace-nowrap rounded-full border-[1.5px] px-3.5 text-sm font-semibold lg:px-4 ${
                    on ? 'border-nr-primary bg-nr-primary text-white' : 'border-[#DDD3C5] bg-white text-[#2A221D] hover:border-nr-primary'
                  }`}
                >
                  {s.label}
                </a>
              )
            })}
          </div>
        )}
      </div>

      <p role="status" className="m-0 mt-5 text-[0.8125rem] text-nr-text2 lg:mt-7 lg:text-sm">
        {status}
        {q && (
          <>
            {' · '}
            <a
              href={path}
              onClick={(e) => {
                if (!plainClick(e)) return
                e.preventDefault()
                apply('')
              }}
              className="font-bold text-nr-primary"
            >
              शोध काढा
            </a>
          </>
        )}
      </p>

      {showList && (
        <section aria-label={scopeLabel} className="min-w-0">
          {q && matched.length === 0 ? (
            <div className="mt-4 rounded-[18px] border-[1.5px] border-dashed border-[#CFC4B4] p-8 text-center">
              <p className="m-0 font-semibold">“{q}” शी जुळणारे इथे काहीही नाही</p>
              <p className="m-0 mt-1 text-sm text-nr-muted">दुसरा शब्द वापरून पहा — किंवा खाली सर्व प्रसिद्धीपत्रकांतील निकाल पहा.</p>
            </div>
          ) : !q && entries.length === 0 ? (
            <div className="mt-4 rounded-[18px] border-[1.5px] border-dashed border-[#CFC4B4] p-8 text-center text-[0.9375rem] text-nr-muted">
              {noun} मंजूर झाल्यावर इथे दिसतील.
            </div>
          ) : layout === 'grid' ? (
            <ul className="m-0 mt-4 grid list-none grid-cols-1 gap-x-5 gap-y-7 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((e) => (
                <li key={e.item.id}>
                  <EpisodeCard item={e.item} badge={e.badge} />
                </li>
              ))}
            </ul>
          ) : (
            <ol className="m-0 list-none p-0">
              {shown.map((e) => (
                <ReleaseRow key={e.item.id} item={e.item} badge={e.badge} origin={origin} />
              ))}
            </ol>
          )}

          {matched.length > count && (
            <div className="flex justify-center pt-6">
              <a
                href={moreHref}
                onClick={(e) => {
                  if (!plainClick(e)) return
                  e.preventDefault()
                  setCount((c) => c + pageSize)
                }}
                className="flex h-12 items-center rounded-full border-[1.5px] border-nr-primary bg-white px-6 text-[0.9375rem] font-extrabold text-nr-primary"
              >
                आणखी {noun} दाखवा ({mrDigits(matched.length - count)})
              </a>
            </div>
          )}
        </section>
      )}

      {q && (
        <section aria-labelledby="hub-others-h" aria-busy={othersLoading || undefined} className="mt-10 lg:mt-14">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-nr-line pb-2">
            <h2 id="hub-others-h" className="nr-h m-0 text-xl font-extrabold lg:text-2xl">
              सर्व प्रसिद्धीपत्रकांत
            </h2>
            {others.total > 0 && (
              <a href={`/news?q=${encodeURIComponent(q)}#releases`} className="text-[0.9375rem] font-extrabold text-nr-primary">
                सर्व {mrDigits(others.total)} निकाल पहा →
              </a>
            )}
          </div>
          {othersLoading ? (
            <p className="m-0 py-6 text-sm text-nr-muted">शोधत आहे…</p>
          ) : outside.length === 0 ? (
            <p className="m-0 py-6 text-sm text-nr-muted">
              {others.total > 0 ? 'इतर सर्व निकाल वर दिलेले आहेत.' : `“${q}” शी जुळणारे एकही मंजूर प्रसिद्धीपत्रक नाही.`}
            </p>
          ) : (
            <ol className="m-0 list-none p-0">
              {outside.map((i) => (
                <ReleaseRow key={i.id} item={i} origin={origin} />
              ))}
            </ol>
          )}
        </section>
      )}

      {children}
    </>
  )
}

/** An episode: its picture with the play mark, the programme, the headline.
 *  `dark` sets the words for a night band. */
export function EpisodeCard({ item, badge, large = false, dark = false }: { item: NewsItem; badge?: string; large?: boolean; dark?: boolean }) {
  return (
    <article className="flex flex-col gap-2.5">
      <ReadLink item={item} hidden className="relative block overflow-hidden rounded-[16px] bg-nr-night">
        <StoryPhoto src={item.img} video={item.video} size={large ? 'lg' : 'md'} className={`nr-zoom ${large ? 'h-[220px] lg:h-[400px]' : 'h-[190px] lg:h-[200px]'}`} />
        <span className="absolute inset-0 z-[2] bg-[linear-gradient(180deg,rgba(0,0,0,0)_50%,rgba(0,0,0,0.6)_100%)]" />
        <span
          aria-hidden
          className={`absolute z-[2] grid place-items-center rounded-full bg-nr-accent text-nr-text ${large ? 'left-4 top-4 h-14 w-14 lg:left-6 lg:top-6 lg:h-16 lg:w-16' : 'left-3 top-3 h-11 w-11'}`}
        >
          <IPlay size={large ? 24 : 18} />
        </span>
      </ReadLink>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.78rem] lg:text-[0.8125rem]">
        {badge && <span className="rounded bg-nr-accent-soft px-2 py-px font-extrabold text-nr-accent-ink">{badge}</span>}
        <time dateTime={item.date} className={dark ? 'text-white/70' : 'text-nr-muted'}>
          {item.dateLabel}
        </time>
      </div>
      <h3 className={`m-0 font-marathi font-bold leading-[1.6] ${large ? 'text-[1.1875rem] lg:text-[1.5rem]' : 'text-base lg:text-[1.0625rem]'}`}>
        <ReadLink item={item} className={`nr-link ${dark ? 'text-white' : 'text-nr-text'}`}>
          {item.title}
        </ReadLink>
      </h3>
    </article>
  )
}
