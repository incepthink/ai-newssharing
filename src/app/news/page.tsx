import Image from 'next/image'
import Link from 'next/link'
import { headers } from 'next/headers'
import type { ReactNode } from 'react'
import { foldArticles, listArticles } from '@/lib/db'
import { DISTRICTS, resolveDistrict } from '@/lib/districts'
import { DGIPR_MR } from '@/lib/dgipr/marathi'
import { buildNewsMap, loadCorpus, type Row } from '@/lib/dgipr/from-db'
import { buildMapGeometry } from '@/lib/map/geometry'
import { foldDateMr, todayIso, toDevanagariDigits } from '@/lib/marathi'
import { toFoldItem } from '@/lib/news/fold-item'
import { districtNameMr } from '@/lib/news/marathi'
import type { Language } from '@/lib/types'
import { FoldDownload } from '@/components/news/fold-download'
import { LeadCarousel, type LeadSlide } from '@/components/news/lead-carousel'
import { StoryPhoto } from '@/components/news/story-photo'
import {
  IconArrowRight,
  IconDownload,
  IconFacebookF,
  IconInstagram,
  IconMap,
  IconSearch,
  IconX,
  IconYouTube,
} from '@/components/ui'

/**
 * News — the public front door.
 *
 * Built to the DGIPR landing-page brief (28 Sep 2026) and to the "DGIPR News
 * Homepage" design — its desktop and phone artboards. Three colours carry
 * meaning and nothing else does: the house maroon for the thing to press and
 * the map band, saffron for featured content (the lead, InFocus), green for
 * places (district chips).
 *
 * ONE CORPUS. Every headline, count, photograph and shade here is a row in
 * `articles` with `status = 'approved'`, read through `loadCorpus` — the same
 * call `/map` makes — so a release approved at the desk appears in the lead,
 * the list, search and its district on the map at once, all pointing at the
 * same `/news/[id]`.
 *
 * PHOTOGRAPHS are the row's own `image_url`, credited from `image_credit`, and
 * nothing else: no stock picture ever stands in for one, because a picture on
 * a government release asserts a scene. A story without a photograph gets the
 * hatched plate. VIDEOS are the row's `video_url`, uploaded at the desk the
 * same way: a play mark on every thumbnail, and a player in the media corner.
 *
 * NOTHING INVENTED. InFocus carries a real release until an editorial pick
 * exists. Explainers, advisories and popularity need editorial inputs or
 * analytics this store does not hold yet. Their slots are designed and
 * present, but each says what it is waiting for instead of carrying filler. Social cards link only to
 * accounts confirmed with DGIPR (see `SOCIAL`).
 *
 * Search, filters and pagination are plain GET parameters handled here, so the
 * page works without JavaScript, every filtered view is a link that can be
 * saved or forwarded, and the reader's district and language survive every
 * link built by `buildHref`. The carousel and the fold download are the
 * client islands.
 *
 * TODAY'S FOLD sits under the navigation: the desk's approved releases for
 * the day, in the desk's order, downloadable as the one DOCX the desk itself
 * sends out — `foldArticles`, the same call `/fold` and its download use.
 */

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'बातम्या',
  description:
    'महाराष्ट्र शासनाच्या अधिकृत बातम्या — ताज्या, विषयानुसार आणि तुमच्या जिल्ह्यातील. माहिती व जनसंपर्क महासंचालनालयाची मंजूर प्रसिद्धीपत्रके.',
}

const PAGE_SIZE = 12
const LEAD_COUNT = 5
const STATEWIDE = 'statewide'
const LANG_MR: Record<Language, string> = { mr: 'मराठी', hi: 'हिंदी', en: 'English' }

/** The reader's navigation. The staff screens are not in it — they sit behind
 *  one "कर्मचारी प्रवेश" link in the utility strip. */
const PUBLIC_NAV = [
  { target: '#latest', label: 'मुख्य' },
  { target: '#releases', label: 'प्रसिद्धीपत्रके' },
  { target: '#districts', label: 'जिल्हे' },
  { target: '#topics', label: 'विषय' },
  { target: '#media', label: 'फोटो व व्हिडिओ' },
  { target: '#search', label: 'प्रगत शोध' },
  { target: '#archive', label: 'संग्रह' },
]

/**
 * DGIPR's social channels — the four official accounts confirmed by DGIPR.
 * No embeds: they need consent and fail quietly, so each card works as a
 * designed card plus an outbound link.
 *
 * Each tile wears its platform's own colour and mark — the one place on the
 * page outside the three-colour rule, because a reader looks for the logo they
 * already know, not for our palette.
 */
const SOCIAL: Array<{ id: string; name: string; glyph: ReactNode; tile: string; blurb: string; url: string }> = [
  { id: 'facebook', name: 'Facebook', glyph: <IconFacebookF size={22} />, tile: '#1877F2', blurb: 'बातम्या, कार्यक्रम आणि छायाचित्रे', url: 'https://www.facebook.com/MahaDGIPR' },
  { id: 'x', name: 'X', glyph: <IconX size={18} />, tile: '#000000', blurb: 'ताज्या घोषणा आणि थेट अपडेट्स', url: 'https://x.com/MahaDGIPR' },
  {
    id: 'instagram',
    name: 'Instagram',
    glyph: <IconInstagram size={22} />,
    tile: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285aeb 90%)',
    blurb: 'माहितीचित्रे आणि छायाचित्र मालिका',
    url: 'https://www.instagram.com/mahadgipr',
  },
  { id: 'youtube', name: 'YouTube', glyph: <IconYouTube size={22} />, tile: '#FF0000', blurb: 'पत्रकार परिषदा आणि व्हिडिओ', url: 'https://www.youtube.com/@MAHARASHTRADGIPR' },
]

type Query = Record<string, string | string[] | undefined>

type Filters = {
  q: string
  district: string
  dept: string
  lang: Language | ''
  from: string
  to: string
  cm: boolean
  page: number
}

type Meta = { language: Language; timed: boolean }

type Href = (patch: Partial<Filters>, hash?: string) => string

export default async function NewsPage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams
  const filters = parseFilters(query)
  const now = Date.now()
  const today = todayIso()

  /* `loadCorpus` is the source of truth. The second read only looks up two
     columns the release shape does not carry — language, and whether the row
     has a real approval time or only its fold date — keyed by the same ids, so
     it annotates the corpus rather than competing with it. */
  const [corpus, geometry, approved, origin, todayFold] = await Promise.all([
    loadCorpus(),
    buildMapGeometry(),
    listArticles({ status: 'approved' }),
    requestOrigin(),
    foldArticles(today),
  ])

  const meta = new Map<string, Meta>(
    approved.map((a) => [String(a.id), { language: a.language, timed: Boolean(a.approved_at) }]),
  )
  const metaOf = (row: Row): Meta => meta.get(row.release.id) ?? { language: 'mr', timed: false }
  const rows = corpus.rows

  const filtered = rows.filter((row) => matches(row, filters, metaOf(row)))
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(filters.page, pages)
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  /* No editor-picked lead exists in the schema yet. The carousel carries the
     newest releases that have a photograph or a video — topped up from the
     newest without if there are too few — and the list beside it is strictly
     newest first over everything else, so a release without a picture is never
     pushed off the top of the page, only out of the carousel. */
  const hasMedia = (row: Row) => Boolean(row.release.posterUrl || row.release.videoUrl)
  const pictured = rows.filter((row) => row.release.posterUrl)
  const leadRows = [...rows.filter(hasMedia), ...rows.filter((row) => !hasMedia(row))].slice(0, LEAD_COUNT)
  const leadIds = new Set(leadRows.map((row) => row.release.id))
  const latest = rows.filter((row) => !leadIds.has(row.release.id)).slice(0, 5)
  const shownAbove = new Set([...leadIds, ...latest.map((row) => row.release.id)])
  /* InFocus has no editorial pick in the schema yet, so it carries a real
     release the reader has not already passed: the newest CM / cabinet one
     with a photograph, else the newest pictured, else the newest of either. */
  const unseen = rows.filter((row) => !shownAbove.has(row.release.id))
  const focus =
    unseen.find((row) => row.release.featured && row.release.posterUrl) ??
    unseen.find((row) => row.release.posterUrl) ??
    unseen.find((row) => row.release.featured) ??
    unseen[0] ??
    rows[0]
  /* The gallery shows photographs the reader has not already passed above. */
  const gallery = pictured
    .filter((row) => !shownAbove.has(row.release.id) && row !== focus)
    .slice(0, 2)
  /* The media corner's video is simply the newest one — a player is worth
     showing even when the same release sits in the carousel above. */
  const video = rows.find((row) => row.release.videoUrl)

  const slides: LeadSlide[] = leadRows.map((row) => ({
    id: row.release.id,
    href: readHref(row),
    title: row.release.titleMr,
    summary: row.release.summary60Mr ?? null,
    kicker: row.release.featured
      ? 'मुख्यमंत्री व मंत्रिमंडळ'
      : row === rows[0]
        ? 'ताजे'
        : (deptLabel(row.release.departmentMr) ?? 'प्रसिद्धीपत्रक'),
    place: placeOf(row),
    when: whenOf(row, metaOf(row)),
    imageUrl: row.release.posterUrl,
    videoUrl: row.release.videoUrl ?? null,
  }))

  const cmRows = rows.filter((row) => row.release.featured)
  const departments = tally(rows.map((row) => row.release.departmentMr).filter(Boolean) as string[])
  const months = tally(rows.map((row) => row.release.date.slice(0, 7))).sort((a, b) => b.key.localeCompare(a.key))
  const englishCount = rows.filter((row) => metaOf(row).language === 'en').length

  /* The map band reads a week and says so. `buildNewsMap` widens only when
     fewer than three districts filed, and the note under the heading says
     when it did. */
  const map = buildNewsMap(corpus, '7d', null, now)
  const activeDistricts = Object.values(map.districts).sort((a, b) => b.count - a.count)
  const focusDistrict =
    filters.district && filters.district !== STATEWIDE ? filters.district : activeDistricts[0]?.districtId ?? null
  const focusRows = focusDistrict ? rows.filter((row) => row.release.districtId === focusDistrict).slice(0, 3) : []
  const ceiling = Math.max(1, map.ceiling)

  const href: Href = (patch, hash = '') => buildHref(filters, patch, hash)

  return (
    <div className="relative isolate -mt-8 flex flex-col gap-7 sm:-mt-10 lg:gap-14">
      {/* The ground: the lattice behind the whole page, the full width of the
          window. It is decoration only, so a reader who asks for less
          transparency gets the plain paper. */}
      <div
        aria-hidden
        className="news-pattern pointer-events-none absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2 bg-[#f7f5f1]"
      />
      <a
        href="#releases"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2 focus:shadow-md"
      >
        मुख्य मजकुराकडे जा
      </a>

      {/* 1 ─ Utility strip + public masthead ------------------------------ */}
      <div className="flex flex-col gap-5 lg:gap-7">
        <div className="glass-band flex h-12 items-center justify-between gap-4 text-[0.8125rem] before:border-b before:border-white/70">
          <div className="flex min-w-0 items-center gap-2.5">
            <Image src="/emblem.png" alt="" width={512} height={512} className="h-7 w-7 shrink-0" />
            <span className="font-bold">महासंवाद</span>
            <span className="hidden truncate text-secondary md:inline">माहिती व जनसंपर्क महासंचालनालय, महाराष्ट्र शासन</span>
          </div>

          <nav aria-label="भाषा, सुलभता व कर्मचारी" className="flex shrink-0 items-center gap-1.5">
            <Link
              href={href({ lang: '' })}
              aria-current={filters.lang === '' ? 'true' : undefined}
              className={`rounded-full px-2.5 py-1 ${filters.lang === '' ? 'bg-surface font-bold text-accent' : 'text-secondary hover:text-ink'}`}
            >
              मराठी
            </Link>
            {/* The switch leads to real English-language releases or says there
                are none — it never implies a translation that does not exist. */}
            {englishCount > 0 ? (
              <Link
                href={href({ lang: 'en' }, '#releases')}
                aria-current={filters.lang === 'en' ? 'true' : undefined}
                className={`rounded-full px-2.5 py-1 ${filters.lang === 'en' ? 'bg-surface font-bold text-accent' : 'text-secondary hover:text-ink'}`}
                lang="en"
              >
                <span className="sm:hidden">EN</span>
                <span className="hidden sm:inline">English releases ({englishCount})</span>
              </Link>
            ) : (
              <span className="hidden px-2.5 text-faint sm:inline" lang="en">
                English — not yet available
              </span>
            )}
            <span aria-hidden className="hidden text-[var(--edge-strong)] lg:inline">
              |
            </span>
            <a href="#help" className="hidden px-2.5 py-1 text-secondary hover:text-ink lg:inline">
              सुलभता व मदत
            </a>
            <Link href="/desk" className="hidden px-2.5 py-1 text-muted hover:text-ink lg:inline">
              कर्मचारी प्रवेश
            </Link>
          </nav>
        </div>

        <header className="flex flex-col gap-3.5 lg:gap-[18px]">
          <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_540px] lg:items-center lg:gap-8">
            <div>
              <h1 className="display text-[1.625rem] font-bold leading-[1.35] lg:text-[2.375rem] lg:leading-[1.3]">
                महाराष्ट्र शासनाच्या अधिकृत बातम्या
              </h1>
              <p className="mt-1.5 hidden text-base text-secondary sm:block">
                ताज्या, विषयानुसार आणि तुमच्या जिल्ह्यातील — वृत्त विभागाने मंजूर केलेली प्रसिद्धीपत्रके.
              </p>
            </div>

            <form
              action="/news#releases"
              method="get"
              role="search"
              className="glass flex gap-1.5 rounded-full p-1.5"
            >
              <label className="flex min-w-0 grow items-center gap-2 pl-3.5">
                <IconSearch size={18} className="hidden shrink-0 text-muted sm:block" />
                <span className="sr-only">बातम्या शोधा</span>
                <input
                  type="search"
                  name="q"
                  defaultValue={filters.q}
                  placeholder="शीर्षक, विषय किंवा वृत्त क्रमांक"
                  className="h-11 w-full min-w-0 border-0 bg-transparent text-[0.9375rem] outline-none"
                />
              </label>
              <label className="hidden w-40 shrink-0 sm:block">
                <span className="sr-only">जिल्हा</span>
                <DistrictSelect
                  value={filters.district}
                  className="h-11 w-full border-0 border-l border-edge bg-surface px-2.5 text-sm text-secondary outline-none"
                />
              </label>
              {filters.lang && <input type="hidden" name="lang" value={filters.lang} />}
              <button
                type="submit"
                className="h-11 shrink-0 rounded-full bg-accent px-[18px] text-[0.9375rem] font-bold text-white hover:bg-[var(--accent-hover)] sm:px-6"
              >
                शोधा
              </button>
            </form>
          </div>

          <nav
            aria-label="वाचकांसाठी नेव्हिगेशन"
            className="flex flex-wrap gap-1.5 lg:flex-nowrap lg:border-b lg:border-edge lg:pb-3.5"
          >
            {PUBLIC_NAV.map(({ target, label }, i) => (
              <a
                key={target}
                href={target}
                className={`rounded-full px-3.5 py-[9px] text-sm lg:px-4 ${
                  i === 0
                    ? 'bg-accent font-bold text-white hover:text-white'
                    : 'bg-surface font-semibold text-secondary hover:text-accent lg:bg-transparent'
                }`}
              >
                {label}
              </a>
            ))}
          </nav>

          <FoldDownload today={today} items={todayFold.map(toFoldItem)} />
        </header>
      </div>

      {/* 2 ─ Lead carousel + latest --------------------------------------- */}
      <section id="latest" aria-label="प्रमुख व ताज्या बातम्या" className="scroll-mt-24">
        {slides.length ? (
          <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)] lg:gap-6">
            <LeadCarousel slides={slides} />

            <aside aria-labelledby="latest-h" className="lg:glass lg:rounded-[20px] lg:p-[22px]">
              <div className="flex items-baseline justify-between">
                <h2 id="latest-h" className="text-lg font-bold lg:text-[1.0625rem]">
                  ताज्या बातम्या
                </h2>
                <span className="text-xs text-muted">नवीन प्रथम</span>
              </div>
              <ol className="mt-2.5 flex flex-col gap-1 lg:gap-0">
                {latest.map((row) => (
                  <li key={row.release.id} className="lg:border-b lg:border-sunk">
                    <Link
                      href={readHref(row)}
                      className="group grid grid-cols-[96px_minmax(0,1fr)] gap-3 rounded-2xl p-2.5 max-lg:glass max-lg:glass-sm lg:grid-cols-[72px_minmax(0,1fr)] lg:rounded-none lg:px-0 lg:py-[11px]"
                    >
                      <StoryPhoto
                        src={row.release.posterUrl}
                        video={row.release.videoUrl}
                        className="h-[72px] rounded-xl lg:h-[60px] lg:rounded-[10px]"
                      />
                      <span className="min-w-0">
                        <span className="block text-xs text-muted">
                          <b className="font-semibold text-place">{placeOf(row)}</b> · {shortWhen(row, metaOf(row))}
                        </span>
                        <span className="mt-0.5 line-clamp-3 text-sm font-semibold leading-normal group-hover:text-accent">
                          {row.release.titleMr}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
                {latest.length === 0 && <li className="py-3 text-sm text-muted">अद्याप इतर बातम्या नाहीत.</li>}
              </ol>
              <a
                href="#releases"
                className="mt-2 flex h-12 items-center justify-center gap-1.5 rounded-full bg-accent-soft text-sm font-bold text-accent lg:mt-3.5 lg:h-11"
              >
                सर्व बातम्या ({mr(rows.length)}) <IconArrowRight size={14} />
              </a>
            </aside>
          </div>
        ) : (
          <div className="glass rounded-[20px] p-8 text-center">
            <p className="display text-xl">अद्याप एकही प्रसिद्धीपत्रक मंजूर झालेले नाही.</p>
            <p className="mt-2 text-sm text-muted">वृत्त विभागाने मंजूर केलेली बातमी येथे लगेच दिसेल.</p>
          </div>
        )}
      </section>

      {/* 3 ─ InFocus + CM gateway ------------------------------------------ */}
      <section
        aria-label="विशेष लक्ष आणि मुख्यमंत्री व मंत्रिमंडळ"
        className="grid gap-7 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)] lg:gap-6"
      >
        {focus ? (
          <Link
            href={readHref(focus)}
            className="glass glass-saffron group grid gap-3 rounded-[20px] p-3.5 sm:grid-cols-[minmax(0,300px)_minmax(0,1fr)] sm:gap-6 sm:p-5"
          >
            <StoryPhoto
              src={focus.release.posterUrl}
              video={focus.release.videoUrl}
              size="md"
              className="min-h-[150px] rounded-[14px] sm:min-h-[220px]"
            />
            <div className="flex flex-col px-1 pb-1 sm:py-2 sm:pr-2">
              <p className="text-[0.8125rem] font-bold text-saffron-ink">
                विशेष लक्ष
                <span className="font-semibold text-secondary">
                  {' '}
                  · {focus.release.featured ? 'मुख्यमंत्री व मंत्रिमंडळ' : (deptLabel(focus.release.departmentMr) ?? placeOf(focus))}
                </span>
              </p>
              <h2 className="display mt-1 line-clamp-3 text-lg font-bold leading-[1.4] group-hover:text-accent sm:mt-1.5 sm:text-2xl">
                {focus.release.titleMr}
              </h2>
              {(focus.release.summary60Mr ?? focus.release.summaryMr) && (
                <p className="mt-2 line-clamp-3 text-sm leading-[1.7] text-secondary">
                  {focus.release.summary60Mr ?? focus.release.summaryMr}
                </p>
              )}
              <span className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted sm:mt-auto sm:pt-3">
                <span>
                  <b className="font-semibold text-place">{placeOf(focus)}</b> · {whenOf(focus, metaOf(focus))}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1.5 font-bold text-accent">
                  पूर्ण बातमी वाचा <IconArrowRight size={13} />
                </span>
              </span>
            </div>
          </Link>
        ) : (
          <div className="glass glass-saffron rounded-[20px] p-5 text-sm text-muted">
            <p className="text-[0.8125rem] font-bold text-saffron-ink">विशेष लक्ष</p>
            <p className="mt-1.5">मंजूर प्रसिद्धीपत्रक आल्यावर येथे दिसेल.</p>
          </div>
        )}

        <div className="glass rounded-[20px] p-[22px]">
          <h2 className="text-[1.0625rem] font-bold">मुख्यमंत्री व मंत्रिमंडळ</h2>
          <div className="mt-3 flex flex-col">
            <Link
              href={href({ cm: true }, '#releases')}
              className="flex items-center justify-between rounded-xl bg-accent-soft px-3.5 py-3 text-[0.9375rem] font-bold text-accent"
            >
              प्रसिद्धीपत्रके
              <span className="flex items-center gap-1">
                {mr(cmRows.length)} <IconArrowRight size={14} />
              </span>
            </Link>
            {['मंत्रिमंडळ निर्णय', 'भाषणे', 'फोटो', 'व्हिडिओ'].map((label, i, all) => (
              <div
                key={label}
                className={`flex items-center justify-between px-3.5 py-3 text-[0.9375rem] text-secondary ${i < all.length - 1 ? 'border-b border-sunk' : ''}`}
              >
                {label} <span className="text-xs text-muted">लवकरच</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4 ─ Latest press releases — the page's main utility --------------- */}
      <section id="releases" aria-labelledby="releases-h" className="flex scroll-mt-24 flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[0.8125rem] font-bold text-accent">प्रसिद्धीपत्रके</p>
            <h2 id="releases-h" className="display mt-0.5 text-[1.375rem] font-bold lg:text-[1.875rem]">
              सर्व मंजूर प्रसिद्धीपत्रके
            </h2>
            {isNarrowed(filters) && (
              <p className="mt-0.5 text-xs text-muted">
                {mr(rows.length)} पैकी {mr(filtered.length)} — निवडलेल्या निकषांनुसार
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 text-[0.8125rem]">
            <FilterPill href="/news#releases" on={!isNarrowed(filters)}>
              सर्व {mr(rows.length)}
            </FilterPill>
            {departments.slice(0, 2).map((d) => (
              <FilterPill key={d.key} href={href({ dept: d.key }, '#releases')} on={filters.dept === d.key}>
                {deptLabel(d.key)}
              </FilterPill>
            ))}
            <FilterPill href={href({ district: STATEWIDE }, '#releases')} on={filters.district === STATEWIDE}>
              {DGIPR_MR.statewide}
            </FilterPill>
          </div>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-4">
            <ActiveFilters filters={filters} href={href} />

            {shown.length === 0 ? (
              <div className="glass rounded-[20px] p-8 text-center">
                <p className="font-semibold">या निकषात एकही बातमी नाही</p>
                <p className="mt-1 text-sm text-muted">शोधशब्द बदलून पहा किंवा एखादा फिल्टर काढा.</p>
                <Link href="/news#releases" className="btn-ghost btn-sm mt-4">
                  सर्व फिल्टर काढा
                </Link>
              </div>
            ) : (
              <ol className="glass rounded-[20px] px-4 py-2 sm:px-6">
                {shown.map((row) => (
                  <ReleaseItem key={row.release.id} row={row} meta={metaOf(row)} origin={origin} />
                ))}
                {pages > 1 && (
                  <li className="flex items-center justify-between gap-3 pb-2.5 pt-4 text-sm">
                    <nav aria-label="पाने" className="contents">
                      {page > 1 ? (
                        <Link href={href({ page: page - 1 }, '#releases')} className="font-bold text-accent">
                          ← मागील
                        </Link>
                      ) : (
                        <span className="text-faint">← मागील</span>
                      )}
                      <span className="text-secondary">
                        पान {mr(page)} / {mr(pages)}
                      </span>
                      {page < pages ? (
                        <Link href={href({ page: page + 1 }, '#releases')} className="font-bold text-accent">
                          पुढील →
                        </Link>
                      ) : (
                        <span className="text-faint">पुढील →</span>
                      )}
                    </nav>
                  </li>
                )}
              </ol>
            )}
          </div>

          <aside className="flex flex-col gap-4" aria-label="प्रगत शोध व संग्रह">
            <form
              id="search"
              action="/news#releases"
              method="get"
              className="glass flex scroll-mt-24 flex-col gap-3 rounded-[20px] p-5"
            >
              <p className="text-base font-bold">प्रगत शोध</p>
              <AsideField label="शब्द किंवा वृत्त क्र.">
                <input type="search" name="q" defaultValue={filters.q} className="field h-[42px] rounded-[10px]" />
              </AsideField>
              <AsideField label="जिल्हा">
                <DistrictSelect value={filters.district} className="field h-[42px] rounded-[10px]" />
              </AsideField>
              <AsideField label="विभाग">
                <select name="dept" defaultValue={filters.dept} className="field h-[42px] rounded-[10px]">
                  <option value="">सर्व विभाग</option>
                  {departments.map((d) => (
                    <option key={d.key} value={d.key}>
                      {deptLabel(d.key)}
                    </option>
                  ))}
                </select>
              </AsideField>
              <AsideField label="भाषा">
                <select name="lang" defaultValue={filters.lang} className="field h-[42px] rounded-[10px]">
                  <option value="">सर्व भाषा</option>
                  {(Object.keys(LANG_MR) as Language[]).map((l) => (
                    <option key={l} value={l}>
                      {LANG_MR[l]}
                    </option>
                  ))}
                </select>
              </AsideField>
              <div className="grid grid-cols-2 gap-2">
                <AsideField label="पासून">
                  <input type="date" name="from" defaultValue={filters.from} className="field h-[42px] rounded-[10px] px-1.5 text-xs" />
                </AsideField>
                <AsideField label="पर्यंत">
                  <input type="date" name="to" defaultValue={filters.to} className="field h-[42px] rounded-[10px] px-1.5 text-xs" />
                </AsideField>
              </div>
              {filters.cm && <input type="hidden" name="cat" value="cm" />}
              <button type="submit" className="h-11 rounded-full bg-accent font-bold text-white hover:bg-[var(--accent-hover)]">
                शोधा
              </button>
            </form>

            <div id="archive" className="glass scroll-mt-24 rounded-[20px] p-5">
              <p className="text-base font-bold">तारखेनुसार संग्रह</p>
              <ul className="mt-2 flex flex-col gap-1">
                {months.slice(0, 8).map((m) => (
                  <li key={m.key}>
                    <Link
                      href={href({ from: `${m.key}-01`, to: `${m.key}-31` }, '#releases')}
                      className="flex justify-between rounded-[10px] bg-paper px-2.5 py-2 text-sm hover:text-accent"
                    >
                      <span>{monthMr(m.key)}</span>
                      <span className="num text-muted">{mr(m.count)}</span>
                    </Link>
                  </li>
                ))}
                {months.length === 0 && <li className="px-2 text-sm text-muted">संग्रह रिकामा आहे.</li>}
              </ul>
            </div>

            <div className="glass-quiet rounded-[20px] border border-dashed border-edge-strong p-5">
              <p className="text-base font-bold">लोकप्रिय बातम्या</p>
              <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-secondary">
                वाचक आकडेवारी जोडल्यानंतर, मोजणीच्या कालावधीसह — संपादकीय महत्त्वापासून वेगळी यादी.
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* 5 ─ Map feature — one band, not the frame ------------------------- */}
      <section
        id="districts"
        aria-labelledby="districts-h"
        className="glass glass-accent grid scroll-mt-24 gap-3.5 rounded-3xl p-[18px] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-8 lg:rounded-[28px] lg:p-8"
      >
        <figure className="m-0 flex flex-col gap-2.5">
          <p className="text-[0.8125rem] font-bold text-accent">जिल्ह्यानुसार बातम्या</p>
          <h2 id="districts-h" className="display -mt-2 text-[1.375rem] font-bold lg:text-[1.875rem]">
            महाराष्ट्राचा बातम्या नकाशा
          </h2>
          <p className="-mt-1 text-xs text-muted lg:text-[0.8125rem]">
            मागील {map.window.labelMr}
            {map.widened ? ' — कमी जिल्ह्यांतून बातम्या आल्याने कालावधी वाढवला' : ''}
          </p>
          {/* Each district is a real link, so the map works by keyboard and
              screen reader; the picker and list beside it do the same job
              for a phone. */}
          <svg
            viewBox={geometry.viewBox}
            className="mt-2 block h-auto max-h-[280px] w-full rounded-2xl bg-surface p-3 shadow-[inset_0_0_0_1px_var(--accent-edge)] lg:max-h-[460px] lg:p-5"
            role="group"
            aria-label={`महाराष्ट्राचे ३६ जिल्हे — मागील ${map.window.labelMr} मधील प्रसिद्धीपत्रकांनुसार छटा`}
          >
            {geometry.districts.map((shape) => {
              const count = map.districts[shape.id]?.count ?? 0
              const picked = shape.id === filters.district
              const label = `${shape.nameMr} — ${count ? `${mr(count)} प्रसिद्धीपत्रके` : 'या कालावधीत बातमी नाही'}`
              return (
                <a key={shape.id} href={href({ district: shape.id }, '#districts')} aria-label={label} className="group outline-none">
                  <title>{label}</title>
                  <path
                    d={shape.d}
                    fill={shade(count, ceiling)}
                    stroke={picked ? 'var(--ink)' : '#b8aba2'}
                    strokeWidth={picked ? 2.5 : 1}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    className="transition-[stroke] group-hover:stroke-[var(--ink)] group-focus-visible:stroke-[var(--ink)] group-focus-visible:[stroke-width:4]"
                  />
                </a>
              )
            })}
          </svg>
          <figcaption className="flex flex-wrap items-center justify-between gap-2 text-xs text-secondary">
            <span className="flex items-center gap-1.5">
              कमी
              {[0.2, 0.4, 0.6, 0.8, 1].map((t) => (
                <span
                  key={t}
                  aria-hidden
                  className="inline-block h-2.5 w-[22px] rounded-[3px]"
                  style={{ background: shade(t * ceiling, ceiling) }}
                />
              ))}
              जास्त
            </span>
            <Link href={href({ district: STATEWIDE }, '#releases')} className="hover:text-ink">
              {DGIPR_MR.statewide}: {mr(map.totals.statewide)} — नकाशावर छटा नाही
            </Link>
          </figcaption>
        </figure>

        <div className="flex flex-col gap-3.5 lg:gap-4">
          <form action="/news#districts" method="get" className="flex gap-1 rounded-full bg-surface p-[5px] lg:gap-2 lg:p-1.5">
            <label className="min-w-0 grow">
              <span className="sr-only">जिल्हा निवडा</span>
              <DistrictSelect
                value={filters.district}
                className="h-11 w-full border-0 bg-surface px-3 text-[0.9375rem] outline-none lg:px-3.5"
              />
            </label>
            {filters.lang && <input type="hidden" name="lang" value={filters.lang} />}
            <button type="submit" className="h-11 shrink-0 rounded-full bg-accent px-4 font-bold text-white lg:px-5">
              पहा
            </button>
          </form>

          {focusDistrict && (
            <div className="glass glass-sm rounded-2xl p-3.5 lg:rounded-[20px] lg:p-5">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-[1.0625rem] font-bold lg:text-xl">{districtNameMr(focusDistrict)}</h3>
                <span className="text-xs text-muted lg:text-[0.8125rem]">
                  {mr(map.districts[focusDistrict]?.count ?? 0)} प्रसिद्धीपत्रके · मागील {map.window.labelMr}
                </span>
              </div>
              <ul className="mt-3 flex flex-col gap-3">
                {focusRows.map((row) => (
                  <li key={row.release.id} className="grid grid-cols-[56px_minmax(0,1fr)] gap-3">
                    <StoryPhoto
                      src={row.release.posterUrl}
                      video={row.release.videoUrl}
                      className="h-12 rounded-[10px]"
                    />
                    <div>
                      <Link href={readHref(row)} className="line-clamp-2 text-sm font-semibold leading-normal hover:text-accent">
                        {row.release.titleMr}
                      </Link>
                      <div className="text-xs text-muted">{foldDateMr(row.release.date)}</div>
                    </div>
                  </li>
                ))}
                {focusRows.length === 0 && <li className="text-sm text-muted">या जिल्ह्यातून अद्याप प्रसिद्धीपत्रक नाही.</li>}
              </ul>
              <Link
                href={href({ district: focusDistrict }, '#releases')}
                className="mt-3.5 flex h-11 items-center justify-center gap-1.5 rounded-full bg-accent-soft px-4 text-sm font-bold text-accent lg:inline-flex lg:h-10"
              >
                जिल्ह्यातील सर्व बातम्या <IconArrowRight size={13} />
              </Link>
            </div>
          )}

          <div>
            <h3 className="sr-only">सर्वाधिक बातम्या असलेले जिल्हे</h3>
            <ul className="flex flex-wrap gap-1.5">
              {activeDistricts.slice(0, 10).map((d) => (
                <li key={d.districtId}>
                  <Link
                    href={href({ district: d.districtId }, '#districts')}
                    aria-current={d.districtId === filters.district ? 'true' : undefined}
                    className={`inline-block rounded-full px-3 py-1.5 text-[0.8125rem] ${
                      d.districtId === filters.district ? 'bg-accent text-white hover:text-white' : 'bg-surface'
                    }`}
                  >
                    {districtNameMr(d.districtId)}{' '}
                    <b className={d.districtId === filters.district ? '' : 'text-accent'}>{mr(d.count)}</b>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <Link
            href={focusDistrict ? `/map?district=${focusDistrict}` : '/map'}
            className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-accent px-[18px] text-sm font-bold text-white hover:text-white lg:self-start"
          >
            <IconMap size={15} /> पूर्ण नकाशा पहा
          </Link>
        </div>
      </section>

      {/* 6 ─ Explainers + topic collections -------------------------------- */}
      <section id="topics" aria-labelledby="topics-h" className="flex scroll-mt-24 flex-col gap-5">
        <div>
          <p className="text-[0.8125rem] font-bold text-accent">विषय</p>
          <h2 id="topics-h" className="display mt-0.5 text-[1.375rem] font-bold lg:text-[1.875rem]">
            समजून घ्या आणि विषयानुसार वाचा
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="glass glass-accent flex flex-col rounded-[20px] p-6 sm:col-span-2">
            <p className="text-[0.8125rem] font-bold text-accent">समजून घ्या</p>
            <p className="display mt-1.5 text-[1.375rem] font-bold leading-[1.4]">
              एक सार्वजनिक प्रश्न, सोप्या मराठीत उत्तर
            </p>
            <p className="mt-2 text-sm leading-[1.7] text-secondary">
              प्रत्येक स्पष्टीकरण एका प्रश्नाने सुरू होते — “ही योजना कोणासाठी?” — आणि पात्रता, अर्जाची पद्धत व संबंधित
              प्रसिद्धीपत्रके यांसह संपते.
            </p>
            <span className="mt-auto pt-3 text-xs text-muted">पहिले स्पष्टीकरण प्रकाशित झाल्यावर</span>
          </div>
          {departments.slice(0, 2).map((d, i) => (
            <Link
              key={d.key}
              href={href({ dept: d.key }, '#releases')}
              className="glass flex min-h-[170px] flex-col justify-between gap-4 rounded-[20px] p-[22px]"
            >
              <span
                className={`grid h-11 w-11 place-items-center rounded-xl ${i === 0 ? 'bg-saffron-soft text-saffron-ink' : 'bg-accent-soft text-accent'}`}
              >
                <IconBuilding />
              </span>
              <span>
                <b className="block text-[1.0625rem] leading-snug">{deptLabel(d.key)}</b>
                <span className="text-[0.8125rem] text-muted">{mr(d.count)} प्रसिद्धीपत्रके →</span>
              </span>
            </Link>
          ))}
          {departments.length === 0 && (
            <p className="text-sm text-muted sm:col-span-2">विभाग नमूद केलेली प्रसिद्धीपत्रके अद्याप नाहीत.</p>
          )}
        </div>
        {departments.length > 2 && (
          <div className="flex flex-wrap items-center gap-2 text-[0.8125rem]">
            <span className="text-muted">इतर विभाग:</span>
            {departments.slice(2, 10).map((d) => (
              <Link
                key={d.key}
                href={href({ dept: d.key }, '#releases')}
                className="rounded-full border border-edge bg-surface px-3 py-1.5 font-medium"
              >
                {deptLabel(d.key)} <span className="num text-muted">{mr(d.count)}</span>
              </Link>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 text-[0.8125rem] text-muted">
          संपादित विषय-संग्रह, वर्गीकरण सुरू झाल्यावर:
          {['योजना', 'आरोग्य', 'कृषी', 'पायाभूत सुविधा'].map((t) => (
            <span key={t} className="rounded-full border border-dashed border-edge-strong px-3 py-1.5">
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* 7 + 8 ─ Media corner and gallery ---------------------------------- */}
      <section id="media" aria-labelledby="media-h" className="flex scroll-mt-24 flex-col gap-5">
        <div>
          <p className="text-[0.8125rem] font-bold text-saffron-ink">माध्यमे</p>
          <h2 id="media-h" className="display mt-0.5 text-[1.375rem] font-bold lg:text-[1.875rem]">
            फोटो, व्हिडिओ आणि माध्यमांसाठी
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] lg:grid-rows-[190px_190px]">
          {gallery[0] ? (
            <GalleryTile row={gallery[0]} className="h-[260px] sm:col-span-2 lg:col-span-1 lg:row-span-2 lg:h-auto" large />
          ) : (
            <MediaWaiting label="छायाचित्रे" className="h-[190px] sm:col-span-2 lg:col-span-1 lg:row-span-2 lg:h-auto" />
          )}
          {gallery[1] ? (
            <GalleryTile row={gallery[1]} className="h-[190px]" />
          ) : (
            <MediaWaiting label="छायाचित्रे" className="h-[190px]" />
          )}
          {video ? (
            <VideoTile row={video} className="h-[190px]" />
          ) : (
            <MediaWaiting label="व्हिडिओ व माहितीचित्रे" className="h-[190px]" />
          )}

          <div className="glass glass-saffron flex flex-col rounded-[20px] p-[18px]">
            <p className="text-[0.8125rem] font-bold text-saffron-ink">माध्यम सूचना व निमंत्रणे</p>
            <p className="mt-2.5 text-sm font-semibold">सध्या कोणतीही आगामी सूचना नाही</p>
            <p className="mt-1 text-xs text-secondary">कार्यक्रमाची तारीख, वेळ आणि ठिकाण ठळकपणे दिसेल.</p>
            <span className="mt-auto pt-3 text-xs text-muted">होऊन गेलेले कार्यक्रम आपोआप संग्रहात</span>
          </div>

          <div className="glass rounded-[20px] p-[18px]">
            <p className="text-[0.9375rem] font-bold">पत्रकारांसाठी</p>
            <ul className="mt-2 flex flex-col gap-1.5 text-[0.8125rem]">
              <li className="flex gap-2">
                <IconDownload size={15} className="mt-0.5 shrink-0 text-accent" />
                प्रत्येक प्रसिद्धीपत्रकाची वर्ड (DOCX) प्रत — बातमीसोबतच्या दुव्यावर
              </li>
              <li>
                <a href="#search" className="underline underline-offset-2 hover:text-accent">
                  वृत्त क्रमांकाने शोधा
                </a>
              </li>
              <li>
                <a
                  href="https://dgipr.maharashtra.gov.in/about"
                  rel="noopener"
                  className="underline underline-offset-2 hover:text-accent"
                >
                  अधिस्वीकृती व माध्यम सुविधा
                </a>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 9 ─ Social engagements -------------------------------------------- */}
      <section aria-labelledby="social-h" className="flex flex-col gap-2.5 lg:gap-5">
        <div>
          <h2 id="social-h" className="display text-[1.375rem] font-bold lg:text-[1.875rem]">
            सोशल मीडियावर महासंवाद
          </h2>
          <p className="hidden text-[0.8125rem] text-muted sm:block">माहिती व जनसंपर्क महासंचालनालयाची अधिकृत खाती</p>
        </div>
        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {SOCIAL.map((s) => (
            <li key={s.id}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${s.name} वर महासंवाद`}
                className="glass flex h-full flex-col gap-3.5 rounded-[18px] p-3.5 transition hover:-translate-y-0.5 hover:shadow-lg lg:rounded-[20px] lg:p-5"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white ring-1 ring-inset ring-white/10"
                    style={{ background: s.tile }}
                  >
                    {s.glyph}
                  </span>
                  <div className="min-w-0 grow">
                    <p className="font-bold">{s.name}</p>
                    <p className="text-xs text-secondary">महासंवाद · DGIPR महाराष्ट्र</p>
                  </div>
                </div>
                <span className="hidden text-[0.8125rem] text-secondary lg:block">{s.blurb}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* 10 ─ Institutional footer ----------------------------------------- */}
      <footer id="help" aria-label="संस्थात्मक माहिती" className="glass-band mt-2 scroll-mt-24 py-6 before:border-t before:border-white/70 lg:mt-2 lg:py-10">
        <div className="grid gap-6 text-sm sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div>
            <p className="font-bold">जारी करणारे प्राधिकरण</p>
            <p className="mt-2 text-secondary">माहिती व जनसंपर्क महासंचालनालय, महाराष्ट्र शासन</p>
            <p className="mt-2 text-[0.8125rem] text-muted">
              प्रत्येक बातमी वृत्त विभागाने मंजूर केलेले प्रसिद्धीपत्रक आहे; छायाचित्रे श्रेयासह.
            </p>
          </div>
          <FooterList
            title="संग्रह व सदस्यता"
            items={[
              <a key="all" href="#releases">
                सर्व प्रसिद्धीपत्रके
              </a>,
              <a key="archive" href="#archive">
                तारखेनुसार संग्रह
              </a>,
              <Link key="map" href="/map">
                बातम्या नकाशा
              </Link>,
              'RSS / ईमेल सदस्यता — लवकरच',
            ]}
          />
          <FooterList
            title="शासकीय दुवे"
            items={[
              <a key="gom" href="https://www.maharashtra.gov.in" rel="noopener">
                महाराष्ट्र शासन
              </a>,
              <a key="dgipr" href="https://dgipr.maharashtra.gov.in/about" rel="noopener">
                माहिती व जनसंपर्क महासंचालनालय
              </a>,
              <a key="india" href="https://www.india.gov.in" rel="noopener">
                राष्ट्रीय पोर्टल
              </a>,
            ]}
          />
          <FooterList
            title="मदत व धोरणे"
            items={[
              'संपर्क · माहितीचा अधिकार · सुलभता · गोपनीयता — पाने तयार होत आहेत',
              'संपूर्ण पान कीबोर्डने वापरता येते; २००% झूमवर वाचनीय.',
            ]}
          />
          <p className="rounded-[14px] bg-surface px-4 py-3 text-[0.8125rem] text-secondary sm:col-span-2 lg:col-span-4">
            <b className="text-saffron-ink">स्थिती:</b> हे पान प्रस्ताव नमुना (pitch prototype) आहे; महासंचालनालयाने अधिकृत
            संकेतस्थळ म्हणून अद्याप स्वीकारलेले नाही.
            {corpus.approvedAt && <> · शेवटची मंजुरी: {stampMr(corpus.approvedAt)}</>}
          </p>
        </div>
      </footer>
    </div>
  )
}

/* ------------------------------------------------------------------ pieces */

function FilterPill({ href, on, children }: { href: string; on: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={on ? 'true' : undefined}
      className={`rounded-full px-3.5 py-[7px] font-semibold ${
        on ? 'bg-accent font-bold text-white hover:text-white' : 'border border-edge bg-surface hover:text-accent'
      }`}
    >
      {children}
    </Link>
  )
}

function AsideField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
      {label}
      {children}
    </label>
  )
}

function ReleaseItem({ row, meta, origin }: { row: Row; meta: Meta; origin: string }) {
  const r = row.release
  const share = `https://wa.me/?text=${encodeURIComponent(`${r.titleMr}\n${origin}${readHref(row)}`)}`
  return (
    <li className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-b border-sunk py-4 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-[22px] sm:py-5">
      <StoryPhoto
        src={r.posterUrl}
        video={r.videoUrl}
        size="md"
        className="h-[72px] rounded-xl sm:h-[134px] sm:rounded-[14px]"
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="rounded-full bg-place-soft px-2.5 py-0.5 font-semibold text-place">{placeOf(row)}</span>
          {r.departmentMr && <span className="font-semibold text-secondary">{deptLabel(r.departmentMr)}</span>}
          <Stamp row={row} timed={meta.timed} />
        </div>
        <h3 className="mt-2 text-[0.9375rem] font-bold leading-normal sm:text-lg">
          <Link href={readHref(row)} className="hover:text-accent">
            {r.titleMr}
          </Link>
        </h3>
        {r.summary60Mr && (
          <p className="mt-1 hidden text-sm leading-[1.7] text-secondary sm:line-clamp-2">{r.summary60Mr}</p>
        )}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-2 text-xs text-muted">
          {r.releaseNo && (
            <span>
              {DGIPR_MR.releaseNo} <b className="font-semibold text-ink">{mr(r.releaseNo)}</b>
            </span>
          )}
          <span>{LANG_MR[meta.language]}</span>
          <span className="flex flex-wrap gap-1 text-[0.8125rem] sm:ml-auto">
            <Link href={readHref(row)} className="rounded-full bg-accent-soft px-3 py-[7px] font-bold text-accent">
              वाचा
            </Link>
            {r.docxUrl && (
              <a href={r.docxUrl} className="rounded-full px-3 py-[7px] font-semibold text-secondary hover:bg-sunk">
                DOCX
              </a>
            )}
            <a
              href={share}
              rel="noopener"
              target="_blank"
              className="rounded-full px-3 py-[7px] font-semibold text-secondary hover:bg-sunk"
            >
              शेअर
            </a>
            <Link
              href={r.districtId ? `/map?district=${r.districtId}` : '/map'}
              className="hidden rounded-full px-3 py-[7px] font-semibold text-secondary hover:bg-sunk sm:inline"
            >
              नकाशावर
            </Link>
          </span>
        </div>
      </div>
    </li>
  )
}

/** A published photograph from a release, captioned with its date and
 *  linking to the release it came with. */
function GalleryTile({ row, large, className }: { row: Row; large?: boolean; className: string }) {
  const r = row.release
  return (
    <Link href={readHref(row)} className={`group relative block overflow-hidden rounded-[20px] ${className}`}>
      <StoryPhoto src={r.posterUrl} video={r.videoUrl} size="md" fill />
      <span
        className={`absolute bottom-3 left-3 right-3 rounded-xl px-3 py-2 ${large ? 'lg:bottom-4 lg:left-4 lg:right-4 lg:rounded-[14px] lg:px-3.5 lg:py-3' : ''}`}
        style={{ background: 'rgb(255 255 255 / 0.92)' }}
      >
        <span className="block text-xs text-muted">
          छायाचित्र · {foldDateMr(r.date)}
        </span>
        <span
          className={`line-clamp-2 font-bold leading-snug group-hover:text-accent ${large ? 'text-[0.9375rem]' : 'text-[0.8125rem]'}`}
        >
          {r.titleMr}
        </span>
      </span>
    </Link>
  )
}

/** A release's video, playable where it sits, with a line back to the release. */
function VideoTile({ row, className }: { row: Row; className: string }) {
  const r = row.release
  return (
    <div className={`relative overflow-hidden rounded-[20px] bg-black ${className}`}>
      <video
        src={r.videoUrl!}
        poster={r.posterUrl ?? undefined}
        controls
        playsInline
        preload="metadata"
        aria-label={r.titleMr}
        className="absolute inset-0 h-full w-full object-contain"
      />
      <Link
        href={readHref(row)}
        className="absolute left-3 right-3 top-3 rounded-xl px-3 py-2 hover:text-accent"
        style={{ background: 'rgb(255 255 255 / 0.92)' }}
      >
        <span className="block text-xs text-muted">व्हिडिओ · {foldDateMr(r.date)}</span>
        <span className="line-clamp-1 text-[0.8125rem] font-bold leading-snug">{r.titleMr}</span>
      </Link>
    </div>
  )
}

function MediaWaiting({ label, className }: { label: string; className: string }) {
  return (
    <div className={`photo-plate relative rounded-[20px] ${className}`}>
      <span
        className="absolute bottom-3 left-3 right-3 rounded-xl px-3 py-2 text-[0.8125rem]"
        style={{ background: 'rgb(255 255 255 / 0.92)' }}
      >
        <b className="text-ink">{label}</b> · अद्याप प्रकाशित नाही
      </span>
    </div>
  )
}

function IconBuilding() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 21h18" />
      <path d="M5 21V10h14v11" />
      <path d="M12 3 4 8h16Z" />
      <path d="M9 21v-7M15 21v-7" />
    </svg>
  )
}

/** Date and time where the desk recorded an approval time; the fold date alone
 *  where it did not, rather than printing an invented hour. */
function Stamp({ row, timed }: { row: Row; timed: boolean }) {
  return (
    <time dateTime={timed ? row.article.publishedAt : row.release.date} className="text-muted">
      · {timed ? stampMr(row.article.publishedAt) : foldDateMr(row.release.date)}
    </time>
  )
}

function DistrictSelect({ value, className }: { value: string; className: string }) {
  return (
    <select name="district" defaultValue={value} className={className}>
      <option value="">सर्व जिल्हे</option>
      <option value={STATEWIDE}>{DGIPR_MR.statewide}</option>
      {[...DISTRICTS]
        .sort((a, b) => a.mr.localeCompare(b.mr, 'mr'))
        .map((d) => (
          <option key={d.key} value={d.key}>
            {d.mr}
          </option>
        ))}
    </select>
  )
}

function ActiveFilters({ filters, href }: { filters: Filters; href: Href }) {
  const chips: Array<[string, Partial<Filters>]> = []
  if (filters.q) chips.push([`“${filters.q}”`, { q: '' }])
  if (filters.district) {
    chips.push([
      filters.district === STATEWIDE ? DGIPR_MR.statewide : districtNameMr(filters.district),
      { district: '' },
    ])
  }
  if (filters.dept) chips.push([deptLabel(filters.dept) ?? filters.dept, { dept: '' }])
  if (filters.lang) chips.push([LANG_MR[filters.lang], { lang: '' }])
  if (filters.cm) chips.push(['मुख्यमंत्री व मंत्रिमंडळ', { cm: false }])
  if (filters.from || filters.to) chips.push([`${filters.from || '…'} ते ${filters.to || '…'}`, { from: '', to: '' }])
  if (!chips.length) return null

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted">निवडलेले:</span>
      {chips.map(([label, patch]) => (
        <Link key={label} href={href(patch, '#releases')} className="chip-filter" aria-label={`${label} — फिल्टर काढा`}>
          {label} <span aria-hidden>×</span>
        </Link>
      ))}
      <Link href="/news#releases" className="text-accent underline-offset-2 hover:underline">
        सर्व काढा
      </Link>
    </div>
  )
}

function FooterList({ title, items }: { title: string; items: ReactNode[] }) {
  return (
    <div>
      <p className="font-bold">{title}</p>
      <ul className="mt-2 flex flex-col gap-1.5 text-secondary [&_a:hover]:text-accent [&_a]:underline [&_a]:underline-offset-2">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

/* ------------------------------------------------------------------ helpers */

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? ''
}

function parseFilters(query: Query): Filters {
  const asked = one(query.district)
  const lang = one(query.lang)
  const date = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '')
  return {
    q: one(query.q).slice(0, 120),
    /* Resolved, never trusted: a district the corpus has never heard of would
       silently filter everything away and look like an outage. */
    district: asked === STATEWIDE ? STATEWIDE : (resolveDistrict(asked) ?? ''),
    dept: one(query.dept),
    lang: lang === 'mr' || lang === 'hi' || lang === 'en' ? lang : '',
    from: date(one(query.from)),
    to: date(one(query.to)),
    cm: one(query.cat) === 'cm',
    page: Math.max(1, Number.parseInt(one(query.page), 10) || 1),
  }
}

function isNarrowed(f: Filters): boolean {
  return Boolean(f.q || f.district || f.dept || f.lang || f.from || f.to || f.cm)
}

function matches(row: Row, f: Filters, meta: Meta): boolean {
  const r = row.release
  if (f.district === STATEWIDE && r.districtId) return false
  if (f.district && f.district !== STATEWIDE && r.districtId !== f.district) return false
  if (f.dept && r.departmentMr !== f.dept) return false
  if (f.lang && meta.language !== f.lang) return false
  if (f.cm && !r.featured) return false
  if (f.from && r.date < f.from) return false
  if (f.to && r.date > f.to) return false
  if (f.q) {
    const haystack = [r.titleMr, r.summaryMr, r.releaseNo, r.departmentMr, r.authorMr, r.datelineMr, r.attributionMr]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    if (!haystack.includes(f.q.toLowerCase())) return false
  }
  return true
}

/** Every link on the page is built here, so the reader's district and
 *  language survive it unless the link is the one changing them. Any change
 *  other than paging goes back to page one. */
function buildHref(current: Filters, patch: Partial<Filters>, hash: string): string {
  const next = { ...current, ...patch }
  if (!('page' in patch)) next.page = 1
  const params = new URLSearchParams()
  if (next.q) params.set('q', next.q)
  if (next.district) params.set('district', next.district)
  if (next.dept) params.set('dept', next.dept)
  if (next.lang) params.set('lang', next.lang)
  if (next.from) params.set('from', next.from)
  if (next.to) params.set('to', next.to)
  if (next.cm) params.set('cat', 'cm')
  if (next.page > 1) params.set('page', String(next.page))
  const qs = params.toString()
  return `/news${qs ? `?${qs}` : ''}${hash}`
}

function tally(values: string[]): Array<{ key: string; count: number }> {
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  return [...counts].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count)
}

function readHref(row: Row): string {
  return row.release.readerUrl ?? `/news/${row.release.id}`
}

function placeOf(row: Row): string {
  return row.release.districtId ? districtNameMr(row.release.districtId) : DGIPR_MR.statewide
}

/** `(गृह विभाग)` as the sheet prints it, without the sheet's brackets. */
function deptLabel(dept: string | null | undefined): string | null {
  return dept ? dept.replace(/^\s*\(\s*|\s*\)\s*$/g, '') : null
}

/** The lead's dateline: full stamp, and the release number that cites it. */
function whenOf(row: Row, meta: Meta): string {
  const day = meta.timed ? stampMr(row.article.publishedAt) : foldDateMr(row.release.date)
  return row.release.releaseNo ? `${day} · ${DGIPR_MR.releaseNo} ${mr(row.release.releaseNo)}` : day
}

/** `२२ सप्टें., १५:२५` for a timed row, `२२ सप्टें.` for a fold date — the
 *  headline list is narrow and the date is the second thing on the line. */
function shortWhen(row: Row, meta: Meta): string {
  const at = new Date(meta.timed ? row.article.publishedAt : `${row.release.date}T12:00:00Z`)
  if (Number.isNaN(at.getTime())) return foldDateMr(row.release.date)
  return new Intl.DateTimeFormat('mr-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    ...(meta.timed ? { hour: 'numeric', minute: '2-digit', hourCycle: 'h23' } : {}),
  }).format(at)
}

/** Five steps of the house maroon, relative to the week's busiest district. */
/* Opaque steps of the maroon, so the tinted glass behind the map cannot wash
   the districts out the way a translucent fill does. */
function shade(count: number, ceiling: number): string {
  if (count <= 0) return '#ece8e2'
  const step = Math.min(4, Math.floor((count / ceiling) * 4.999))
  return ['#f1d6cf', '#e0aa9d', '#c77866', '#a94d39', '#8c2f1f'][step]
}

function mr(n: number | string): string {
  return toDevanagariDigits(n)
}

/** `सप्टेंबर २०२६` from `2026-09`. */
function monthMr(key: string): string {
  return foldDateMr(`${key}-01`).replace(/^\S+\s/, '')
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

/** The site's own origin, for the absolute link a WhatsApp share needs. */
async function requestOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}
