'use client'

import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import type { NewsItem } from '@/lib/news/public'
import { IChat, IDownload, IHome, IPin, ISearch, IShield, IVideo } from './icons'
import { plainClick, useNewsUi } from './ui'

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

/** The search box in सर्व मंजूर प्रसिद्धीपत्रके (`ReleasesBrowser`). */
export const RELEASE_SEARCH_ID = 'rel-search'

/**
 * "शोधा" in the masthead and the bottom bar: brings the releases' search box
 * into view and puts the cursor in it, so the reader searches the list itself.
 * Without JS it is a plain jump to the section.
 */
export function ReleaseSearchLink({ className, children, label }: { className: string; children: ReactNode; label?: string }) {
  return (
    <a
      href="#releases"
      aria-label={label}
      onClick={(e) => {
        const input = document.getElementById(RELEASE_SEARCH_ID)
        if (!plainClick(e) || !(input instanceof HTMLInputElement)) return
        e.preventDefault()
        const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        input.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' })
        input.focus({ preventScroll: true })
        input.select()
      }}
      className={className}
    >
      {children}
    </a>
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

/* ---------------------------------------------------------------- bottom bar */

const cell =
  'flex h-[60px] flex-col items-center justify-center gap-0.5 border-0 bg-transparent text-[0.78rem] font-bold text-nr-primary'

/**
 * The floating pill at the bottom: six jumps on a desk and four on a phone,
 * split evenly either side of the raised "विचारा" button that opens the
 * assistant.
 */
export function BottomNav() {
  const { openFold, openChat } = useNewsUi()
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
      <ReleaseSearchLink className={cell}>
        <ISearch size={21} />
        {label('शोधा')}
      </ReleaseSearchLink>
      <a href="#media" className={`${cell} max-sm:hidden`}>
        <IVideo size={21} />
        {label('व्हिडिओ')}
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
      <a href="#releases" className={cell}>
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
    </nav>
  )
}
