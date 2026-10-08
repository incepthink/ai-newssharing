'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { mrDigits, topicLabel, type NewsItem, type TopicId } from '@/lib/news/public'
import {
  buildHref,
  isNarrowed,
  LANG_MR,
  nextFilters,
  PAGE_SIZE,
  queryOf,
  STATEWIDE,
  type Filters,
  type ReleasePage,
} from '@/lib/news/release-filters'
import { StoryPhoto } from '@/components/news/story-photo'
import { IDownload, ISearch, IShare } from './icons'
import { ReadLink, RELEASE_SEARCH_ID } from './triggers'
import { plainClick } from './ui'

/**
 * सर्व मंजूर प्रसिद्धीपत्रके: the district and minister dropdowns, the topic
 * chips and the list they filter — and the district map in the hero
 * (`DistrictMap`), which filters the same list.
 *
 * A filter changed here does not navigate. The URL is rewritten in place (so
 * the view is still a link), only the list is refetched from
 * `/api/news/releases`, and while it loads only the list shows a skeleton —
 * the page does not reload or re-read the fold.
 *
 * Every control is still a real link or a GET form, so without JavaScript the
 * section works exactly as the server page always did.
 */

export type MapShape = { id: string; nameMr: string; d: string }

export type ReleasesMap = {
  viewBox: string
  shapes: MapShape[]
  counts: Record<string, number>
  ceiling: number
  windowLabel: string
  widened: boolean
}

export type DistrictOption = {
  key: string
  label: string
  count: number
  /** Other names the search box matches: English, former names, spellings. */
  terms?: string[]
}

export type MinisterOption = {
  id: string
  label: string
  count: number
  /** Other names the search box matches: aliases, English spellings, portfolio. */
  terms?: string[]
}

export function ReleasesBrowser({
  initialFilters,
  initial,
  origin,
  districts,
  ministers,
  topics,
}: {
  initialFilters: Filters
  initial: ReleasePage
  origin: string
  /** Every district, plus राज्यव्यापी — the dropdown's options, in order. */
  districts: DistrictOption[]
  /** The roster, in Gazette order — the minister dropdown's options. */
  ministers: MinisterOption[]
  topics: Array<{ id: TopicId; label: string }>
}) {
  const [filters, setFilters] = useState(initialFilters)
  const [data, setData] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const inflight = useRef<AbortController | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  /* The server renders a plain <select> so the GET form works without
     JavaScript; once hydrated it becomes the searchable picker. */
  const [hydrated, setHydrated] = useState(false)
  /* The search box's text. It filters as the reader types, a moment after
     they pause; a chip that clears the words clears the box too. */
  const [term, setTerm] = useState(initialFilters.q)

  useEffect(() => {
    setHydrated(true)
    return () => inflight.current?.abort()
  }, [])

  /* The map sits in the hero, apart from this list: a district picked there
     filters here, and the district shown here is lit there. */
  const applyRef = useRef(apply)
  applyRef.current = apply
  useEffect(() => {
    const onPick = (e: Event) => applyRef.current({ district: (e as CustomEvent<string>).detail })
    window.addEventListener(DISTRICT_PICK, onPick)
    return () => window.removeEventListener(DISTRICT_PICK, onPick)
  }, [])
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(DISTRICT_SHOWN, { detail: filters.district }))
  }, [filters.district])

  useEffect(() => {
    const q = term.trim()
    if (q === filters.q) return
    const t = window.setTimeout(() => apply({ q }), 350)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, filters.q])

  async function load(next: Filters) {
    inflight.current?.abort()
    const ctrl = new AbortController()
    inflight.current = ctrl
    setLoading(true)
    setFailed(false)
    try {
      const res = await fetch(`/api/news/releases?${queryOf(next)}`, { signal: ctrl.signal, cache: 'no-store' })
      if (!res.ok) throw new Error(`releases ${res.status}`)
      const body = (await res.json()) as ReleasePage
      setData(body)
      // The server clamps a page past the end; keep the pager's state with it.
      setFilters((f) => (f.page === body.page ? f : { ...f, page: body.page }))
    } catch {
      if (!ctrl.signal.aborted) setFailed(true)
    } finally {
      if (inflight.current === ctrl) {
        inflight.current = null
        setLoading(false)
      }
    }
  }

  function apply(patch: Partial<Filters>, { toList = false } = {}) {
    const next = nextFilters(filters, patch)
    setFilters(next)
    if (patch.q !== undefined && patch.q !== term.trim()) setTerm(patch.q)
    const qs = queryOf(next)
    window.history.replaceState(null, '', `/news${qs ? `?${qs}` : ''}`)
    /* Paging from the foot of a long list brings its top back into view;
       a filter never moves the page. */
    if (toList && listRef.current && listRef.current.getBoundingClientRect().top < 0) {
      listRef.current.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }
    void load(next)
  }

  /** A real link, for no-JS and new tabs; a plain click filters in place. */
  function filterLink(patch: Partial<Filters>, opts?: { toList?: boolean }) {
    return {
      href: buildHref(filters, patch, '#releases'),
      onClick: (e: React.MouseEvent) => {
        if (!plainClick(e)) return
        e.preventDefault()
        apply(patch, opts)
      },
    }
  }

  const districtLabel = (key: string) => districts.find((d) => d.key === key)?.label ?? key
  const ministerLabel = (id: string) => ministers.find((m) => m.id === id)?.label ?? id
  const ministerOptions = ministers.map(({ id, ...m }) => ({ key: id, ...m }))

  const feedStatus = loading
    ? 'प्रसिद्धीपत्रके शोधत आहे…'
    : filters.topic
      ? `“${topicLabel(filters.topic)}” — ${mrDigits(data.matched)} प्रसिद्धीपत्रके`
      : isNarrowed(filters)
        ? `${mrDigits(data.total)} पैकी ${mrDigits(data.matched)} — निवडलेल्या निकषांनुसार`
        : ''

  /* Hidden inputs that carry the other filters through the no-JS form. */
  const carried = [...new URLSearchParams(queryOf(nextFilters(filters, { district: '', minister: '', q: '' })))]

  return (
    <>
      <form
        action="/news#releases"
        method="get"
        onSubmit={(e) => {
          e.preventDefault()
          const q = term.trim()
          if (q !== filters.q) apply({ q })
        }}
        className="flex flex-wrap items-center gap-2.5"
      >
        {carried.map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <label htmlFor="rel-district" className="text-[0.9375rem] font-bold text-nr-text">
          जिल्हा
        </label>
        <span className="relative w-full max-w-[340px] grow sm:w-auto sm:grow-0">
          {hydrated ? (
            <SearchCombobox
              id="rel-district"
              value={filters.district}
              options={districts}
              allLabel={ALL_DISTRICTS}
              placeholder="जिल्ह्याचे नाव शोधा…"
              listLabel="जिल्हा"
              emptyText="जुळणारा जिल्हा नाही"
              onPick={(key) => apply({ district: key })}
            />
          ) : (
            <>
              <select id="rel-district" name="district" defaultValue={filters.district} className={`${FIELD} cursor-pointer appearance-none`}>
                <option value="">{ALL_DISTRICTS}</option>
                {districts.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label} ({mrDigits(d.count)})
                  </option>
                ))}
              </select>
              <Chevron />
            </>
          )}
        </span>
        <label htmlFor="rel-minister" className="text-[0.9375rem] font-bold text-nr-text">
          मंत्री
        </label>
        <span className="relative w-full max-w-[340px] grow sm:w-auto sm:grow-0">
          {hydrated ? (
            <SearchCombobox
              id="rel-minister"
              value={filters.minister}
              options={ministerOptions}
              allLabel={ALL_MINISTERS}
              placeholder="मंत्र्याचे नाव किंवा खाते शोधा…"
              listLabel="मंत्री"
              emptyText="जुळणारे मंत्री नाहीत"
              onPick={(key) => apply({ minister: key })}
            />
          ) : (
            <>
              <select id="rel-minister" name="minister" defaultValue={filters.minister} className={`${FIELD} cursor-pointer appearance-none`}>
                <option value="">{ALL_MINISTERS}</option>
                {ministers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({mrDigits(m.count)})
                  </option>
                ))}
              </select>
              <Chevron />
            </>
          )}
        </span>
        <span className="relative w-full sm:w-auto sm:min-w-[260px] sm:max-w-[420px] sm:grow">
          <label htmlFor={RELEASE_SEARCH_ID} className="sr-only">
            प्रसिद्धीपत्रकांत शोधा
          </label>
          <ISearch size={18} strokeWidth={2.2} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-nr-primary" />
          <input
            id={RELEASE_SEARCH_ID}
            name="q"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="शब्द, ठिकाण किंवा वृत्त क्रमांक…"
            className="h-[46px] w-full rounded-full border-[1.5px] border-[#DDD3C5] bg-white pl-11 pr-4 text-[0.9375rem] font-semibold text-[#2A221D] outline-none placeholder:font-normal placeholder:text-nr-muted hover:border-nr-primary focus-visible:border-nr-primary focus-visible:ring-2 focus-visible:ring-nr-primary/30"
          />
        </span>
        <noscript>
          <button type="submit" className="h-[46px] rounded-full bg-nr-primary px-5 font-bold text-white">
            पहा
          </button>
        </noscript>
      </form>

      <div role="group" aria-label="विषयानुसार निवडा" className="nr-scroll -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:gap-2 lg:px-0">
        <TopicChip {...filterLink({ topic: '' })} on={!filters.topic}>
          सर्व विषय
        </TopicChip>
        {topics.map((t) => (
          <TopicChip key={t.id} {...filterLink({ topic: t.id })} on={filters.topic === t.id}>
            {t.label}
          </TopicChip>
        ))}
      </div>

      <div ref={listRef} className="min-w-0 scroll-mt-[118px] lg:scroll-mt-[124px]">
        <p role="status" className="m-0 text-[0.8125rem] text-nr-text2 lg:text-sm">
          {feedStatus}
        </p>
        <ActiveFilters
          filters={filters}
          deptName={data.deptName}
          districtLabel={districtLabel}
          ministerLabel={ministerLabel}
          link={filterLink}
        />

        <div aria-busy={loading || undefined}>
          {loading ? (
            <ol aria-hidden className="m-0 list-none p-0">
              {Array.from({ length: Math.min(PAGE_SIZE, Math.max(3, data.shown.length)) }, (_, i) => (
                <SkeletonRow key={i} />
              ))}
            </ol>
          ) : failed ? (
            <div className="mt-4 rounded-[18px] border-[1.5px] border-dashed border-[#CFC4B4] p-8 text-center">
              <p className="m-0 font-semibold">बातम्या आणता आल्या नाहीत</p>
              <p className="m-0 mt-1 text-sm text-nr-muted">जोडणी तात्पुरती खंडित झाली असावी.</p>
              <button
                type="button"
                onClick={() => void load(filters)}
                className="mt-4 inline-flex h-11 items-center rounded-full bg-nr-primary-soft px-5 font-bold text-nr-primary"
              >
                पुन्हा प्रयत्न करा
              </button>
            </div>
          ) : data.shown.length === 0 ? (
            <div className="mt-4 rounded-[18px] border-[1.5px] border-dashed border-[#CFC4B4] p-8 text-center">
              <p className="m-0 font-semibold">या निकषात एकही बातमी नाही</p>
              <p className="m-0 mt-1 text-sm text-nr-muted">शोधशब्द बदलून पहा, दुसरा जिल्हा निवडा किंवा एखादा फिल्टर काढा.</p>
              <a
                {...filterLink(CLEARED)}
                className="mt-4 inline-flex h-11 items-center rounded-full bg-nr-primary-soft px-5 font-bold text-nr-primary"
              >
                सर्व फिल्टर काढा
              </a>
            </div>
          ) : (
            <ol className="m-0 list-none p-0">
              {data.shown.map((r) => (
                <ReleaseRow key={r.id} item={r} origin={origin} />
              ))}
            </ol>
          )}
        </div>

        {!failed && data.pages > 1 && (
          <nav aria-label="पाने" className="flex items-center justify-between pt-5 text-[0.9375rem]">
            {data.page > 1 ? (
              <a {...filterLink({ page: data.page - 1 }, { toList: true })} className="flex min-h-11 items-center font-extrabold text-nr-primary">
                ← मागील पान
              </a>
            ) : (
              <span className="text-[#8F857B]">← मागील पान</span>
            )}
            <span className="text-[#4A2E30]">
              पान {mrDigits(data.page)} / {mrDigits(data.pages)}
            </span>
            {data.page < data.pages ? (
              <a {...filterLink({ page: data.page + 1 }, { toList: true })} className="flex min-h-11 items-center font-extrabold text-nr-primary">
                पुढील पान →
              </a>
            ) : (
              <span className="text-[#8F857B]">पुढील पान →</span>
            )}
          </nav>
        )}
      </div>
    </>
  )
}

/** Map → list: the district picked (or '' to clear it). */
const DISTRICT_PICK = 'nr:district-pick'
/** List → map: the district the list now shows. */
const DISTRICT_SHOWN = 'nr:district-shown'

/**
 * महाराष्ट्राचा बातम्या नकाशा, shaded by the week's releases. Each district is
 * a real link that filters सर्व मंजूर प्रसिद्धीपत्रके (and works without JS);
 * a plain click filters the list in place and brings it into view.
 */
export function DistrictMap({
  map,
  initialFilters,
  className = '',
  svgClassName = '',
}: {
  map: ReleasesMap
  initialFilters: Filters
  className?: string
  svgClassName?: string
}) {
  const [district, setDistrict] = useState(initialFilters.district)
  const ceiling = Math.max(1, map.ceiling)

  useEffect(() => {
    const onShown = (e: Event) => setDistrict((e as CustomEvent<string>).detail)
    window.addEventListener(DISTRICT_SHOWN, onShown)
    return () => window.removeEventListener(DISTRICT_SHOWN, onShown)
  }, [])

  return (
    <figure className={`m-0 flex flex-col gap-3 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <b className="nr-h text-[1.0625rem] font-extrabold text-nr-text lg:text-xl">महाराष्ट्राचा बातम्या नकाशा</b>
        <span className="text-[0.8125rem] text-nr-muted">
          जिल्ह्यावर क्लिक करून बातम्या पहा · मागील {map.windowLabel}
          {map.widened ? ' (वाढवलेला)' : ''}
        </span>
      </div>
      <svg
        viewBox={map.viewBox}
        className={`mx-auto block h-auto w-full ${svgClassName}`}
        role="group"
        aria-label={`महाराष्ट्राचे ३६ जिल्हे — मागील ${map.windowLabel} मधील प्रसिद्धीपत्रकांनुसार छटा`}
      >
        {map.shapes.map((shape) => {
          const count = map.counts[shape.id] ?? 0
          const picked = shape.id === district
          const label = `${shape.nameMr} — ${count ? `${mrDigits(count)} प्रसिद्धीपत्रके` : 'या कालावधीत बातमी नाही'}`
          const next = picked ? '' : shape.id
          return (
            <a
              key={shape.id}
              href={buildHref(initialFilters, { district: next }, '#releases')}
              onClick={(e) => {
                if (!plainClick(e)) return
                e.preventDefault()
                setDistrict(next)
                window.dispatchEvent(new CustomEvent(DISTRICT_PICK, { detail: next }))
                const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
                document.getElementById('releases')?.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' })
              }}
              aria-label={label}
              aria-current={picked ? 'true' : undefined}
              className="group outline-none"
            >
              <title>{label}</title>
              <path
                d={shape.d}
                fill={shade(count, ceiling)}
                stroke={picked ? 'var(--nr-text)' : '#ffffff'}
                strokeWidth={picked ? 2.5 : 0.8}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className="transition-[stroke] group-hover:stroke-[var(--nr-text)] group-focus-visible:stroke-[var(--nr-accent)] group-focus-visible:[stroke-width:4]"
              />
            </a>
          )
        })}
      </svg>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-[0.8125rem] text-nr-text2">
        <span className="flex items-center gap-[5px]">
          कमी
          {[0.25, 0.5, 0.75, 1].map((t) => (
            <span key={t} aria-hidden className="inline-block h-[9px] w-5 rounded-[2px]" style={{ background: shade(t * ceiling, ceiling) }} />
          ))}
          जास्त
        </span>
        <a href={district && district !== STATEWIDE ? `/map?district=${district}` : '/map'} className="font-extrabold text-nr-primary">
          पूर्ण नकाशा →
        </a>
      </figcaption>
    </figure>
  )
}

const CLEARED: Partial<Filters> = { q: '', district: '', minister: '', dept: '', lang: '', from: '', to: '', cm: false, topic: '' }

const ALL_DISTRICTS = 'सर्व जिल्हे'
const ALL_MINISTERS = 'सर्व मंत्री'
const FIELD =
  'h-[46px] w-full rounded-full border-[1.5px] border-[#DDD3C5] bg-white pl-[18px] pr-11 text-[0.9375rem] font-semibold text-[#2A221D] outline-none hover:border-nr-primary focus-visible:border-nr-primary focus-visible:ring-2 focus-visible:ring-nr-primary/30 sm:w-[300px]'

function Chevron() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width="18" height="18" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-nr-primary" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

/** Lowercased, whitespace collapsed — so "pune", "Pune " and "पुणे" compare plainly. */
const fold = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

type ComboOption = { key: string; label: string; count: number; terms?: string[] }

/**
 * The district and minister dropdowns, searchable: type a Marathi or English
 * name (a former district name — Aurangabad, Ahmednagar — or a minister's
 * portfolio) and the list narrows. ARIA combobox pattern: arrows move, Enter
 * picks, Escape closes and restores the choice.
 */
function SearchCombobox({
  id,
  value,
  options: all,
  allLabel,
  placeholder,
  listLabel,
  emptyText,
  onPick,
}: {
  id: string
  value: string
  options: ComboOption[]
  /** The first, unfiltered choice — सर्व जिल्हे, सर्व मंत्री. */
  allLabel: string
  placeholder: string
  listLabel: string
  emptyText: string
  onPick: (key: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const selected = all.find((d) => d.key === value)
  const shownValue = selected ? `${selected.label} (${mrDigits(selected.count)})` : allLabel

  const q = fold(query)
  const options: Array<{ key: string; label: string; count: number | null }> = [
    ...(q ? [] : [{ key: '', label: allLabel, count: null }]),
    ...all
      .filter((d) => !q || [d.label, d.key, ...(d.terms ?? [])].some((t) => fold(t).includes(q)))
      .map((d) => ({ key: d.key, label: d.label, count: d.count })),
  ]

  /* Close on a press anywhere outside. */
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close()
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  /* Keep the highlighted option in view while arrowing through the list. */
  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  function openList() {
    if (open) return
    setOpen(true)
    setQuery('')
    setActive(Math.max(0, options.findIndex((o) => o.key === value)))
  }

  function close() {
    setOpen(false)
    setQuery('')
  }

  function pick(key: string) {
    close()
    if (key !== value) onPick(key)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!open) openList()
        else setActive((i) => Math.min(options.length - 1, i + 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        if (!open) openList()
        else setActive((i) => Math.max(0, i - 1))
        break
      case 'Home':
      case 'End':
        if (!open) return
        e.preventDefault()
        setActive(e.key === 'Home' ? 0 : options.length - 1)
        break
      case 'Enter':
        if (!open) return
        e.preventDefault()
        if (options[active]) pick(options[active].key)
        break
      case 'Escape':
        if (!open) return
        e.preventDefault()
        close()
        break
      case 'Tab':
        close()
        break
    }
  }

  const listId = `${id}-list`
  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && options[active] ? `${id}-opt-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder={open ? placeholder : undefined}
        value={open ? query : shownValue}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onClick={openList}
        onFocus={(e) => e.target.select()}
        onKeyDown={onKeyDown}
        className={`${FIELD} cursor-text placeholder:font-normal placeholder:text-nr-muted`}
      />
      <Chevron />
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={listLabel}
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 m-0 max-h-[320px] list-none overflow-y-auto rounded-[16px] border border-[#DDD3C5] bg-white p-1.5 shadow-[0_18px_36px_-18px_rgba(120,30,30,0.45)] sm:w-[300px]"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-nr-muted">{emptyText}</li>
          ) : (
            options.map((o, i) => (
              <li
                key={o.key || 'all'}
                id={`${id}-opt-${i}`}
                data-i={i}
                role="option"
                aria-selected={o.key === value}
                onPointerDown={(e) => e.preventDefault() /* keep focus in the input */}
                onPointerEnter={() => setActive(i)}
                onClick={() => pick(o.key)}
                className={`flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-[10px] px-3 text-[0.9375rem] ${
                  i === active ? 'bg-nr-primary-soft text-nr-primary' : 'text-[#2A221D]'
                } ${o.key === value ? 'font-extrabold' : 'font-semibold'}`}
              >
                <span>{o.label}</span>
                {o.count !== null && <span className="text-[0.8125rem] font-normal text-nr-muted">{mrDigits(o.count)}</span>}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

type LinkProps = { href: string; onClick: (e: React.MouseEvent) => void }

function TopicChip({ on, children, ...link }: LinkProps & { on: boolean; children: ReactNode }) {
  return (
    <a
      {...link}
      aria-current={on ? 'true' : undefined}
      className={`flex h-[42px] shrink-0 items-center whitespace-nowrap rounded-full border-[1.5px] px-3.5 text-[0.90625rem] font-semibold lg:px-[18px] lg:text-[0.9375rem] ${
        on ? 'border-nr-primary bg-nr-primary text-white' : 'border-[#DDD3C5] bg-white text-[#2A221D] hover:border-nr-primary'
      }`}
    >
      {children}
    </a>
  )
}

function ActiveFilters({
  filters,
  deptName,
  districtLabel,
  ministerLabel,
  link,
}: {
  filters: Filters
  deptName: string | null
  districtLabel: (key: string) => string
  ministerLabel: (id: string) => string
  link: (patch: Partial<Filters>) => LinkProps
}) {
  const chips: Array<[string, Partial<Filters>]> = []
  if (filters.q) chips.push([`“${filters.q}”`, { q: '' }])
  if (filters.district) chips.push([districtLabel(filters.district), { district: '' }])
  if (filters.minister) chips.push([ministerLabel(filters.minister), { minister: '' }])
  if (filters.dept) chips.push([deptName ?? filters.dept, { dept: '' }])
  if (filters.lang) chips.push([LANG_MR[filters.lang], { lang: '' }])
  if (filters.cm) chips.push(['मुख्यमंत्री व मंत्रिमंडळ', { cm: false }])
  if (filters.from || filters.to) chips.push([`${filters.from || '…'} ते ${filters.to || '…'}`, { from: '', to: '' }])
  if (!chips.length) return null

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.8125rem]">
      <span className="text-nr-muted">निवडलेले:</span>
      {chips.map(([label, patch]) => (
        <a
          key={label}
          {...link(patch)}
          aria-label={`${label} — फिल्टर काढा`}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-nr-line2 bg-white px-3 font-semibold"
        >
          {label} <span aria-hidden>×</span>
        </a>
      ))}
      <a {...link(CLEARED)} className="font-bold text-nr-primary">
        सर्व काढा
      </a>
    </div>
  )
}

function SkeletonRow() {
  return (
    <li className="flex animate-pulse flex-col gap-2 border-b border-nr-line py-4 motion-reduce:animate-none sm:grid sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-[26px] sm:py-6">
      <div className="h-[190px] rounded-[14px] bg-[#EFE6DC] sm:h-[146px]" />
      <div className="flex min-w-0 flex-col gap-2.5 pt-1">
        <div className="flex gap-2">
          <span className="h-5 w-20 rounded bg-[#EFE6DC]" />
          <span className="h-5 w-24 rounded bg-[#F3ECE3]" />
        </div>
        <span className="h-6 w-11/12 rounded bg-[#EFE6DC]" />
        <span className="h-6 w-3/5 rounded bg-[#EFE6DC]" />
        <span className="h-4 w-4/5 rounded bg-[#F3ECE3] max-sm:hidden" />
        <div className="mt-1 flex gap-1.5">
          <span className="h-11 w-[84px] rounded-full bg-[#F3ECE3]" />
          <span className="h-11 w-[84px] rounded-full bg-[#F3ECE3]" />
        </div>
      </div>
    </li>
  )
}

const ACTION = 'inline-flex h-11 items-center gap-1.5 rounded-full border px-[13px] text-sm font-semibold text-[#2A221D]'

function ReleaseRow({ item: r, origin }: { item: NewsItem; origin: string }) {
  const share = `https://wa.me/?text=${encodeURIComponent(`${r.title}\n${origin}${r.href}\n— महासंवाद, माहिती व जनसंपर्क महासंचालनालय`)}`
  return (
    <li className="flex flex-col gap-2 border-b border-nr-line py-4 sm:grid sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-[26px] sm:py-6">
      <ReadLink item={r} hidden className="block overflow-hidden rounded-[14px] bg-white">
        <StoryPhoto src={r.img} video={r.video} size="md" className="nr-zoom h-[190px] sm:h-[146px]" />
      </ReadLink>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.78rem] lg:text-[0.8125rem]">
          <span className="rounded bg-nr-place-soft px-2 py-px font-bold text-nr-place lg:px-2.5 lg:py-0.5">{r.place}</span>
          <b className="font-extrabold text-nr-primary">{r.topicLabel}</b>
          <time dateTime={r.date} className="text-nr-muted">
            · {r.dateLabel}
            {r.time ? `, ${r.time}` : ''}
          </time>
        </div>
        <h3 className="m-0 font-marathi text-[1.3125rem] font-bold leading-[1.6] sm:text-2xl">
          <ReadLink item={r} className="nr-link text-nr-text">
            {r.title}
          </ReadLink>
        </h3>
        {r.summary && <p className="m-0 line-clamp-2 text-base leading-[1.7] text-[#4A2E30] max-sm:hidden">{r.summary}</p>}
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {r.docx && (
            <a href={r.docx} className={`${ACTION} border-nr-line2 bg-white max-sm:hidden`} aria-label={`DOCX — ${r.title}`}>
              <IDownload size={15} strokeWidth={2} /> DOCX
            </a>
          )}
          <a href={share} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp वर शेअर करा — ${r.title}`} className={`${ACTION} border-nr-line2 bg-white`}>
            <IShare size={15} /> शेअर
          </a>
          {r.no && (
            <span className="ml-auto text-[0.8125rem] text-nr-muted max-sm:hidden">
              वृत्त क्र. <b className="font-semibold text-nr-text">{r.no}</b>
            </span>
          )}
        </div>
      </div>
    </li>
  )
}

/** Five steps of the crimson, relative to the window's busiest district. */
function shade(count: number, ceiling: number): string {
  if (count <= 0) return '#efe6dc'
  const step = Math.min(4, Math.floor((count / ceiling) * 4.999))
  return ['#f5d9dc', '#e6a9b1', '#d06f7d', '#b5384b', '#8a1225'][step]
}
