'use client'

import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import type { NewsItem } from '@/lib/news/public'
import { IChat } from './icons'
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

/* ------------------------------------------------------------- chat button */

/**
 * The assistant's button, floating at the bottom right — where its panel
 * opens, and where focus returns when the panel closes (`nr-chat-trigger`).
 */
export function ChatButton() {
  const { openChat } = useNewsUi()
  return (
    <button
      type="button"
      id="nr-chat-trigger"
      onClick={() => openChat()}
      aria-haspopup="dialog"
      aria-label="महासंवाद सहाय्यकाला विचारा"
      className="fixed bottom-4 right-4 z-[45] flex h-14 items-center gap-2 rounded-full border-4 border-white bg-nr-primary pl-3.5 pr-5 text-[0.9375rem] font-extrabold text-white shadow-[0_14px_30px_-10px_var(--nr-primary)] sm:bottom-6 sm:right-6 sm:h-[60px]"
    >
      <IChat size={22} strokeWidth={2} />
      विचारा
    </button>
  )
}
