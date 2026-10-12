import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { MAIN_NAV, SPECIAL_COVERAGE, VIDEO_PROGRAMMES } from '@/data/news-editorial'
import { schemeName } from '@/lib/news/hubs'
import type { Frame } from '@/lib/news/frame'
import { IconFacebookF, IconInstagram, IconTelegram, IconX, IconYouTube } from '@/components/ui'
import { IDownload, ISearch } from './icons'
import { MainNav, type MainNavItem, type MainNavLink } from './main-nav'
import { ChatButton, FoldButton, ReleaseSearchLink } from './triggers'
import { NewsUiProvider } from './ui'

/**
 * The frame every public news page shares — `/news`, `/yojana`, `/video` and
 * the scheme and programme pages under them: the sticky masthead with its
 * search, the fold and the section pills, the footer, the assistant's button,
 * and the client islands (`NewsUiProvider`) the headlines open into.
 */

/** The content column: 1280px, with a gutter that keeps it off the window's
 *  edge below that. */
export const WRAP = 'mx-auto w-full max-w-[1328px] px-4 sm:px-6'
/** Anchored sections clear the sticky masthead. */
export const ANCHOR = 'scroll-mt-[118px] lg:scroll-mt-[124px]'

/**
 * DGIPR's social channels — the four official accounts confirmed by DGIPR.
 * Each tile wears its platform's own colour and mark, the one place on the
 * page outside the palette, because a reader looks for the logo they know.
 */
export const SOCIAL = [
  { id: 'facebook', name: 'Facebook', handle: 'MahaDGIPR', glyph: <IconFacebookF size={20} />, tile: '#1877F2', url: 'https://www.facebook.com/MahaDGIPR' },
  { id: 'x', name: 'X', handle: '@MahaDGIPR', glyph: <IconX size={16} />, tile: '#000000', url: 'https://x.com/MahaDGIPR' },
  {
    id: 'instagram',
    name: 'Instagram', handle: '@mahadgipr',
    glyph: <IconInstagram size={20} />,
    tile: 'linear-gradient(45deg, #F58529, #DD2A7B 50%, #8134AF)',
    url: 'https://www.instagram.com/mahadgipr',
  },
  { id: 'youtube', name: 'YouTube', handle: '@MAHARASHTRADGIPR', glyph: <IconYouTube size={20} />, tile: '#FF0000', url: 'https://www.youtube.com/@MAHARASHTRADGIPR' },
] as const

export const YOUTUBE_URL = SOCIAL[3].url

/** The masthead's row of the same accounts, plus the Telegram channel, each
 *  on its platform's own colour. */
const NAV_SOCIAL = [
  ...SOCIAL.map((s) => ({
    name: s.name,
    url: s.url,
    tile: s.tile,
    glyph: s.id === 'x' ? <IconX size={13} /> : s.id === 'instagram' ? <IconInstagram size={16} /> : s.id === 'youtube' ? <IconYouTube size={16} /> : <IconFacebookF size={17} />,
  })),
  { name: 'Telegram', url: 'https://t.me/MahaDGIPR', tile: '#229ED9', glyph: <IconTelegram size={16} /> },
]

/** Under योजना and व्हिडिओ, the hub page first, then each scheme's or
 *  programme's own page. */
const NAV_MENUS: Record<string, MainNavLink[]> = {
  '#yojana': [
    { label: 'सर्व योजना', href: '/yojana' },
    ...SPECIAL_COVERAGE.map((c) => ({ label: schemeName(c), href: `/yojana/${c.anchor}` })),
  ],
  '#video': [
    { label: 'सर्व व्हिडिओ', href: '/video' },
    ...VIDEO_PROGRAMMES.map((p) => ({ label: p.name, href: `/video/${p.slug}` })),
  ],
}

const NAV_ITEMS: MainNavItem[] = MAIN_NAV.map((n) => (NAV_MENUS[n.href] ? { ...n, menu: NAV_MENUS[n.href] } : n))

export function NewsFrame({
  frame,
  current,
  search = { href: '#releases' },
  skipTo = '#releases',
  children,
}: {
  frame: Frame
  /** The nav item this page belongs to (`#yojana`, `#video`); unset on
   *  `/news`. */
  current?: string
  /** Where the masthead's "शोधा" goes, and the box it focuses. */
  search?: { href: string; targetId?: string }
  skipTo?: string
  children: ReactNode
}) {
  const { today, foldItems, recent, suggestions, origin, approvedAt } = frame
  return (
    <NewsUiProvider today={today} foldItems={foldItems} recent={recent} suggestions={suggestions} origin={origin}>
      <div className="nr flex min-h-screen flex-col">
        <a
          href={skipTo}
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg"
        >
          मुख्य मजकुराकडे जा
        </a>

        <header className="sticky top-0 z-30 border-b border-nr-line bg-[rgba(255,248,238,0.97)]">
          <div className={`${WRAP} flex h-[56px] items-center justify-between gap-2 lg:h-[64px] lg:gap-6`}>
            <a href={current ? '/news' : '#top'} aria-label="महासंवाद — मुखपृष्ठ" className="min-w-0 shrink-0">
              <Image src="/mahasamvad-logo.png" alt="महासंवाद" width={292} height={100} priority className="h-[36px] w-auto lg:h-[46px]" />
            </a>
            <div className="flex shrink-0 items-center gap-2.5">
              <ReleaseSearchLink
                href={search.href}
                targetId={search.targetId}
                className="flex h-11 items-center gap-2 rounded-full border-[1.5px] border-nr-primary bg-white px-[18px] text-[0.9375rem] font-bold text-nr-primary max-lg:hidden"
              >
                <ISearch size={18} strokeWidth={2.2} />
                शोधा
              </ReleaseSearchLink>
              <ReleaseSearchLink
                href={search.href}
                targetId={search.targetId}
                label="शोधा"
                className="grid h-11 w-11 place-items-center rounded-full border-[1.5px] border-nr-primary bg-white text-nr-primary lg:hidden"
              >
                <ISearch size={18} strokeWidth={2.2} />
              </ReleaseSearchLink>
              <FoldButton className="flex h-11 items-center gap-2.5 rounded-full bg-nr-primary pl-[18px] pr-1.5 text-[0.9375rem] font-bold text-white shadow-[0_10px_22px_-12px_var(--nr-primary)] max-lg:hidden">
                आजचा फोल्ड
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-nr-primary">
                  <IDownload size={16} strokeWidth={2.4} />
                </span>
              </FoldButton>
              <FoldButton label="आजचा फोल्ड डाउनलोड करा" className="grid h-11 w-11 place-items-center rounded-full bg-nr-primary text-white lg:hidden">
                <IDownload size={18} strokeWidth={2.2} />
              </FoldButton>
            </div>
          </div>
          <MainNav items={NAV_ITEMS} social={NAV_SOCIAL} current={current} />
        </header>

        {children}

        <footer id="footer" className="mt-8 bg-nr-deep text-white lg:mt-24">
          <div
            className={`${WRAP} grid gap-6 pb-24 pt-[26px] text-sm sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))] lg:gap-10 lg:pb-28 lg:pt-[52px] lg:text-[0.9375rem]`}
          >
            <div className="flex flex-col gap-3">
              <span className="self-start rounded-[18px] bg-white px-3.5 py-2.5">
                <Image src="/mahasamvad-logo.png" alt="महासंवाद" width={292} height={100} className="h-9 w-auto lg:h-[46px]" />
              </span>
              <p className="m-0 leading-[1.65] text-white/[0.84]">
                माहिती व जनसंपर्क महासंचालनालय, महाराष्ट्र शासन. इथली प्रत्येक बातमी वृत्त विभागाने मंजूर केलेले प्रसिद्धीपत्रक आहे.
              </p>
            </div>
            <FooterList title="बातम्या">
              <a href={current ? '/news#releases' : '#releases'}>वृत्त विशेष</a>
              <Link href="/yojana">योजना</Link>
              <Link href="/video">व्हिडिओ</Link>
              <Link href="/map">बातम्या नकाशा</Link>
            </FooterList>
            <FooterList title="शासकीय दुवे">
              <a href="https://www.maharashtra.gov.in" rel="noopener">
                महाराष्ट्र शासन
              </a>
              <a href="https://dgipr.maharashtra.gov.in/about" rel="noopener">
                माहिती व जनसंपर्क महासंचालनालय
              </a>
              <a href="https://aaplesarkar.mahaonline.gov.in" rel="noopener">
                आपले सरकार
              </a>
            </FooterList>
            <FooterList title="मदत व धोरणे">
              <span className="text-white/70">संपर्क · माहितीचा अधिकार · सुलभता · गोपनीयता — पाने तयार होत आहेत</span>
              <span className="text-white/70">संपूर्ण पान कीबोर्डने वापरता येते; २००% झूमवर वाचनीय.</span>
              <Link href="/desk">कर्मचारी प्रवेश</Link>
            </FooterList>
            <p className="m-0 border-t border-white/[0.18] pt-5 text-xs text-white/[0.78] sm:col-span-2 lg:col-span-4 lg:text-[0.8125rem]">
              स्थिती: हे पान प्रस्ताव नमुना (pitch prototype) आहे; महासंचालनालयाने अधिकृत संकेतस्थळ म्हणून अद्याप स्वीकारलेले नाही.
              {approvedAt && <> · शेवटची मंजुरी: {stampMr(approvedAt)}</>}
            </p>
          </div>
        </footer>

        <ChatButton />
      </div>
    </NewsUiProvider>
  )
}

export function SectionHead({ eyebrow, id, title, right }: { eyebrow: string; id: string; title: string; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-6 border-b border-nr-line pb-2 lg:pb-3.5">
      <div>
        <div className="text-[0.8125rem] font-extrabold text-nr-primary lg:text-sm">{eyebrow}</div>
        <h2 id={id} className="nr-h m-0 text-[1.75rem] font-extrabold lg:mt-0.5 lg:text-[2.5rem] lg:leading-[1.35]">
          {title}
        </h2>
      </div>
      {right}
    </div>
  )
}

/** मुख्यपृष्ठ › योजना › दुष्काळ २०२६ — the last crumb is this page. */
export function Crumbs({ trail, dark = false }: { trail: Array<{ label: string; href?: string }>; dark?: boolean }) {
  return (
    <nav aria-label="तुम्ही इथे आहात">
      <ol className={`m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0 text-[0.8125rem] font-semibold lg:text-sm ${dark ? 'text-white/75' : 'text-nr-text2'}`}>
        {trail.map((c, i) => (
          <li key={c.label} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden>›</span>}
            {c.href ? (
              <Link href={c.href} className={`hover:underline ${dark ? 'text-white' : 'text-nr-primary'}`}>
                {c.label}
              </Link>
            ) : (
              <span aria-current="page">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

function FooterList({ title, children }: { title: string; children: ReactNode }) {
  const list = Array.isArray(children) ? children : [children]
  return (
    <div>
      <div className="font-extrabold">{title}</div>
      <ul className="m-0 mt-2.5 flex list-none flex-col gap-2 p-0 [&_a:hover]:underline [&_a]:text-white">
        {list.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

/** `२२ सप्टेंबर, २०२६ रोजी १८:३०`, always in India time. */
function stampMr(iso: string): string {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return ''
  return new Intl.DateTimeFormat('mr-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(at)
}
