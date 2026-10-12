import Link from 'next/link'
import type { SpecialCoverage, VideoProgramme } from '@/data/news-editorial'
import { mediaFirst } from '@/lib/news/hubs'
import { mrDigits, type NewsItem } from '@/lib/news/public'
import { StoryPhoto } from '@/components/news/story-photo'
import { IPlay } from './icons'

/**
 * The cards on `/yojana` and `/video`: one per scheme or programme, each a
 * single link to its own page — a photograph on the left, the name and one
 * line of counts beside it. The figures, decisions and headlines live on the
 * scheme's or programme's page, not here. A card with nothing approved in it
 * yet says so rather than disappearing, because the page is where a reader
 * looks for it.
 */

const CARD =
  'flex h-full overflow-hidden rounded-[18px] bg-white shadow-[0_1px_0_#F0DCC8,0_20px_40px_-30px_rgba(120,30,30,0.4)] transition-shadow hover:shadow-[0_1px_0_#F0DCC8,0_24px_44px_-26px_rgba(120,30,30,0.5)] lg:rounded-[22px]'
const PHOTO = 'relative min-h-[128px] w-[36%] shrink-0 overflow-hidden sm:w-[200px] lg:min-h-[160px] lg:w-[240px]'
const BODY = 'flex min-w-0 grow flex-col gap-1 p-3.5 sm:gap-1.5 sm:p-5'
const META = 'm-0 text-[0.8125rem] text-nr-text2 lg:text-sm'
const MORE = 'mt-auto pt-1.5 text-sm font-extrabold text-nr-primary lg:text-[0.9375rem]'

export function SchemeCard({ coverage, rows }: { coverage: SpecialCoverage; rows: NewsItem[] }) {
  const cover = mediaFirst(rows)[0]
  return (
    <Link href={`/yojana/${coverage.anchor}`} className={CARD}>
      <div className={PHOTO}>
        <StoryPhoto src={cover?.img} video={cover?.video} size="md" fill className="nr-zoom" />
      </div>
      <div className={BODY}>
        <span className="text-xs font-extrabold text-nr-primary lg:text-[0.8125rem]">{coverage.kicker}</span>
        <h3 className="nr-h m-0 line-clamp-2 text-[1.0625rem] font-extrabold leading-[1.45] text-nr-text lg:text-xl">{coverage.title}</h3>
        <p className={META}>{rows.length ? `${mrDigits(rows.length)} बातम्या · नवी ${rows[0].dateLabel}` : 'बातम्या मंजूर झाल्यावर इथे दिसतील'}</p>
        <span className={MORE}>योजनेचे पान पहा →</span>
      </div>
    </Link>
  )
}

export function ProgrammeCard({ programme, episodes }: { programme: VideoProgramme; episodes: NewsItem[] }) {
  const cover = mediaFirst(episodes)[0]
  return (
    <Link href={`/video/${programme.slug}`} className={CARD}>
      <div className={`${PHOTO} bg-nr-night`}>
        <StoryPhoto src={cover?.img} video={cover?.video} size="md" fill className="nr-zoom" />
        <span aria-hidden className="absolute left-2.5 top-2.5 z-[2] grid h-10 w-10 place-items-center rounded-full bg-nr-accent text-nr-text lg:left-3 lg:top-3 lg:h-11 lg:w-11">
          <IPlay size={18} />
        </span>
      </div>
      <div className={BODY}>
        <span className="text-xs font-extrabold text-nr-primary lg:text-[0.8125rem]">कार्यक्रम</span>
        <h3 className="nr-h m-0 line-clamp-2 text-[1.1875rem] font-extrabold leading-[1.45] text-nr-text lg:text-[1.5rem]">{programme.name}</h3>
        <p className={META}>{episodes.length ? `${mrDigits(episodes.length)} भाग · नवा ${episodes[0].dateLabel}` : 'भाग मंजूर झाल्यावर इथे दिसतील'}</p>
        <span className={MORE}>सर्व भाग पहा →</span>
      </div>
    </Link>
  )
}

/** The dark band a hub page opens on: the trail, the title, a line under it,
 *  and room at its foot for the search card to sit over. */
export function HubHero({
  tone,
  eyebrow,
  title,
  lede,
  crumbs,
  children,
}: {
  tone: 'deep' | 'night'
  eyebrow: string
  title: string
  lede?: string
  crumbs: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <section id="top" className={`${tone === 'deep' ? 'bg-nr-deep' : 'bg-nr-night'} text-white`}>
      <div className="mx-auto flex w-full max-w-[1328px] flex-col gap-3 px-4 pb-16 pt-5 sm:px-6 lg:gap-4 lg:pb-24 lg:pt-9">
        {crumbs}
        <div className="text-[0.8125rem] font-extrabold text-nr-accent lg:text-sm">{eyebrow}</div>
        <h1 className="nr-h m-0 max-w-[900px] text-[1.875rem] font-extrabold leading-[1.4] lg:text-[3rem] lg:leading-[1.3]">{title}</h1>
        {lede && <p className="m-0 max-w-[760px] text-[0.9375rem] leading-[1.7] text-white/85 lg:text-lg">{lede}</p>}
        {children}
      </div>
    </section>
  )
}
