'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { IChevronDown } from './icons'

export type MainNavLink = { label: string; href: string }
/** `menu` — pages under the item (each scheme, each programme), dropped down
 *  under it on hover or keyboard focus on a wide screen. The first is the
 *  hub page itself, set in bold. */
export type MainNavItem = { label: string; href: string; phone?: boolean; menu?: MainNavLink[] }
export type MainNavSocial = { name: string; url: string; glyph: ReactNode; tile: string }

/** How far below the window's top a section must start to count as the one
 *  being read — clear of the sticky masthead. */
const SPY_OFFSET = 200

/**
 * मुख्य विभाग — the masthead's section links. The item the reader clicked
 * goes dark at once; as the page scrolls, the dark pill follows the section in
 * view. Every other item lightens under the pointer. Without JavaScript these
 * are plain anchors and the first stays marked. `social` — DGIPR's official
 * accounts — sits at the row's right on a wide screen, at its end on a phone.
 *
 * A `#` item is a section of `/news`. On another page (`current` set — the
 * योजना and व्हिडिओ pages) it links back there, the item the page belongs to
 * stays lit, and there is nothing to spy on.
 */
export function MainNav({
  items,
  social = [],
  current,
}: {
  items: MainNavItem[]
  social?: MainNavSocial[]
  /** The href of the item the page this nav sits on belongs to, when it is
   *  not `/news`. */
  current?: string
}) {
  const start = current ? Math.max(0, items.findIndex((n) => n.href === current)) : 0
  const [active, setActive] = useState(start)
  const activeRef = useRef(start)
  /* While a click's smooth scroll runs, the spy would walk the pill through
     every section on the way; hold it until the scroll settles. */
  const lockUntil = useRef(0)
  const rowRef = useRef<HTMLDivElement>(null)

  const select = (i: number) => {
    activeRef.current = i
    setActive(i)
  }

  useEffect(() => {
    if (current) return
    /* Land on the item the URL already names: a full link first (an item
       may carry a search), then its section. */
    const here = `${window.location.search}${window.location.hash}`
    const byFull = items.findIndex((n) => n.href.startsWith('/') && n.href.endsWith(here) && here.includes('?'))
    const byHash = window.location.hash ? items.findIndex((n) => n.href === window.location.hash) : -1
    if (byFull >= 0) select(byFull)
    else if (byHash >= 0) select(byHash)

    const sections = [...new Set(items.map((n) => n.href.split('#')[1]).filter(Boolean))]
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    let frame = 0
    const spy = () => {
      frame = 0
      if (Date.now() < lockUntil.current) return
      let current: HTMLElement | null = null
      for (const el of sections) {
        if (el.getBoundingClientRect().top <= SPY_OFFSET && (!current || el.getBoundingClientRect().top > current.getBoundingClientRect().top)) {
          current = el
        }
      }
      const hash = `#${current?.id ?? 'top'}`
      /* Two items can share a section: keep the one already lit if it
         points there. */
      if (items[activeRef.current]?.href.endsWith(hash)) return
      const i = items.findIndex((n) => n.href === hash)
      if (i >= 0) select(i)
    }
    const onScroll = () => {
      if (Date.now() < lockUntil.current) lockUntil.current = Date.now() + 150
      if (!frame) frame = window.requestAnimationFrame(spy)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    /* A reload can restore the page mid-way down. */
    if (byFull < 0) spy()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [items, current])

  /* Keep the lit pill in view on a phone, where the row scrolls sideways.
     Scrolls the row only — never the page, which may be mid-scroll. */
  useEffect(() => {
    const row = rowRef.current
    const pill = row?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!row || !pill || row.scrollWidth <= row.clientWidth) return
    const left = pill.offsetLeft - row.offsetLeft
    if (left < row.scrollLeft || left + pill.offsetWidth > row.scrollLeft + row.clientWidth) {
      row.scrollTo({ left: left - 16, behavior: 'smooth' })
    }
  }, [active])

  const links = (className: string) =>
    social.length > 0 && (
      <ul aria-label="सोशल मीडिया" className={`m-0 list-none items-center gap-1.5 p-0 ${className}`}>
        {social.map((s) => (
          <li key={s.name}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${s.name} — नवीन टॅबमध्ये उघडते`}
              title={s.name}
              style={{ background: s.tile }}
              className="grid h-8 w-8 place-items-center rounded-full text-white transition-[transform,filter] hover:-translate-y-px hover:brightness-110"
            >
              {s.glyph}
            </a>
          </li>
        ))}
      </ul>
    )

  return (
    <nav aria-label="मुख्य विभाग" className="lg:border-t lg:border-[#F3E2D2]">
      <div className="mx-auto max-w-[1328px] lg:grid lg:h-[44px] lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-4 lg:px-6">
        <span aria-hidden="true" className="max-lg:hidden" />
        <div
          ref={rowRef}
          className="nr-scroll flex gap-1 overflow-x-auto px-2.5 pb-2.5 text-[0.90625rem] lg:items-center lg:overflow-visible lg:px-0 lg:pb-0 lg:text-[0.96875rem]"
        >
          {items.map((n, i) => {
            const on = i === active
            const link = (
              <a
                key={n.label}
                href={current && n.href.startsWith('#') ? `/news${n.href}` : n.href}
                aria-current={on ? 'page' : undefined}
                onClick={() => {
                  lockUntil.current = Date.now() + 1000
                  select(i)
                }}
                className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3.5 py-1.5 transition-colors ${n.phone ? '' : 'max-lg:hidden'} ${
                  on ? 'bg-nr-primary font-bold text-white' : 'font-semibold text-[#4A2E30] hover:bg-nr-peach'
                }`}
              >
                {n.label}
                {n.menu && n.menu.length > 0 && (
                  <IChevronDown size={14} strokeWidth={2.4} className="transition-transform max-lg:hidden lg:group-hover:rotate-180 lg:group-focus-within:rotate-180" />
                )}
              </a>
            )
            if (!n.menu || n.menu.length === 0) return link
            /* The menu hangs from a padded box flush with the pill, so the
               pointer crosses no gap on its way down. Phones have no hover:
               there the pill alone leads to the section. */
            return (
              <div key={n.label} className="group relative shrink-0">
                {link}
                <div className="invisible absolute left-0 top-full z-40 pt-2 opacity-0 transition-opacity max-lg:hidden lg:group-focus-within:visible lg:group-focus-within:opacity-100 lg:group-hover:visible lg:group-hover:opacity-100">
                  <ul
                    aria-label={n.label}
                    className="m-0 min-w-[240px] max-w-[340px] list-none rounded-2xl border border-[#F3E2D2] bg-white p-1.5 shadow-[0_18px_40px_-18px_rgba(74,46,48,0.45)]"
                  >
                    {n.menu.map((m, j) => (
                      <li key={m.href}>
                        <a
                          href={m.href}
                          className={`block rounded-xl px-3.5 py-2 text-[0.9375rem] leading-snug text-[#4A2E30] transition-colors hover:bg-nr-peach focus-visible:bg-nr-peach ${
                            j === 0 ? 'font-bold text-nr-primary' : 'font-semibold'
                          }`}
                        >
                          {m.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
          {links('ml-auto flex shrink-0 border-l border-[#F3E2D2] pl-2 lg:hidden')}
        </div>
        {links('flex justify-self-end max-lg:hidden')}
      </div>
    </nav>
  )
}
