'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

export type MainNavItem = { label: string; href: string; phone?: boolean }
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
 */
export function MainNav({ items, social = [] }: { items: MainNavItem[]; social?: MainNavSocial[] }) {
  const [active, setActive] = useState(0)
  const activeRef = useRef(0)
  /* While a click's smooth scroll runs, the spy would walk the pill through
     every section on the way; hold it until the scroll settles. */
  const lockUntil = useRef(0)
  const rowRef = useRef<HTMLDivElement>(null)

  const select = (i: number) => {
    activeRef.current = i
    setActive(i)
  }

  useEffect(() => {
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
  }, [items])

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
          className="nr-scroll flex gap-1 overflow-x-auto px-2.5 pb-2.5 text-[0.90625rem] lg:items-center lg:px-0 lg:pb-0 lg:text-[0.96875rem]"
        >
          {items.map((n, i) => {
            const on = i === active
            return (
              <a
                key={n.label}
                href={n.href}
                aria-current={on ? 'page' : undefined}
                onClick={() => {
                  lockUntil.current = Date.now() + 1000
                  select(i)
                }}
                className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 transition-colors ${n.phone ? '' : 'max-lg:hidden'} ${
                  on ? 'bg-nr-primary font-bold text-white' : 'font-semibold text-[#4A2E30] hover:bg-nr-peach'
                }`}
              >
                {n.label}
              </a>
            )
          })}
          {links('ml-auto flex shrink-0 border-l border-[#F3E2D2] pl-2 lg:hidden')}
        </div>
        {links('flex justify-self-end max-lg:hidden')}
      </div>
    </nav>
  )
}
