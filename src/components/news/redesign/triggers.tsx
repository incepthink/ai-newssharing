'use client'

import { useRouter } from 'next/navigation'
import { useId, useState, type ReactNode } from 'react'
import type { NewsItem } from '@/lib/news/public'
import { IArchive, IChat, ICopy, IDownload, IHome, IPin, ISearch, IShield, ISpeaker } from './icons'
import { FS_LABELS, plainClick, useNewsUi } from './ui'

/**
 * The server page's buttons that need the browser. Each degrades to something
 * that works without it: a headline is a link to its page, a trending chip is
 * a link to the searched list, the number search is a GET form.
 */

/** A link to the release's page that, on a plain click, reads it in place. */
export function ReadLink({
  item,
  className,
  children,
  hidden,
}: {
  item: NewsItem
  className?: string
  children: ReactNode
  /** The photo beside a headline: the headline is the link a screen reader
   *  and the Tab key get, so the picture is skipped. */
  hidden?: boolean
}) {
  const { openReader } = useNewsUi()
  return (
    <a
      href={item.href}
      onClick={(e) => {
        if (plainClick(e)) {
          e.preventDefault()
          openReader(item)
        }
      }}
      tabIndex={hidden ? -1 : undefined}
      aria-hidden={hidden || undefined}
      className={className}
    >
      {children}
    </a>
  )
}

export function ListenButton({ item, className = '' }: { item: NewsItem; className?: string }) {
  const { speak, speaking } = useNewsUi()
  const on = speaking === item.id
  return (
    <button
      type="button"
      onClick={() => speak(item)}
      aria-pressed={on}
      aria-label={`${on ? 'थांबवा' : 'ऐका'} — ${item.title}`}
      className={`${className} ${on ? 'border-nr-accent bg-nr-accent-soft' : 'border-nr-line2 bg-white'}`}
    >
      <ISpeaker size={16} /> {on ? 'थांबवा' : 'ऐका'}
    </button>
  )
}

/** The hero's listen pill, on a photograph. */
export function HeroListen({ item }: { item: NewsItem }) {
  const { speak, speaking } = useNewsUi()
  const on = speaking === item.id
  return (
    <button
      type="button"
      onClick={() => speak(item)}
      aria-pressed={on}
      className="flex h-[50px] items-center gap-2 rounded-full border-[1.5px] border-white/[0.55] bg-white/10 px-5 text-base font-bold text-white sm:h-[54px]"
    >
      <ISpeaker size={18} /> {on ? 'थांबवा' : 'ऐका'}
    </button>
  )
}

export function CopyButton({ item, className = '' }: { item: NewsItem; className?: string }) {
  const { copy } = useNewsUi()
  return (
    <button type="button" onClick={() => copy(item)} aria-label={`कॉपी — ${item.title}`} className={className}>
      <ICopy size={15} /> कॉपी
    </button>
  )
}

export function FoldButton({ className, children, label }: { className: string; children: ReactNode; label?: string }) {
  const { openFold } = useNewsUi()
  return (
    <button type="button" onClick={openFold} aria-haspopup="dialog" aria-label={label} className={className}>
      {children}
    </button>
  )
}

export function SearchButton({ className, children, label, query }: { className: string; children: ReactNode; label?: string; query?: string }) {
  const { openSearch } = useNewsUi()
  return (
    <button type="button" onClick={() => openSearch(query)} aria-haspopup="dialog" aria-label={label} className={className}>
      {children}
    </button>
  )
}

/** A trending topic: opens the palette searched; without JS, the list. */
export function SearchChip({ query, className, children }: { query: string; className: string; children: ReactNode }) {
  const { openSearch } = useNewsUi()
  return (
    <a
      href={`/news?q=${encodeURIComponent(query)}#releases`}
      onClick={(e) => {
        if (plainClick(e)) {
          e.preventDefault()
          openSearch(query)
        }
      }}
      className={className}
    >
      {children}
    </a>
  )
}

/** "वृत्त क्रमांकाने शोधा": the palette, or the list where JS is off. */
export function ByNumberForm() {
  const { openSearch } = useNewsUi()
  const [v, setV] = useState('')
  return (
    <form
      action="/news#releases"
      method="get"
      onSubmit={(e) => {
        e.preventDefault()
        openSearch(v)
      }}
      className="mt-1.5 flex flex-col gap-2 border-t border-[#F5E6D6] pt-4"
    >
      <label htmlFor="nr-by-no" className="text-[0.9375rem] font-bold">
        वृत्त क्रमांकाने शोधा
      </label>
      <div className="flex gap-2">
        <input
          id="nr-by-no"
          name="q"
          type="search"
          inputMode="numeric"
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="उदा. २१७७११"
          className="h-[46px] min-w-0 grow rounded-[18px] border-[1.5px] border-nr-line2 px-3 text-base"
        />
        <button
          type="submit"
          className="h-[46px] shrink-0 rounded-[18px] border-[1.5px] border-nr-primary bg-white px-4 text-[0.9375rem] font-bold text-nr-primary"
        >
          शोधा
        </button>
      </div>
    </form>
  )
}

/**
 * माझा जिल्हा. Remembered in a cookie the server reads, so the district
 * section opens on the reader's own district next time too, and carried in
 * `?d=` so the view is a link like every other.
 */
export function DistrictPicker({
  value,
  options,
  base,
  className,
  selectClassName,
}: {
  value: string
  options: Array<{ key: string; name: string }>
  /** The page's current query string without `d`. */
  base: string
  className: string
  selectClassName: string
}) {
  const router = useRouter()
  const id = useId()
  return (
    <form action="/news#districts" method="get" className={className}>
      <IPin size={18} strokeWidth={2} className="shrink-0 text-nr-place" />
      <label htmlFor={id} className="sr-only">
        माझा जिल्हा
      </label>
      <select
        id={id}
        name="d"
        defaultValue={value}
        onChange={(e) => {
          const d = e.target.value
          document.cookie = `nr_district=${d}; path=/; max-age=31536000; samesite=lax`
          const qs = new URLSearchParams(base)
          qs.set('d', d)
          router.push(`/news?${qs.toString()}#districts`)
        }}
        className={selectClassName}
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.name}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="rounded-full px-2 text-sm font-bold text-nr-primary">
          पहा
        </button>
      </noscript>
    </form>
  )
}

/**
 * भाषा. It leads to real releases in that language or says there are none —
 * it never implies a translation of this page that does not exist.
 */
export function LanguageSelect({
  value,
  options,
  className,
}: {
  value: string
  options: Array<{ value: string; label: string; href: string; disabled?: boolean }>
  className: string
}) {
  const router = useRouter()
  return (
    <label className="flex">
      <span className="sr-only">भाषा</span>
      <select
        value={value}
        onChange={(e) => {
          const o = options.find((x) => x.value === e.target.value)
          if (o) router.push(o.href)
        }}
        className={className}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

/** The round अ button that steps through the three sizes. */
export function TextSizeCycle({ className }: { className: string }) {
  const { fs, setFs } = useNewsUi()
  const next = ((fs + 1) % 3) as 0 | 1 | 2
  return (
    <button type="button" onClick={() => setFs(next)} aria-label={`अक्षरांचा आकार बदला — आत्ता ${FS_LABELS[fs]}`} className={className}>
      अ
    </button>
  )
}

/* ---------------------------------------------------------------- bottom bar */

const cell =
  'flex h-[60px] flex-col items-center justify-center gap-0.5 border-0 bg-transparent text-[0.78rem] font-bold text-nr-primary'

/**
 * The floating pill at the bottom: the page's seven jumps on a desk, five on a
 * phone, either side of the raised "विचारा" button that opens the assistant.
 */
export function BottomNav() {
  const { openSearch, openFold, openChat } = useNewsUi()
  const label = (t: string) => <span className="text-[#4A2E30]">{t}</span>
  return (
    <nav
      aria-label="जलद दुवे"
      className="fixed inset-x-3 bottom-2.5 z-[45] grid h-16 grid-cols-[repeat(2,minmax(0,1fr))_76px_repeat(2,minmax(0,1fr))] items-center rounded-full border border-nr-line bg-white/[0.97] px-1.5 shadow-[0_18px_44px_-16px_rgba(40,6,10,0.45)] sm:inset-x-auto sm:bottom-[22px] sm:left-1/2 sm:h-[68px] sm:w-[680px] sm:-translate-x-1/2 sm:grid-cols-[repeat(3,minmax(0,1fr))_84px_repeat(3,minmax(0,1fr))] sm:px-3"
    >
      <a href="#top" className={cell}>
        <IHome size={21} />
        {label('मुख्यपृष्ठ')}
      </a>
      <button type="button" onClick={() => openSearch()} aria-haspopup="dialog" className={cell}>
        <ISearch size={21} />
        {label('शोधा')}
      </button>
      <a href="#districts" className={`${cell} max-sm:hidden`}>
        <IPin size={21} />
        {label('जिल्हा')}
      </a>
      <span className="flex flex-col items-center">
        <button
          type="button"
          id="nr-chat-trigger"
          onClick={() => openChat()}
          aria-haspopup="dialog"
          aria-label="महासंवाद सहाय्यकाला विचारा"
          className="-mt-[30px] grid h-[62px] w-[62px] place-items-center rounded-full border-[5px] border-white bg-nr-primary text-white shadow-[0_10px_22px_-8px_var(--nr-primary)]"
        >
          <IChat size={24} strokeWidth={2} />
        </button>
        <span aria-hidden className="text-xs font-extrabold text-nr-primary">
          विचारा
        </span>
      </span>
      <a href="#districts" className={`${cell} sm:hidden`}>
        <IPin size={21} />
        {label('जिल्हा')}
      </a>
      <a href="#factcheck" className={`${cell} max-sm:hidden`}>
        <IShield size={21} />
        {label('फॅक्ट चेक')}
      </a>
      <button type="button" onClick={openFold} aria-haspopup="dialog" className={cell}>
        <IDownload size={21} />
        {label('फोल्ड')}
      </button>
      <a href="#archive" className={`${cell} max-sm:hidden`}>
        <IArchive size={21} />
        {label('संग्रह')}
      </a>
    </nav>
  )
}
