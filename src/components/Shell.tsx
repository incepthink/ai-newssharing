'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { foldDateMr, todayIso, WEEKDAYS_MR } from '@/lib/marathi'
import { IconInbox, IconLayers, IconMapPin, IconPen, IconShare } from '@/components/ui'

/**
 * The masthead.
 *
 * The identity is Mahasamvad's own lockup — the state seal and the department
 * line as they already appear on the portal — rather than a wordmark invented
 * here. Beside it, set off by a rule, the one thing the lockup does not say:
 * which of the department's tools this is.
 *
 * Five screens, one for each thing anyone does here, always visible and always
 * showing which one you are on. The old header was five identical links with
 * nothing marking the current page; on a product where the desk crosses between
 * the queue and the fold thirty times a day, that is not a decoration.
 */

const NAV = [
  { href: '/dlo', label: 'लेख पाठवा', Icon: IconPen },
  { href: '/desk', label: 'वृत्त विभाग', Icon: IconInbox },
  { href: '/fold', label: 'आजचा फोल्ड', Icon: IconLayers },
  { href: '/share', label: 'शेअर करा', Icon: IconShare },
  { href: '/map', label: 'नकाशा', Icon: IconMapPin },
]

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          borderColor: 'var(--edge)',
          background: 'rgb(246 245 242 / 0.85)',
          backdropFilter: 'saturate(180%) blur(12px)',
          WebkitBackdropFilter: 'saturate(180%) blur(12px)',
        }}
      >
        <div className="mx-auto flex h-14 max-w-shell items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="महासंवाद — मुख्यपृष्ठ">
            <Image
              src="/mahasamvad-logo.png"
              alt="महासंवाद — माहिती व जनसंपर्क महासंचालनालय, महाराष्ट्र"
              width={292}
              height={100}
              priority
              className="hidden h-9 w-auto sm:block"
            />
            <Image
              src="/emblem.png"
              alt="महासंवाद"
              width={512}
              height={512}
              priority
              className="h-8 w-8 sm:hidden"
            />
            <span
              className="hidden border-l pl-2.5 text-[0.8125rem] font-semibold md:block"
              style={{ borderColor: 'var(--edge-strong)' }}
            >
              NewsSharing
            </span>
          </Link>

          <nav
            className="scroll-slim -mx-1 ml-auto flex min-w-0 items-center gap-0.5 overflow-x-auto px-1"
            aria-label="मुख्य नेव्हिगेशन"
          >
            {NAV.map(({ href, label, Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`)
              return (
                <Link
                  key={href}
                  href={href}
                  data-active={active}
                  aria-current={active ? 'page' : undefined}
                  className="nav-link"
                >
                  <Icon size={15} />
                  {label}
                </Link>
              )
            })}
          </nav>

          <TodayStamp />
        </div>
      </header>

      <main className="mx-auto w-full max-w-shell grow px-4 py-8 sm:px-6 sm:py-10">{children}</main>

      <footer className="mt-16 border-t" style={{ borderColor: 'var(--edge)' }}>
        <div
          className="mx-auto flex max-w-shell flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs sm:px-6"
          style={{ color: 'var(--faint)' }}
        >
          <span>महासंवाद · माहिती व जनसंपर्क महासंचालनालय, महाराष्ट्र शासन</span>
          <span>वृत्त संकलन, तपासणी, फोल्ड निर्मिती आणि वितरण</span>
        </div>
      </footer>
    </>
  )
}

/**
 * The date, in the form the fold itself carries. Rendered after mount rather
 * than on the server: the server's day and the reader's day are not always the
 * same one, and a masthead that hydrates into a different date is worse than a
 * masthead that arrives a frame late.
 */
function TodayStamp() {
  const [today, setToday] = useState<string | null>(null)
  useEffect(() => setToday(todayIso()), [])
  if (!today) return <div className="hidden w-[9.5rem] lg:block" />

  const [y, m, d] = today.split('-').map(Number)
  const weekday = WEEKDAYS_MR[new Date(y, m - 1, d).getDay()]

  return (
    <div
      className="hidden shrink-0 border-l pl-3 text-right leading-tight lg:block"
      style={{ borderColor: 'var(--edge)' }}
    >
      <div className="text-[0.75rem] font-semibold">{foldDateMr(today)}</div>
      <div className="text-[0.6875rem]" style={{ color: 'var(--faint)' }}>{weekday}</div>
    </div>
  )
}
