'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { IconArrowRight, IconChevronLeft, IconChevronRight, IconPause, IconPlay } from '@/components/ui'
import { toDevanagariDigits } from '@/lib/marathi'
import { StoryPhoto } from './story-photo'

/** One lead story, flattened on the server so nothing but strings crosses. */
export type LeadSlide = {
  id: string
  href: string
  title: string
  summary: string | null
  kicker: string
  place: string
  when: string
  imageUrl: string | null
  imageCredit: string | null
}

const INTERVAL_MS = 7000

/**
 * The lead stories, rotating.
 *
 * Built to the APG tabbed-carousel pattern, with the brakes WCAG 2.2.2 asks
 * for and a few more:
 *
 *  - a visible pause/play control, always;
 *  - no rotation at all when the reader prefers reduced motion — the carousel
 *    arrives paused, and only pressing play starts it;
 *  - held while the pointer is over it or focus is inside it, so a story does
 *    not change under someone reading or tabbing through it;
 *  - stopped for good once the reader picks a story themselves;
 *  - announced politely only while paused, so a rotating carousel does not
 *    talk over the page every seven seconds.
 *
 * It starts paused on the server and on the first client render, and only
 * begins rotating after mount, once the motion preference has been read —
 * a carousel that moved before it knew would move for the readers who asked
 * it not to.
 */
export function LeadCarousel({ slides }: { slides: LeadSlide[] }) {
  const [index, setIndex] = useState(0)
  /* null until the motion preference has been read on mount. */
  const [paused, setPaused] = useState<boolean | null>(null)
  const [held, setHeld] = useState(false)
  const count = slides.length

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPaused(query.matches)
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setPaused(true)
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const playing = paused === false && !held && count > 1

  useEffect(() => {
    if (!playing) return
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % count), INTERVAL_MS)
    return () => window.clearTimeout(t)
  }, [playing, index, count])

  /** The reader chose a story: show it and stop moving. */
  const pick = useCallback(
    (i: number) => {
      setIndex(((i % count) + count) % count)
      setPaused(true)
    },
    [count],
  )

  if (!count) return null
  const cur = slides[index]
  const isPaused = paused !== false
  const pos = `${toDevanagariDigits(index + 1)} / ${toDevanagariDigits(count)}`
  const pauseLabel = isPaused ? 'कॅरोसेल सुरू करा' : 'कॅरोसेल थांबवा'

  const pauseButton = (className: string) => (
    <button
      type="button"
      onClick={() => {
        /* Pressing play is a request to move now, not once the pointer or
           focus leaves — which, on this very button, it has not. */
        if (isPaused) setHeld(false)
        setPaused(!isPaused)
      }}
      aria-label={pauseLabel}
      title={pauseLabel}
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${className}`}
    >
      {isPaused ? <IconPlay size={15} /> : <IconPause size={15} />}
    </button>
  )

  const stepButton = (dir: -1 | 1, className: string) => (
    <button
      type="button"
      onClick={() => pick(index + dir)}
      aria-label={dir < 0 ? 'मागील बातमी' : 'पुढील बातमी'}
      className={`grid h-11 w-11 place-items-center rounded-full ${className}`}
    >
      {dir < 0 ? <IconChevronLeft size={18} strokeWidth={2} /> : <IconChevronRight size={18} strokeWidth={2} />}
    </button>
  )

  return (
    <section
      aria-roledescription="carousel"
      aria-label="प्रमुख बातम्या"
      className="overflow-hidden rounded-[20px] bg-surface shadow-card"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false)
      }}
    >
      <div
        id="lead-slide"
        role="tabpanel"
        aria-roledescription="slide"
        aria-label={pos}
        className="lg:grid lg:h-[450px] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
      >
        <div className="relative h-[210px] sm:h-[320px] lg:h-full">
          <StoryPhoto
            key={cur.id}
            src={cur.imageUrl}
            credit={cur.imageCredit}
            size="lg"
            chip
            eager={index === 0}
            fill
            className="fade-in"
          />
          <span className="absolute left-3 top-3 rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold text-place lg:hidden">
            {cur.place}
          </span>
          <div className="absolute bottom-3 right-4 hidden gap-2 lg:flex">
            {stepButton(-1, 'bg-surface text-ink shadow-md hover:bg-sunk')}
            {stepButton(1, 'bg-surface text-ink shadow-md hover:bg-sunk')}
          </div>
        </div>

        <div className="flex flex-col p-[18px] lg:px-8 lg:pb-[26px] lg:pt-8" aria-live={isPaused ? 'polite' : 'off'}>
          <div className="hidden flex-wrap items-center gap-2 text-xs lg:flex">
            <span className="rounded-full bg-saffron-soft px-2.5 py-0.5 font-bold text-saffron-ink">{cur.kicker}</span>
            <span className="rounded-full bg-place-soft px-2.5 py-0.5 font-semibold text-place">{cur.place}</span>
          </div>
          <p className="text-xs text-muted lg:hidden">{cur.when}</p>
          <h2 className="display mt-1.5 text-[1.3125rem] font-bold leading-[1.45] lg:mt-4 lg:line-clamp-4 lg:text-[1.75rem]">
            <Link href={cur.href} className="hover:text-accent">
              {cur.title}
            </Link>
          </h2>
          {cur.summary && (
            <p className="mt-3 hidden text-[0.9375rem] leading-[1.75] text-secondary lg:line-clamp-3">{cur.summary}</p>
          )}
          <p className="mt-2.5 hidden text-[0.8125rem] text-muted lg:block">{cur.when}</p>

          <div className="mt-3.5 flex items-center gap-3 lg:mt-auto lg:pt-4">
            <Link
              href={cur.href}
              className="flex h-12 grow items-center justify-center gap-1.5 rounded-full bg-accent px-5 text-sm font-bold text-white hover:bg-[var(--accent-hover)] lg:h-11 lg:grow-0"
            >
              संपूर्ण बातमी वाचा <IconArrowRight size={14} />
            </Link>
            <span className="ml-auto hidden text-[0.8125rem] font-semibold text-secondary lg:inline">{pos}</span>
            {pauseButton('hidden border border-edge bg-surface text-ink hover:bg-sunk lg:grid')}
          </div>
        </div>
      </div>

      {/* Phone: arrows and dots under the story. */}
      <div className="flex items-center justify-between px-2.5 pb-3 lg:hidden">
        {stepButton(-1, 'bg-paper text-ink')}
        <Tabs slides={slides} index={index} pick={pick} variant="dots" />
        <div className="flex gap-1">
          {pauseButton('bg-paper text-ink')}
          {stepButton(1, 'bg-paper text-ink')}
        </div>
      </div>

      {/* Desktop: every lead story named, so none is hidden behind the rotation. */}
      <Tabs slides={slides} index={index} pick={pick} variant="titles" />
    </section>
  )
}

function Tabs({
  slides,
  index,
  pick,
  variant,
}: {
  slides: LeadSlide[]
  index: number
  pick: (i: number) => void
  variant: 'dots' | 'titles'
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  /* Arrow keys move between tabs, per the APG tabs pattern; focus follows. */
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const last = slides.length - 1
    const next =
      e.key === 'ArrowRight' ? (index + 1) % slides.length
      : e.key === 'ArrowLeft' ? (index + last) % slides.length
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null
    if (next === null) return
    e.preventDefault()
    pick(next)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label="प्रमुख बातमी निवडा"
      className={
        variant === 'dots'
          ? 'flex items-center'
          : 'hidden grid-cols-5 gap-1.5 bg-paper p-2.5 lg:grid'
      }
    >
      {slides.map((s, k) => {
        const on = k === index
        return (
          <button
            key={s.id}
            ref={(el) => {
              refs.current[k] = el
            }}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls="lead-slide"
            tabIndex={on ? 0 : -1}
            onClick={() => pick(k)}
            onKeyDown={onKeyDown}
            aria-label={variant === 'dots' ? `बातमी ${toDevanagariDigits(k + 1)}: ${s.title}` : undefined}
            className={
              variant === 'dots'
                ? 'grid h-11 w-[30px] place-items-center'
                : `flex min-h-[72px] items-start gap-2.5 rounded-xl px-3 py-2.5 text-left ${on ? 'bg-surface' : 'hover:bg-sunk'}`
            }
          >
            {variant === 'dots' ? (
              <span
                aria-hidden
                className={`block h-2 rounded-full transition-[width] ${on ? 'w-[22px] bg-saffron' : 'w-2 bg-[var(--edge-strong)]'}`}
              />
            ) : (
              <>
                <span
                  aria-hidden
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${on ? 'bg-saffron text-ink' : 'bg-[var(--edge)] text-secondary'}`}
                >
                  {toDevanagariDigits(k + 1)}
                </span>
                <span className={`line-clamp-2 text-[0.8125rem] leading-[1.45] text-ink ${on ? 'font-bold' : 'font-medium'}`}>
                  {s.title}
                </span>
              </>
            )}
          </button>
        )
      })}
    </div>
  )
}
