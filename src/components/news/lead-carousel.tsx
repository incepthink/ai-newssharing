'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, type AnimationEvent, type KeyboardEvent } from 'react'
import { IconChevronLeft, IconChevronRight, IconPause, IconPlay } from '@/components/ui'
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
  videoUrl: string | null
}

/** The glass the controls and chips sit on, over any photograph. */
const GLASS = 'bg-[rgb(20_17_14/0.5)] text-white'

/**
 * The lead stories, rotating.
 *
 * The photograph is the whole slide: only the date and headline are set over
 * it on a dark gradient, and the stories line up underneath as tabs, each with
 * a progress bar that fills over its four seconds. The bar's end is what advances the
 * carousel (see `.lead-fill`), so what the reader sees filling is exactly the
 * time left.
 *
 * Built to the APG tabbed-carousel pattern, with the brakes WCAG 2.2.2 asks
 * for and a few more:
 *
 *  - a visible pause/play control, always;
 *  - no rotation at all when the reader prefers reduced motion — the carousel
 *    arrives paused, and only pressing play starts it;
 *  - held while the pointer is over it or focus is inside it, so a story does
 *    not change under someone reading or tabbing through it — the bar freezes
 *    where it is rather than starting over;
 *  - stopped for good once the reader picks a story themselves;
 *  - announced politely only while paused, so a rotating carousel does not
 *    talk over the page every four seconds.
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

  /** The reader chose a story: show it and stop moving. */
  const pick = useCallback(
    (i: number) => {
      setIndex(((i % count) + count) % count)
      setPaused(true)
    },
    [count],
  )

  const advance = useCallback(
    (e: AnimationEvent<HTMLSpanElement>) => {
      if (e.target === e.currentTarget) setIndex((i) => (i + 1) % count)
    },
    [count],
  )

  if (!count) return null
  const isPaused = paused !== false
  const rotating = !isPaused && count > 1
  const multi = count > 1
  const pos = `${toDevanagariDigits(index + 1)} / ${toDevanagariDigits(count)}`
  const pauseLabel = isPaused ? 'कॅरोसेल सुरू करा' : 'कॅरोसेल थांबवा'
  const bar: Bar = { index, rotating, held, advance }

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
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${className}`}
    >
      {dir < 0 ? <IconChevronLeft size={18} strokeWidth={2} /> : <IconChevronRight size={18} strokeWidth={2} />}
    </button>
  )

  return (
    <section
      aria-roledescription="carousel"
      aria-label="प्रमुख बातम्या"
      className="glass overflow-hidden rounded-[20px]"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false)
      }}
    >
      <div className="relative h-[448px] overflow-hidden bg-ink sm:h-[440px] lg:h-[468px]" aria-live={isPaused ? 'polite' : 'off'}>
        {slides.map((s, k) => {
          const on = k === index
          return (
            <div
              key={s.id}
              id={`lead-slide-${k}`}
              role="tabpanel"
              aria-roledescription="slide"
              aria-label={`${toDevanagariDigits(k + 1)} / ${toDevanagariDigits(count)}`}
              aria-hidden={!on}
              className={`absolute inset-0 transition-[opacity,visibility] duration-700 motion-reduce:transition-none ${on ? 'visible opacity-100' : 'invisible opacity-0'}`}
            >
              {/* A slow settle from a slight zoom while the story is up. */}
              <div
                className={`absolute inset-0 transition-transform duration-[4000ms] ease-linear motion-reduce:transform-none motion-reduce:transition-none ${on ? 'scale-100' : 'scale-[1.06]'}`}
              >
                <StoryPhoto src={s.imageUrl} video={s.videoUrl} size="lg" eager={k === 0} fill />
              </div>
              <div
                aria-hidden
                className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,17,14,0)_26%,rgba(20,17,14,0.66)_52%,rgba(20,17,14,0.95)_100%)] lg:bg-[linear-gradient(180deg,rgba(20,17,14,0)_34%,rgba(20,17,14,0.62)_62%,rgba(20,17,14,0.94)_100%)]"
              />
              {/* Only the date and the headline sit over the photograph. */}
              <div className="absolute bottom-[18px] left-[18px] right-[18px] flex flex-col gap-2 lg:bottom-[30px] lg:left-9 lg:right-9">
                <span className="text-xs text-white/80 lg:text-[0.8125rem]">{s.when}</span>
                <h2 className="display m-0 line-clamp-4 max-w-[680px] text-pretty text-[1.3125rem] font-bold leading-[1.45] lg:line-clamp-3 lg:text-[1.875rem] lg:leading-[1.42]">
                  <Link href={s.href} className="text-white hover:text-white hover:underline hover:underline-offset-4">
                    {s.title}
                  </Link>
                </h2>
              </div>
            </div>
          )
        })}

        {/* Desktop: position and every control, top right. */}
        <div className="absolute right-5 top-4 z-[3] hidden items-center gap-2 lg:flex">
          <span className={`flex h-8 items-center rounded-full px-3 text-[0.8125rem] font-semibold ${GLASS}`}>{pos}</span>
          {multi && (
            <>
              {pauseButton(`border border-white/[0.24] hover:bg-[rgb(20_17_14/0.72)] ${GLASS}`)}
              {stepButton(-1, `border border-white/[0.24] hover:bg-[rgb(20_17_14/0.72)] ${GLASS}`)}
              {stepButton(1, `border border-white/[0.24] hover:bg-[rgb(20_17_14/0.72)] ${GLASS}`)}
            </>
          )}
        </div>

        {/* Phone: position left, pause right; the arrows go under the story. */}
        <div className="absolute left-3.5 right-3 top-3 z-[3] flex items-center justify-between lg:hidden">
          <span className={`flex h-[30px] items-center rounded-full px-[11px] text-xs font-semibold ${GLASS}`}>{pos}</span>
          {multi && pauseButton(`border border-white/[0.24] ${GLASS}`)}
        </div>
      </div>

      {multi && (
        <>
          {/* Phone: a segmented bar between the arrows. */}
          <div className="flex items-center gap-0.5 px-1.5 py-1 lg:hidden">
            {stepButton(-1, 'text-ink hover:bg-paper')}
            <Tabs slides={slides} pick={pick} bar={bar} variant="segments" />
            {stepButton(1, 'text-ink hover:bg-paper')}
          </div>

          {/* Desktop: every lead story named, so none is hidden behind the rotation. */}
          <Tabs slides={slides} pick={pick} bar={bar} variant="titles" />
        </>
      )}
    </section>
  )
}

type Bar = {
  index: number
  rotating: boolean
  held: boolean
  advance: (e: AnimationEvent<HTMLSpanElement>) => void
}

/**
 * One story's progress: grey once passed, filling while it is up, full while
 * the carousel is paused on it. Only the visible tab list's bar is ever laid
 * out, so only one `animationend` can fire per story.
 */
function Progress({ k, bar, className }: { k: number; bar: Bar; className: string }) {
  const on = k === bar.index
  return (
    <span aria-hidden className={`relative block w-full overflow-hidden rounded-full bg-edge ${className}`}>
      {k < bar.index && <span className="absolute inset-0 bg-[#b8b1a6]" />}
      {on && bar.rotating && (
        <span
          className="lead-fill absolute inset-0 bg-saffron"
          style={{ animationPlayState: bar.held ? 'paused' : 'running' }}
          onAnimationEnd={bar.advance}
        />
      )}
      {on && !bar.rotating && <span className="absolute inset-0 bg-saffron" />}
    </span>
  )
}

function Tabs({
  slides,
  pick,
  bar,
  variant,
}: {
  slides: LeadSlide[]
  pick: (i: number) => void
  bar: Bar
  variant: 'segments' | 'titles'
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const { index } = bar

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
        variant === 'segments'
          ? 'flex min-w-0 grow gap-1'
          : 'hidden gap-1 px-2.5 pb-2.5 pt-2 lg:grid'
      }
      style={variant === 'titles' ? { gridTemplateColumns: `repeat(${slides.length}, minmax(0, 1fr))` } : undefined}
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
            aria-controls={`lead-slide-${k}`}
            tabIndex={on ? 0 : -1}
            onClick={() => pick(k)}
            onKeyDown={onKeyDown}
            aria-label={variant === 'segments' ? `बातमी ${toDevanagariDigits(k + 1)}: ${s.title}` : undefined}
            className={
              variant === 'segments'
                ? 'flex h-11 min-w-0 flex-1 items-center'
                : `flex min-h-[98px] flex-col gap-2 rounded-[12px] px-3 pb-3.5 pt-3 text-left ${on ? 'bg-paper' : 'hover:bg-paper'}`
            }
          >
            {variant === 'segments' ? (
              <Progress k={k} bar={bar} className="h-1" />
            ) : (
              <>
                <Progress k={k} bar={bar} className="h-[3px]" />
                <span className="flex min-w-0 items-baseline gap-1.5 text-xs">
                  <b className={`font-bold ${on ? 'text-saffron-ink' : 'text-muted'}`}>{toDevanagariDigits(k + 1)}</b>
                  <span className="truncate text-muted">{s.kicker}</span>
                </span>
                <span className={`line-clamp-2 text-sm leading-[1.45] ${on ? 'font-bold text-ink' : 'font-medium text-secondary'}`}>
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
