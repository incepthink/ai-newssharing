'use client'

import { useCallback, useState, type AnimationEvent, type KeyboardEvent, type ReactNode } from 'react'
import { StoryPhoto } from '@/components/news/story-photo'
import { mrDigits, type NewsItem } from '@/lib/news/public'
import { IArrowLeft, IArrowRight, IPause, IPlay } from './icons'
import { ReadLink } from './triggers'
import { useNewsUi } from './ui'

export type HeroSlide = {
  item: NewsItem
  /** The yellow chip — the coverage or topic the story belongs to. */
  kicker: string
  /** The tab's accessible name: a few words of the headline. */
  short: string
}

/**
 * The lead releases, full-bleed, rotating every four and a half seconds.
 *
 * The behaviour is the APG tabbed carousel the old `LeadCarousel` built:
 *
 *  - it autoplays from the start, for every reader;
 *  - a visible pause/play control, always — pausing is the reader's to do;
 *  - held only while a dialog on the page is open — the dash freezes where it
 *    is rather than restarting;
 *  - picking a story (arrows or a dash) jumps there and keeps rotating from it;
 *  - announced politely only while paused;
 *  - arrow keys, Home and End on the dashes.
 *
 * The active dash's fill is what advances it (`.nr-fill`), so the bar the
 * reader watches is exactly the time left. `aside` is the district news map,
 * drawn inside the hero on a wide screen.
 */
export function HeroCarousel({ slides, aside }: { slides: HeroSlide[]; aside?: ReactNode }) {
  const ui = useNewsUi()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = slides.length

  const go = useCallback(
    (i: number, focus: boolean) => {
      const k = ((i % count) + count) % count
      setIndex(k)
      if (focus) window.requestAnimationFrame(() => document.getElementById(`nr-hero-tab-${k}`)?.focus())
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

  const isPaused = paused || count < 2
  const holding = ui.busy

  const onTabKey = (e: KeyboardEvent) => {
    const map: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: count - 1 }
    if (e.key in map) {
      e.preventDefault()
      go(map[e.key], true)
    }
  }

  return (
    <section
      id="top"
      aria-roledescription="carousel"
      aria-label="प्रमुख बातम्या"
      className="relative h-[600px] scroll-mt-40 overflow-hidden bg-nr-deep lg:h-[660px]"
    >
      <div aria-live={isPaused ? 'polite' : 'off'}>
        {slides.map((s, k) => {
          const on = k === index
          return (
            <div
              key={s.item.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${mrDigits(k + 1)} / ${mrDigits(count)}`}
              aria-hidden={!on}
              className={`absolute inset-0 transition-[opacity,visibility] duration-700 motion-reduce:transition-none ${on ? 'visible opacity-100' : 'invisible opacity-0'}`}
            >
              <div className="nr-kenburns absolute inset-0" style={{ transform: on ? 'scale(1.04)' : 'scale(1)' }}>
                <StoryPhoto src={s.item.img} video={s.item.video} size="lg" fill eager={k === 0} className="!bg-nr-deep text-white/40" />
              </div>
              {/* Phone: the tint rises from the bottom, under the text. */}
              <div
                className="absolute inset-0 lg:hidden"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgb(168 23 44 / 0.22) 32%, rgb(168 23 44 / 0.72) 52%, rgb(168 23 44 / 0.94) 75%)',
                }}
              />
              {/* Desk: from the left, under the headline column. */}
              <div
                className="absolute inset-0 hidden lg:block"
                style={{
                  background:
                    'linear-gradient(90deg, rgb(168 23 44 / 0.94) 0%, rgb(168 23 44 / 0.72) 38%, rgb(168 23 44 / 0.22) 62%, rgba(0,0,0,0.05) 100%)',
                }}
              />
              <div className="absolute inset-0 hidden lg:block" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(40,6,10,0.45) 100%)' }} />

              <div className="absolute inset-x-[18px] bottom-24 flex flex-col gap-3 text-white lg:inset-x-auto lg:bottom-auto lg:left-[max(1.25rem,calc((100vw-1280px)/2))] lg:top-16 lg:w-[600px] lg:gap-4">
                <div className="flex flex-wrap gap-2">
                  {s.kicker && (
                    <span className="rounded-full bg-nr-chip px-3.5 py-[5px] text-[0.8125rem] font-extrabold text-nr-chip-ink lg:text-sm">{s.kicker}</span>
                  )}
                  <span className="rounded-full border border-white/40 bg-white/10 px-3.5 py-[5px] text-[0.8125rem] font-semibold lg:text-sm">
                    <span className="max-lg:hidden">{s.item.place} · </span>
                    {s.item.dateLabel}
                    {s.item.time ? `, ${s.item.time}` : ''}
                  </span>
                </div>
                <h2 className="nr-h m-0 line-clamp-4 text-[1.5625rem] font-extrabold leading-[1.45] [text-shadow:0_2px_18px_rgba(60,0,10,0.35)] lg:mt-1 lg:line-clamp-5 lg:text-[2.5rem] lg:leading-[1.42]">
                  <ReadLink item={s.item} className="nr-link text-white">
                    {s.item.title}
                  </ReadLink>
                </h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                  <ReadLink
                    item={s.item}
                    className="flex h-[50px] items-center gap-3 rounded-full bg-white pl-1.5 pr-5 text-base font-extrabold text-nr-text shadow-[0_0_0_6px_rgba(255,217,120,0.25),0_14px_30px_-10px_rgba(0,0,0,0.45)] sm:h-[54px] sm:pl-2 sm:pr-[22px] sm:text-[1.0625rem]"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-nr-primary text-white">
                      <IArrowRight size={18} strokeWidth={2.4} />
                    </span>
                    संपूर्ण बातमी वाचा
                  </ReadLink>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {count > 1 && (
        <div className="absolute inset-x-[18px] bottom-[26px] flex items-center gap-2.5 lg:inset-x-auto lg:bottom-10 lg:left-[max(1.25rem,calc((100vw-1280px)/2))] lg:gap-3.5">
          <button
            type="button"
            onClick={() => go(index - 1, false)}
            aria-label="मागील बातमी"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-[1.5px] border-white/60 bg-black/[0.12] text-white lg:h-[46px] lg:w-[46px]"
          >
            <IArrowLeft size={18} strokeWidth={2} />
          </button>
          <div role="tablist" aria-label="प्रमुख बातम्या निवडा" onKeyDown={onTabKey} className="flex grow gap-[5px] lg:grow-0 lg:gap-1.5">
            {slides.map((s, k) => {
              const on = k === index
              return (
                <button
                  key={s.item.id}
                  id={`nr-hero-tab-${k}`}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-label={s.short}
                  tabIndex={on ? 0 : -1}
                  onClick={() => go(k, false)}
                  className={`flex h-11 items-center p-0 transition-[width,flex-grow] duration-300 ${on ? 'flex-[3_1_0] lg:w-14 lg:flex-none' : 'flex-[1_1_0] lg:w-[22px] lg:flex-none'}`}
                >
                  <span className="relative block h-1 w-full overflow-hidden rounded-full bg-white/35">
                    {k < index && <span className="absolute inset-0 bg-white/75" />}
                    {on && !isPaused && (
                      <span
                        key={`run-${index}`}
                        className="nr-fill absolute inset-0 bg-nr-chip"
                        onAnimationEnd={advance}
                        style={{ animationPlayState: holding ? 'paused' : 'running' }}
                      />
                    )}
                    {on && isPaused && <span className="absolute inset-0 bg-nr-chip" />}
                  </span>
                </button>
              )
            })}
          </div>
          <button
            type="button"
            onClick={() => go(index + 1, false)}
            aria-label="पुढील बातमी"
            className="order-last grid h-11 w-11 shrink-0 place-items-center rounded-full border-[1.5px] border-white/60 bg-black/[0.12] text-white lg:order-none lg:h-[46px] lg:w-[46px]"
          >
            <IArrowRight size={18} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => setPaused(!isPaused)}
            aria-label={isPaused ? 'कॅरोसेल सुरू करा' : 'कॅरोसेल थांबवा'}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white lg:h-[46px] lg:w-[46px]"
          >
            {isPaused ? <IPlay size={16} /> : <IPause size={16} />}
          </button>
        </div>
      )}

      {aside}
    </section>
  )
}
