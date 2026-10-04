import Image from 'next/image'
import Link from 'next/link'
import { cookies, headers } from 'next/headers'
import type { ReactNode } from 'react'
import { FACT_CHECK_TEAM_LIVE, MAIN_NAV, SPECIAL_COVERAGE, SUBSCRIBE, TRENDING } from '@/data/news-editorial'
import { foldArticles } from '@/lib/db'
import { DISTRICTS, resolveDistrict } from '@/lib/districts'
import { DGIPR_MR } from '@/lib/dgipr/marathi'
import { buildNewsMap } from '@/lib/dgipr/from-db'
import { buildMapGeometry } from '@/lib/map/geometry'
import { foldDateMr, todayIso } from '@/lib/marathi'
import { toFoldItem } from '@/lib/news/fold-item'
import { deptLabel, loadNewsCorpus } from '@/lib/news/items'
import { districtNameMr } from '@/lib/news/marathi'
import { isTopic, mrDigits, searchItems, TOPICS, topicLabel, type NewsItem, type TopicId } from '@/lib/news/public'
import type { Language } from '@/lib/types'
import { StoryPhoto } from '@/components/news/story-photo'
import { FactCheck } from '@/components/news/redesign/fact-check'
import { HeroCarousel, type HeroSlide } from '@/components/news/redesign/hero'
import { MainNav } from '@/components/news/redesign/main-nav'
import { IDownload, IPlay, ISearch, IShare, ISitemap } from '@/components/news/redesign/icons'
import {
  BottomNav,
  ByNumberForm,
  CopyButton,
  DistrictPicker,
  FoldButton,
  LanguageSelect,
  ListenButton,
  ReadLink,
  SearchButton,
  SearchChip,
  TextSizeCycle,
} from '@/components/news/redesign/triggers'
import { NewsUiProvider, TextSizeGroup } from '@/components/news/redesign/ui'
import { IconFacebookF, IconInstagram, IconX, IconYouTube } from '@/components/ui'

/**
 * News — the public front door, to the "नवी रचना — प्रस्ताव" redesign
 * (`docs/design/news-redesign`): a cream ground, a crimson utility bar, the
 * Mahasamvad logo beside the emblem, a red-tinted full-bleed hero, and a floating pill
 * bar at the bottom.
 *
 * ONE CORPUS. Every headline, count, photograph and shade here is a row in
 * `articles` with `status = 'approved'`, read through `loadCorpus` — the same
 * call `/map` makes — so a release approved at the desk appears in the hero,
 * the list, search, the assistant, the fact check and its district at once,
 * all pointing at the same `/news/[id]`. Photographs are the row's own
 * `image_url`, credited from `image_credit`; a release without one gets the
 * hatched plate, never a stand-in.
 *
 * NOTHING INVENTED. What the table does not hold is either derived from the
 * text in the open (topics, विशेष लेख — see `lib/news/items.ts`), taken from
 * the editorial config with its source named (`data/news-editorial.ts`), or a
 * slot that says what it is waiting for. Social cards link only to accounts
 * confirmed with DGIPR, and their previews are labelled as samples.
 *
 * Filters, topic, district, search and pages are plain GET parameters handled
 * here, so the page works without JavaScript and every view is a link. The
 * hero, the reading panel, the search palette, the assistant, the fold dialog,
 * listening and copying are the client islands (`components/news/redesign`).
 */

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'बातम्या',
  description:
    'महाराष्ट्र शासनाच्या अधिकृत बातम्या — ताज्या, विषयानुसार आणि तुमच्या जिल्ह्यातील. माहिती व जनसंपर्क महासंचालनालयाची मंजूर प्रसिद्धीपत्रके.',
}

const PAGE_SIZE = 8
const LEAD_COUNT = 5
const STATEWIDE = 'statewide'
const LANG_MR: Record<Language, string> = { mr: 'मराठी', hi: 'हिंदी', en: 'English' }

/** The content column: 1280px, with a gutter that keeps it off the window's
 *  edge below that. */
const WRAP = 'mx-auto w-full max-w-[1328px] px-4 sm:px-6'
/** Anchored sections clear the sticky masthead. */
const ANCHOR = 'scroll-mt-[126px] lg:scroll-mt-[170px]'

/**
 * DGIPR's social channels — the four official accounts confirmed by DGIPR.
 * Each tile wears its platform's own colour and mark, the one place on the
 * page outside the palette, because a reader looks for the logo they know.
 */
const SOCIAL = [
  { id: 'facebook', name: 'Facebook', glyph: <IconFacebookF size={20} />, tile: '#1877F2', url: 'https://www.facebook.com/MahaDGIPR' },
  { id: 'x', name: 'X', glyph: <IconX size={16} />, tile: '#000000', url: 'https://x.com/MahaDGIPR' },
  {
    id: 'instagram',
    name: 'Instagram',
    glyph: <IconInstagram size={20} />,
    tile: 'linear-gradient(45deg, #F58529, #DD2A7B 50%, #8134AF)',
    url: 'https://www.instagram.com/mahadgipr',
  },
  { id: 'youtube', name: 'YouTube', glyph: <IconYouTube size={20} />, tile: '#FF0000', url: 'https://www.youtube.com/@MAHARASHTRADGIPR' },
] as const

type Query = Record<string, string | string[] | undefined>

type Filters = {
  q: string
  district: string
  dept: string
  lang: Language | ''
  from: string
  to: string
  cm: boolean
  topic: TopicId | ''
  page: number
  /** माझा जिल्हा — the district section's focus, separate from the list's
   *  district filter. */
  d: string
}

type Href = (patch: Partial<Filters>, hash?: string) => string

export default async function NewsPage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams
  const filters = parseFilters(query)
  const now = Date.now()
  const today = todayIso()

  const [{ corpus, items }, geometry, origin, todayFold, jar] = await Promise.all([
    loadNewsCorpus(),
    buildMapGeometry(),
    requestOrigin(),
    foldArticles(today),
    cookies(),
  ])

  const href: Href = (patch, hash = '') => buildHref(filters, patch, hash)

  /* --- the release list ------------------------------------------------- */
  const filtered = filterItems(items, filters)
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(filters.page, pages)
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const topicCounts = new Map<TopicId, number>()
  for (const i of items) if (i.topic) topicCounts.set(i.topic, (topicCounts.get(i.topic) ?? 0) + 1)
  const months = tally(items.map((i) => i.date.slice(0, 7))).sort((a, b) => b.key.localeCompare(a.key))

  /* --- the hero --------------------------------------------------------- */
  /* No editor-picked lead exists in the schema yet. The hero carries the
     newest releases with a photograph or a video, topped up from the newest
     without, and ताज्या बातम्या is strictly newest-first over the rest — so a
     release without a picture is only ever kept out of the hero. */
  const hasMedia = (i: NewsItem) => Boolean(i.img || i.video)
  const lead = [...items.filter(hasMedia), ...items.filter((i) => !hasMedia(i))].slice(0, LEAD_COUNT)
  const leadIds = new Set(lead.map((i) => i.id))
  const latest = items.filter((i) => !leadIds.has(i.id)).slice(0, 5)
  const slides: HeroSlide[] = lead.map((item) => ({ item, kicker: kickerOf(item), short: shortTitle(item.title) }))

  const trending = TRENDING.filter((t) => searchItems(items, t.query).length > 0)

  /* --- special coverage ------------------------------------------------- */
  const coverage = SPECIAL_COVERAGE
  const coverageRows = items.filter((i) => i.topic === coverage.topic)
  const coverageStories = [...coverageRows.filter(hasMedia), ...coverageRows.filter((i) => !hasMedia(i))].slice(0, 4)
  const decisions = coverage.decisions.filter((d) => searchItems(items, d.query).length > 0)
  const figureSources = [...new Set(coverage.figures.map((f) => f.source))].map((no) => ({
    no,
    item: items.find((i) => i.no === no) ?? null,
  }))

  /* --- districts -------------------------------------------------------- */
  /* The map reads a week and says so. `buildNewsMap` widens only when fewer
     than three districts filed, and the count line names the window it
     settled on. */
  const map = buildNewsMap(corpus, '7d', null, now)
  const active = Object.values(map.districts).sort((a, b) => b.count - a.count)
  const remembered = resolveDistrict(jar.get('nr_district')?.value ?? null)
  const focusD =
    filters.d || remembered || active[0]?.districtId || items.find((i) => i.districtId)?.districtId || DISTRICTS[0].key
  const focusItems = items.filter((i) => i.districtId === focusD).slice(0, 4)
  const focusCount = map.districts[focusD]?.count ?? 0
  const chips = active.slice(0, 10).map((d) => ({ key: d.districtId, count: d.count }))
  if (!chips.some((c) => c.key === focusD)) chips.unshift({ key: focusD, count: focusCount })
  const ceiling = Math.max(1, map.ceiling)
  const districtOptions = [...DISTRICTS]
    .sort((a, b) => a.mr.localeCompare(b.mr, 'mr'))
    .map((d) => ({ key: d.key, name: d.mr }))
  const baseQuery = queryOf(filters, { d: '' })

  /* --- the rest --------------------------------------------------------- */
  const features = items.filter((i) => i.feature).slice(0, 3)
  const episodes = items.filter((i) => /जय महाराष्ट्र|दिलखुलास/.test(i.title))
  const pictured = items.filter((i) => i.img)
  const ytItem = episodes[0] ?? items.find((i) => i.video) ?? null

  const languages = (['mr', 'en', 'hi'] as Language[]).map((l) => {
    const n = l === 'mr' ? 1 : items.filter((i) => i.language === l).length
    return {
      value: l === 'mr' ? '' : l,
      label: l === 'mr' ? LANG_MR.mr : n ? `${LANG_MR[l]} (${mrDigits(n)})` : `${LANG_MR[l]} — लवकरच`,
      href: href({ lang: l === 'mr' ? '' : l }, '#releases'),
      disabled: !n,
    }
  })

  /* The fact check's two samples: a forwarded copy of a real approved
     release, and a message no release says. */
  const sampleSource = items.find((i) => i.cm && i.summary) ?? items[0]
  const factSamples = [
    ...(sampleSource
      ? [{ label: 'उदाहरण: फॉरवर्ड केलेली खरी बातमी', text: `*आनंदाची बातमी* ${sampleSource.title}. सर्वांना पाठवा!` }]
      : []),
    { label: 'उदाहरण: संशयास्पद संदेश', text: 'सर्व शेतकऱ्यांच्या खात्यात थेट ५०,००० रुपये जमा होणार — आजच लिंकवर नोंदणी करा!' },
  ]

  const feedStatus = filters.topic
    ? `“${topicLabel(filters.topic)}” — ${mrDigits(filtered.length)} प्रसिद्धीपत्रके`
    : isNarrowed(filters)
      ? `${mrDigits(items.length)} पैकी ${mrDigits(filtered.length)} — निवडलेल्या निकषांनुसार`
      : 'नवीन प्रथम · वृत्त विभागाने मंजूर केलेली'

  return (
    <NewsUiProvider
      today={today}
      foldItems={todayFold.map(toFoldItem)}
      recent={items.slice(0, 4)}
      suggestions={trending.slice(0, 5)}
      origin={origin}
    >
      <div className="nr flex min-h-screen flex-col pb-24 sm:pb-28">
        <a
          href="#releases"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg"
        >
          मुख्य मजकुराकडे जा
        </a>
        <h1 className="sr-only">महासंवाद — महाराष्ट्र शासनाच्या अधिकृत बातम्या</h1>

        {/* 1 ─ Utility strip ------------------------------------------- */}
        <div className="bg-nr-primary text-white">
          <div className={`${WRAP} flex h-11 items-center justify-between gap-2 text-[0.8125rem] lg:h-[46px] lg:text-sm`}>
            <span className="mr-auto truncate text-white/[0.92]">
              <span className="max-lg:hidden">महाराष्ट्र शासन · माहिती व जनसंपर्क महासंचालनालय · </span>शासनाच्या अधिकृत बातम्या
            </span>
            <div className="flex shrink-0 items-center gap-1.5">
              <SearchButton
                label="शोधा"
                className="grid h-[34px] w-9 place-items-center rounded-[18px] border border-white/[0.28] bg-white/[0.08] max-lg:hidden"
              >
                <ISearch size={16} strokeWidth={2.2} />
              </SearchButton>
              <TextSizeGroup tone="dark" className="max-lg:hidden" />
              <TextSizeCycle className="grid h-8 w-[34px] place-items-center rounded-[18px] border border-white/30 bg-white/[0.08] text-[0.9375rem] font-bold text-white lg:hidden" />
              <a
                href="#footer"
                aria-label="साइटमॅप"
                className="grid h-[34px] w-9 place-items-center rounded-[18px] border border-white/[0.28] bg-white/[0.08] text-white max-lg:hidden"
              >
                <ISitemap size={16} strokeWidth={2} />
              </a>
              <span aria-hidden className="mx-1.5 h-6 w-px bg-white/30 max-lg:hidden" />
              <LanguageSelect
                value={filters.lang}
                options={languages}
                className="h-8 rounded-[18px] border-0 bg-white px-2 text-[0.8125rem] font-bold text-nr-text lg:h-[34px] lg:px-2.5 lg:text-sm"
              />
            </div>
          </div>
        </div>

        {/* 2 ─ Masthead (sticky) --------------------------------------- */}
        <header className="sticky top-0 z-30 border-b border-nr-line bg-[rgba(255,248,238,0.97)]">
          <div className={`${WRAP} flex h-[68px] items-center justify-between gap-2 lg:h-[104px] lg:gap-6`}>
            <div className="flex min-w-0 items-center gap-3 lg:gap-4">
              <Image src="/emblem.png" alt="महाराष्ट्र शासन" width={512} height={512} className="h-[42px] w-[42px] shrink-0 object-contain lg:h-[66px] lg:w-[66px]" />
              <a href="#top" aria-label="महासंवाद — मुखपृष्ठ" className="shrink-0">
                <Image src="/mahasamvad-logo.png" alt="महासंवाद" width={292} height={100} priority className="h-[40px] w-auto lg:h-[66px]" />
              </a>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <DistrictPicker
                value={focusD}
                options={districtOptions}
                base={baseQuery}
                className="flex h-12 items-center gap-1.5 rounded-full border-[1.5px] border-nr-line2 bg-white pl-3.5 pr-1.5 max-lg:hidden"
                selectClassName="h-10 max-w-[12rem] border-0 bg-transparent text-[0.9375rem] font-bold text-nr-text"
              />
              <FoldButton className="flex h-12 items-center gap-2.5 rounded-full bg-nr-primary pl-[18px] pr-2 text-[0.9375rem] font-bold text-white shadow-[0_10px_22px_-12px_var(--nr-primary)] max-lg:hidden">
                आजचा फोल्ड
                <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-white text-nr-primary">
                  <IDownload size={16} strokeWidth={2.4} />
                </span>
              </FoldButton>
              <FoldButton label="आजचा फोल्ड डाउनलोड करा" className="grid h-11 w-11 place-items-center rounded-full bg-nr-primary text-white lg:hidden">
                <IDownload size={18} strokeWidth={2.2} />
              </FoldButton>
            </div>
          </div>
          <MainNav items={MAIN_NAV} />
        </header>

        {/* 3 ─ Hero carousel + ताज्या बातम्या -------------------------- */}
        {slides.length ? (
          <HeroCarousel
            slides={slides}
            aside={
              <aside
                aria-labelledby="latest-h"
                className="absolute bottom-12 right-[max(1.5rem,calc((100vw-1280px)/2))] top-12 hidden w-[400px] flex-col rounded-[22px] bg-[rgba(255,248,238,0.95)] px-[22px] pb-[18px] pt-[22px] shadow-[0_30px_60px_-24px_rgba(40,6,10,0.55)] xl:flex"
              >
                <LatestHead id="latest-h" />
                <ol className="m-0 mt-2.5 min-h-0 grow list-none overflow-hidden p-0">
                  {latest.map((l) => (
                    <li key={l.id} className="grid grid-cols-[76px_minmax(0,1fr)] gap-3 border-b border-nr-line py-2.5">
                      <ReadLink item={l} hidden className="block overflow-hidden rounded-xl bg-white">
                        <StoryPhoto src={l.img} video={l.video} className="h-[60px]" />
                      </ReadLink>
                      <div className="min-w-0">
                        <span className="text-xs text-nr-muted">
                          <b className="text-nr-place">{l.place}</b> · {l.time ?? l.dateLabel}
                        </span>
                        <ReadLink item={l} className="nr-link line-clamp-2 text-[0.90625rem] font-bold leading-normal text-nr-text">
                          {l.title}
                        </ReadLink>
                      </div>
                    </li>
                  ))}
                </ol>
                <a
                  href="#releases"
                  className="mt-3 flex h-11 shrink-0 items-center justify-center rounded-full bg-nr-primary text-[0.9375rem] font-extrabold text-white"
                >
                  सर्व प्रसिद्धीपत्रके →
                </a>
              </aside>
            }
          />
        ) : (
          <section id="top" className="bg-nr-deep px-4 py-20 text-center text-white">
            <p className="nr-h m-0 text-2xl font-bold">अद्याप एकही प्रसिद्धीपत्रक मंजूर झालेले नाही.</p>
            <p className="mt-2 text-white/80">वृत्त विभागाने मंजूर केलेली बातमी येथे लगेच दिसेल.</p>
          </section>
        )}

        {/* Phone: माझा जिल्हा sits under the hero. */}
        <div className="px-4 pt-4 sm:px-6 lg:hidden">
          <DistrictPicker
            value={focusD}
            options={districtOptions}
            base={baseQuery}
            className="flex h-[50px] items-center gap-2 rounded-full border-[1.5px] border-nr-line2 bg-white pl-3.5 pr-2"
            selectClassName="h-10 min-w-0 grow border-0 bg-transparent text-[0.9375rem] font-bold text-nr-text"
          />
        </div>

        {/* 4 ─ सध्या चर्चेत --------------------------------------------- */}
        {trending.length > 0 && (
          <div className="lg:border-b lg:border-nr-line lg:bg-white">
            <div className={`${WRAP} nr-scroll flex items-center gap-1.5 overflow-x-auto pt-3 text-sm lg:gap-2 lg:py-3.5`}>
              <b className="mr-1 shrink-0 text-[0.8125rem] text-nr-primary lg:text-sm">सध्या चर्चेत</b>
              {trending.map((t) => (
                <SearchChip
                  key={t.label}
                  query={t.query}
                  className="flex h-9 shrink-0 items-center whitespace-nowrap rounded-full border border-nr-line2 bg-white px-3 text-[0.84375rem] text-[#4A2E30] lg:bg-nr-ground lg:px-3.5 lg:text-sm"
                >
                  {t.label}
                </SearchChip>
              ))}
            </div>
          </div>
        )}

        {/* Below the widest screens, ताज्या बातम्या is a list under the hero. */}
        {latest.length > 0 && (
          <section aria-labelledby="latest-h-m" className={`${WRAP} pt-[18px] xl:hidden`}>
            <div className="flex items-baseline justify-between border-b border-nr-line pb-2">
              <LatestHead id="latest-h-m" />
            </div>
            <ol className="m-0 list-none p-0 sm:grid sm:grid-cols-2 sm:gap-x-8">
              {latest.map((l) => (
                <li key={l.id} className="grid grid-cols-[minmax(0,1fr)_96px] gap-3 border-b border-nr-line py-3">
                  <div className="flex flex-col gap-[3px]">
                    <span className="text-xs text-nr-muted">
                      <b className="text-nr-place">{l.place}</b> · {l.dateLabel}
                      {l.time ? `, ${l.time}` : ''}
                    </span>
                    <ReadLink item={l} className="nr-link line-clamp-3 font-marathi text-[0.90625rem] font-bold leading-[1.6] text-nr-text">
                      {l.title}
                    </ReadLink>
                  </div>
                  <ReadLink item={l} hidden className="block overflow-hidden rounded-xl bg-white">
                    <StoryPhoto src={l.img} video={l.video} className="h-[70px]" />
                  </ReadLink>
                </li>
              ))}
            </ol>
            <a
              href="#releases"
              className="mt-3 flex h-[46px] items-center justify-center rounded-full border-[1.5px] border-nr-primary text-[0.9375rem] font-extrabold text-nr-primary"
            >
              सर्व प्रसिद्धीपत्रके →
            </a>
          </section>
        )}

        {/* 5 ─ Special coverage: दुष्काळ २०२६ --------------------------- */}
        {coverageRows.length > 0 && (
          <section id={coverage.anchor} aria-labelledby="drought-h" className={`mt-8 bg-nr-deep text-white lg:mt-16 ${ANCHOR}`}>
            <div className={`${WRAP} flex flex-col gap-[18px] py-[30px] lg:gap-9 lg:py-14`}>
              <div className="grid gap-[18px] lg:grid-cols-[minmax(0,1fr)_640px] lg:items-end lg:gap-14">
                <div>
                  <div className="inline-flex rounded bg-nr-accent px-2.5 py-[3px] text-[0.78rem] font-extrabold text-nr-text lg:px-3 lg:py-1 lg:text-[0.8125rem]">
                    {coverage.kicker}
                  </div>
                  <h2 id="drought-h" className="nr-h m-0 mt-3 text-[1.75rem] font-extrabold leading-[1.45] lg:mt-3.5 lg:text-[2.875rem] lg:leading-[1.4]">
                    {coverage.title}
                  </h2>
                </div>
                <div>
                  <dl className="m-0 grid grid-cols-3 gap-2 lg:gap-3">
                    {coverage.figures.map((f) => (
                      <div key={f.label} className="flex flex-col-reverse rounded-[18px] bg-white/[0.08] px-2.5 py-3 lg:p-[18px]">
                        <dt className="mt-0.5 text-[0.78rem] leading-[1.45] text-white/90 lg:mt-1 lg:text-sm lg:leading-[1.55]">{f.label}</dt>
                        <dd className="nr-h m-0 text-[1.625rem] font-extrabold leading-[1.3] text-nr-accent lg:text-[2.5rem]">{f.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="m-0 mt-2 text-xs text-white/70">
                    आकडे:{' '}
                    {figureSources.map((s, k) => (
                      <span key={s.no}>
                        {k > 0 && ', '}
                        {s.item ? (
                          <ReadLink item={s.item} className="text-white/90 underline underline-offset-2">
                            वृत्त क्र. {s.no}
                          </ReadLink>
                        ) : (
                          <>वृत्त क्र. {s.no}</>
                        )}
                      </span>
                    ))}
                  </p>
                </div>
              </div>

              <div className="nr-scroll -mx-4 flex gap-3 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:px-0">
                {coverageStories.map((d) => (
                  <article key={d.id} className="flex w-60 shrink-0 flex-col gap-2 lg:w-auto lg:gap-2.5">
                    <ReadLink item={d} hidden className="block overflow-hidden rounded-[14px]">
                      <StoryPhoto src={d.img} video={d.video} size="md" className="nr-zoom h-[140px] lg:h-[170px]" />
                    </ReadLink>
                    <span className="text-xs font-bold text-nr-accent lg:text-[0.8125rem]">
                      {d.place} · {d.dateLabel}
                    </span>
                    <h3 className="m-0 font-marathi text-[0.9375rem] font-bold leading-[1.6] lg:text-base">
                      <ReadLink item={d} className="nr-link text-white">
                        {d.title}
                      </ReadLink>
                    </h3>
                  </article>
                ))}
              </div>

              <div className="flex flex-col gap-4 border-t border-white/[0.18] pt-6 lg:grid lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-6">
                {decisions.length > 0 && (
                  <>
                    <b className="text-[0.9375rem]">महत्त्वाचे निर्णय</b>
                    <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[0.9375rem] lg:flex-row lg:flex-wrap lg:gap-x-7">
                      {decisions.map((d) => (
                        <li key={d.label}>
                          <SearchChip query={d.query} className="nr-link text-white">
                            {d.label}
                          </SearchChip>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <Link
                  href={href({ topic: coverage.topic }, '#releases')}
                  className="flex h-12 items-center justify-center rounded-full bg-white px-5 text-[0.9375rem] font-extrabold text-nr-deep lg:col-start-3 lg:h-[46px]"
                >
                  {coverage.allLabel} →
                </Link>
              </div>
            </div>
          </section>
        )}

        <main id="main" className={`${WRAP} flex flex-col gap-9 pt-8 lg:gap-20 lg:pt-[72px]`}>
          {/* 6 ─ जिल्हा वार्ता ------------------------------------------ */}
          <section id="districts" aria-labelledby="dist-h" className={`grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-12 ${ANCHOR}`}>
            <div className="flex min-w-0 flex-col gap-3.5 lg:gap-5">
              <div className="flex flex-col border-b border-nr-line pb-2 lg:flex-row lg:items-end lg:justify-between lg:gap-5 lg:pb-3.5">
                <div>
                  <div className="text-[0.8125rem] font-extrabold text-nr-place lg:text-sm">जिल्हा वार्ता · माझा जिल्हा</div>
                  <h2 id="dist-h" className="nr-h m-0 text-[2rem] font-extrabold lg:mt-0.5 lg:text-[2.75rem] lg:leading-[1.35]">
                    {districtNameMr(focusD)}
                  </h2>
                </div>
                <span className="text-[0.84375rem] text-nr-text2 lg:text-[0.9375rem]">
                  {focusCount
                    ? `मागील ${map.window.labelMr} मध्ये ${mrDigits(focusCount)} प्रसिद्धीपत्रके`
                    : `मागील ${map.window.labelMr} मध्ये प्रसिद्धीपत्रक नाही`}
                </span>
              </div>

              <div role="group" aria-label="जिल्हा निवडा" className="nr-scroll -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:gap-2 lg:px-0">
                {chips.map((c) => {
                  const on = c.key === focusD
                  return (
                    <Link
                      key={c.key}
                      href={href({ d: c.key }, '#districts')}
                      aria-current={on ? 'true' : undefined}
                      className={`flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] px-3 text-sm font-semibold lg:px-3.5 lg:text-[0.9375rem] ${
                        on ? 'border-nr-primary bg-nr-primary text-white' : 'border-nr-line2 bg-white text-[#2A221D]'
                      }`}
                    >
                      {districtNameMr(c.key)} <b>{mrDigits(c.count)}</b>
                    </Link>
                  )
                })}
              </div>

              {focusItems.length ? (
                <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-x-7 lg:gap-y-6">
                  {focusItems.map((d) => (
                    <article
                      key={d.id}
                      className="grid grid-cols-[104px_minmax(0,1fr)] items-start gap-3 border-b border-nr-line py-3 lg:grid-cols-[150px_minmax(0,1fr)] lg:gap-4 lg:border-0 lg:py-0"
                    >
                      <ReadLink item={d} hidden className="block overflow-hidden rounded-[14px] bg-white">
                        <StoryPhoto src={d.img} video={d.video} className="nr-zoom h-[74px] lg:h-[100px]" />
                      </ReadLink>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-nr-muted lg:text-[0.8125rem]">
                          {d.dateLabel}
                          {d.time ? `, ${d.time}` : ''}
                        </span>
                        <h3 className="m-0 font-marathi text-[0.90625rem] font-bold leading-[1.6] lg:text-base">
                          <ReadLink item={d} className="nr-link text-nr-text">
                            {d.title}
                          </ReadLink>
                        </h3>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-[18px] border-[1.5px] border-dashed border-[#CFC4B4] p-4 text-[0.9375rem] leading-[1.6] text-nr-text2 lg:p-6 lg:text-base">
                  {districtNameMr(focusD)} जिल्ह्यातून अद्याप प्रसिद्धीपत्रक आलेले नाही. वरील यादीतून दुसरा जिल्हा निवडा.
                </div>
              )}
              {focusItems.length > 0 && (
                <Link href={href({ district: focusD }, '#releases')} className="self-start text-[0.9375rem] font-extrabold text-nr-primary">
                  {districtNameMr(focusD)} — सर्व प्रसिद्धीपत्रके →
                </Link>
              )}
            </div>

            <figure className="m-0 flex flex-col gap-3 rounded-[18px] bg-white p-[18px] shadow-[0_1px_0_#F0DCC8,0_20px_40px_-28px_rgba(120,30,30,0.35)] lg:p-[22px]">
              <div className="flex items-baseline justify-between gap-2">
                <b className="text-[1.0625rem]">महाराष्ट्राचा बातम्या नकाशा</b>
                <span className="text-[0.8125rem] text-nr-muted">
                  मागील {map.window.labelMr}
                  {map.widened ? ' (वाढवलेला)' : ''}
                </span>
              </div>
              {/* Each district is a real link, so the map works by keyboard and
                  screen reader; the chips beside it do the same job on a phone. */}
              <svg
                viewBox={geometry.viewBox}
                className="block h-auto max-h-[300px] w-full lg:max-h-[340px]"
                role="group"
                aria-label={`महाराष्ट्राचे ३६ जिल्हे — मागील ${map.window.labelMr} मधील प्रसिद्धीपत्रकांनुसार छटा`}
              >
                {geometry.districts.map((shape) => {
                  const count = map.districts[shape.id]?.count ?? 0
                  const picked = shape.id === focusD
                  const label = `${shape.nameMr} — ${count ? `${mrDigits(count)} प्रसिद्धीपत्रके` : 'या कालावधीत बातमी नाही'}`
                  return (
                    <a key={shape.id} href={href({ d: shape.id }, '#districts')} aria-label={label} className="group outline-none">
                      <title>{label}</title>
                      <path
                        d={shape.d}
                        fill={shade(count, ceiling)}
                        stroke={picked ? 'var(--nr-text)' : '#ffffff'}
                        strokeWidth={picked ? 2.5 : 0.8}
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                        className="transition-[stroke] group-hover:stroke-[var(--nr-text)] group-focus-visible:stroke-[var(--nr-accent)] group-focus-visible:[stroke-width:4]"
                      />
                    </a>
                  )
                })}
              </svg>
              <figcaption className="flex flex-wrap items-center justify-between gap-2 text-[0.8125rem] text-nr-text2">
                <span className="flex items-center gap-[5px]">
                  कमी
                  {[0.25, 0.5, 0.75, 1].map((t) => (
                    <span key={t} aria-hidden className="inline-block h-[9px] w-5 rounded-[2px]" style={{ background: shade(t * ceiling, ceiling) }} />
                  ))}
                  जास्त
                </span>
                <Link href={`/map?district=${focusD}`} className="font-extrabold text-nr-primary">
                  पूर्ण नकाशा →
                </Link>
              </figcaption>
            </figure>
          </section>

          {/* 7 ─ सर्व मंजूर प्रसिद्धीपत्रके -------------------------------- */}
          <section id="releases" aria-labelledby="rel-h" className={`flex flex-col gap-3 lg:gap-5 ${ANCHOR}`}>
            <SectionHead
              eyebrow="वृत्त विशेष"
              id="rel-h"
              title="सर्व मंजूर प्रसिद्धीपत्रके"
              right={<p className="m-0 text-[0.9375rem] text-nr-text2 max-lg:hidden">प्रत्येक बातमी माहिती व जनसंपर्क महासंचालनालयाने मंजूर केलेली</p>}
            />
            <div role="group" aria-label="विषयानुसार निवडा" className="nr-scroll -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:gap-2 lg:px-0">
              <TopicChip href={href({ topic: '' }, '#releases')} on={!filters.topic}>
                सर्व
              </TopicChip>
              {TOPICS.filter((t) => topicCounts.get(t.id)).map((t) => (
                <TopicChip key={t.id} href={href({ topic: t.id }, '#releases')} on={filters.topic === t.id}>
                  {t.label}
                </TopicChip>
              ))}
            </div>

            <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
              <div className="min-w-0">
                <p role="status" className="m-0 text-[0.8125rem] text-nr-text2 lg:text-sm">
                  {feedStatus}
                </p>
                <ActiveFilters filters={filters} href={href} />

                {shown.length === 0 ? (
                  <div className="mt-4 rounded-[18px] border-[1.5px] border-dashed border-[#CFC4B4] p-8 text-center">
                    <p className="m-0 font-semibold">या निकषात एकही बातमी नाही</p>
                    <p className="m-0 mt-1 text-sm text-nr-muted">शोधशब्द बदलून पहा किंवा एखादा फिल्टर काढा.</p>
                    <Link href="/news#releases" className="mt-4 inline-flex h-11 items-center rounded-full bg-nr-primary-soft px-5 font-bold text-nr-primary">
                      सर्व फिल्टर काढा
                    </Link>
                  </div>
                ) : (
                  <ol className="m-0 list-none p-0">
                    {shown.map((r) => (
                      <ReleaseRow key={r.id} item={r} origin={origin} />
                    ))}
                  </ol>
                )}

                {pages > 1 && (
                  <nav aria-label="पाने" className="flex items-center justify-between pt-5 text-[0.9375rem]">
                    {page > 1 ? (
                      <Link href={href({ page: page - 1 }, '#releases')} className="flex min-h-11 items-center font-extrabold text-nr-primary">
                        ← मागील पान
                      </Link>
                    ) : (
                      <span className="text-[#8F857B]">← मागील पान</span>
                    )}
                    <span className="text-[#4A2E30]">
                      पान {mrDigits(page)} / {mrDigits(pages)}
                    </span>
                    {page < pages ? (
                      <Link href={href({ page: page + 1 }, '#releases')} className="flex min-h-11 items-center font-extrabold text-nr-primary">
                        पुढील पान →
                      </Link>
                    ) : (
                      <span className="text-[#8F857B]">पुढील पान →</span>
                    )}
                  </nav>
                )}
              </div>

              <aside aria-label="पत्रकारांसाठी, सदस्यता व संग्रह" className="flex flex-col gap-5">
                <div className="flex flex-col gap-2.5 rounded-[18px] border-t-4 border-nr-accent bg-white p-[18px] shadow-[0_20px_40px_-30px_rgba(120,30,30,0.4)] lg:gap-3.5 lg:p-6">
                  <div className="text-[0.8125rem] font-extrabold text-nr-accent-ink lg:text-sm">पत्रकारांसाठी</div>
                  <h2 className="nr-h m-0 text-xl font-bold leading-normal lg:text-[1.375rem]">आजचा फोल्ड — एकाच DOCX मध्ये</h2>
                  <p className="m-0 text-[0.9375rem] leading-[1.65] text-nr-text2">
                    आज मंजूर झालेले <b className="text-nr-text">{mrDigits(todayFold.length)}</b> लेख, वृत्त विभागाच्या क्रमाने. हवे ते निवडा, क्रम बदला आणि
                    डाउनलोड करा.
                  </p>
                  <FoldButton className="flex h-12 items-center justify-center gap-2 rounded-full bg-nr-primary text-base font-bold text-white lg:h-[50px]">
                    <IDownload size={18} strokeWidth={2.2} /> फोल्ड उघडा
                  </FoldButton>
                  <ByNumberForm />
                </div>

                <div id="subscribe" className="flex flex-col gap-1 rounded-[18px] bg-white p-6 shadow-[0_20px_40px_-30px_rgba(120,30,30,0.4)]">
                  <h2 className="m-0 mb-1.5 text-lg font-extrabold">बातम्या थेट तुमच्याकडे</h2>
                  {SUBSCRIBE.map((s) => (
                    <div key={s.name} className="flex items-center justify-between gap-2 border-t border-[#F5E6D6] py-2.5">
                      <span>
                        <b className="block text-[0.9375rem]">{s.name}</b>
                        <span className="text-[0.8125rem] text-nr-muted">{s.blurb}</span>
                      </span>
                      {s.url ? (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-11 shrink-0 items-center rounded-full bg-nr-primary-soft px-3.5 text-sm font-bold text-nr-primary"
                        >
                          फॉलो करा
                        </a>
                      ) : (
                        <span className="shrink-0 rounded-full bg-[#F2ECE3] px-2.5 py-1 text-xs font-bold text-nr-text2">{s.status}</span>
                      )}
                    </div>
                  ))}
                </div>

                <div id="archive" className={`rounded-[18px] bg-white p-6 shadow-[0_20px_40px_-30px_rgba(120,30,30,0.4)] ${ANCHOR}`}>
                  <h2 className="m-0 text-lg font-extrabold">तारखेनुसार संग्रह</h2>
                  <div className="mt-2.5 flex flex-col gap-1.5">
                    {months.slice(0, 6).map((m) => (
                      <Link
                        key={m.key}
                        href={href({ from: `${m.key}-01`, to: `${m.key}-31` }, '#releases')}
                        className="flex min-h-11 items-center justify-between rounded-[18px] bg-nr-ground px-3.5 text-[0.9375rem] hover:bg-nr-peach"
                      >
                        <span>{monthMr(m.key)}</span>
                        <span className="text-nr-muted">{mrDigits(m.count)} →</span>
                      </Link>
                    ))}
                    {months.length === 0 && <p className="m-0 text-sm text-nr-muted">संग्रह रिकामा आहे.</p>}
                  </div>
                </div>
              </aside>
            </div>
          </section>

          {/* 8 ─ विशेष लेख ---------------------------------------------- */}
          <section id="features" aria-labelledby="feat-h" className={`flex flex-col gap-3.5 lg:gap-6 ${ANCHOR}`}>
            <SectionHead eyebrow="विशेष लेख" id="feat-h" title="सविस्तर वाचा" />
            {features.length ? (
              <div className="nr-scroll -mx-4 flex gap-3.5 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-8 lg:overflow-visible lg:px-0">
                {features.map((f) => (
                  <article key={f.id} className="flex w-[270px] shrink-0 flex-col gap-2 lg:w-auto lg:gap-3">
                    <ReadLink item={f} hidden className="block overflow-hidden rounded-[14px]">
                      <StoryPhoto src={f.img} video={f.video} size="md" className="nr-zoom h-40 lg:h-60" />
                    </ReadLink>
                    <span className="text-xs font-extrabold text-nr-primary lg:text-[0.8125rem]">विशेष लेख · {f.place}</span>
                    <h3 className="nr-h m-0 text-[1.0625rem] font-bold leading-[1.55] lg:text-[1.375rem]">
                      <ReadLink item={f} className="nr-link text-nr-text">
                        {f.title}
                      </ReadLink>
                    </h3>
                    {f.summary && <p className="m-0 line-clamp-3 text-base leading-[1.7] text-[#4A2E30] max-lg:hidden">{f.summary}</p>}
                    <span className="text-[0.8125rem] text-nr-muted">{f.dateLabel}</span>
                  </article>
                ))}
              </div>
            ) : (
              <p className="m-0 rounded-[18px] border-[1.5px] border-dashed border-[#CFC4B4] p-6 text-[0.9375rem] text-nr-text2">
                विशेष लेख मंजूर झाल्यावर इथे दिसतील.
              </p>
            )}
          </section>
        </main>

        {/* 9 ─ Media band: जय महाराष्ट्र · दिलखुलास · लोकराज्य ------------ */}
        <section id="media" aria-labelledby="media-h" className={`mt-9 bg-nr-night text-white lg:mt-20 ${ANCHOR}`}>
          <div className={`${WRAP} grid items-start gap-6 py-7 lg:grid-cols-[minmax(0,1fr)_340px_260px] lg:gap-10 lg:py-14`}>
            <div className="flex flex-col gap-3.5 lg:gap-4">
              <div>
                <div className="text-[0.8125rem] font-extrabold text-nr-accent lg:text-sm">जय महाराष्ट्र · दिलखुलास</div>
                <h2 id="media-h" className="nr-h m-0 text-[1.625rem] font-extrabold lg:mt-0.5 lg:text-4xl">
                  पाहा आणि ऐका
                </h2>
              </div>
              {episodes[0] ? (
                <>
                  <ReadLink item={episodes[0]} hidden className="relative block overflow-hidden rounded-[18px]">
                    <StoryPhoto src={episodes[0].img} video={episodes[0].video} size="lg" className="nr-zoom h-[200px] lg:h-[330px]" />
                    <span className="absolute inset-0 z-[2] bg-[linear-gradient(180deg,rgba(0,0,0,0)_45%,rgba(0,0,0,0.75)_100%)]" />
                    <span className="absolute left-3.5 top-3.5 z-[2] grid h-[52px] w-[52px] place-items-center rounded-full bg-nr-accent text-nr-text lg:left-6 lg:top-6 lg:h-16 lg:w-16">
                      <IPlay size={24} />
                    </span>
                  </ReadLink>
                  <ReadLink item={episodes[0]} className="nr-link font-marathi text-base font-bold leading-[1.6] text-white lg:text-[1.1875rem]">
                    {episodes[0].title}
                  </ReadLink>
                </>
              ) : (
                <div className="rounded-[18px] border-[1.5px] border-dashed border-white/30 p-6 text-[0.9375rem] text-white/80">
                  ‘जय महाराष्ट्र’ व ‘दिलखुलास’ चे भाग मंजूर झाल्यावर इथे दिसतील.
                </div>
              )}
            </div>

            <div className="flex flex-col">
              <h3 className="m-0 border-b border-white/20 pb-2.5 text-[0.9375rem] font-extrabold">मागील भाग</h3>
              {episodes.slice(1, 4).map((e) => (
                <ReadLink key={e.id} item={e} className="flex flex-col gap-1 border-b border-white/[0.14] py-3.5 text-white">
                  <span className="nr-link text-[0.9375rem] font-semibold leading-[1.55]">{e.title}</span>
                  <span className="text-[0.8125rem] text-white/70">{e.dateLabel}</span>
                </ReadLink>
              ))}
              {episodes.length < 2 && <p className="m-0 py-3.5 text-sm text-white/70">आधीचे भाग अद्याप मंजूर नाहीत.</p>}
              <a
                href={SOCIAL[3].url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3.5 flex min-h-11 items-center text-[0.9375rem] font-extrabold text-nr-accent"
              >
                सर्व भाग YouTube वर →
              </a>
            </div>

            {/* लोकराज्य: the issue's cover and link wait on DGIPR — a designed
                card that says so, not a link to an unconfirmed address. */}
            <div className="grid grid-cols-[74px_minmax(0,1fr)] items-center gap-3 rounded-[18px] bg-white/[0.08] p-3 lg:flex lg:flex-col lg:items-stretch lg:gap-3.5 lg:bg-transparent lg:p-0">
              <span
                aria-hidden
                className="flex h-24 flex-col justify-between rounded bg-nr-accent p-2 text-nr-text shadow-[0_30px_50px_-24px_rgba(0,0,0,0.7)] lg:h-[330px] lg:rounded-[14px] lg:p-[22px]"
              >
                <span className="nr-h text-sm font-extrabold leading-[1.3] lg:text-[2.75rem]">लोकराज्य</span>
                <span className="text-[0.625rem] font-bold lg:text-sm">[अंकाचे मुखपृष्ठ]</span>
              </span>
              <span>
                <b className="block text-[0.9375rem]">लोकराज्य मासिक</b>
                <span className="text-[0.8125rem] text-white/70">नव्या अंकाचा दुवा महासंचालनालयाकडून आल्यावर</span>
              </span>
            </div>
          </div>
        </section>

        <div className={`${WRAP} flex flex-col gap-8 pt-8 lg:gap-20 lg:pt-20`}>
          {/* 10 ─ फॅक्ट चेक -------------------------------------------- */}
          <section
            id="factcheck"
            aria-labelledby="fc-h"
            className={`grid items-start gap-8 rounded-[20px] border border-[#E7E0D5] bg-white p-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-12 lg:rounded-[28px] lg:p-11 ${ANCHOR}`}
          >
            <FactCheck samples={factSamples} teamLive={FACT_CHECK_TEAM_LIVE} />
            <div className="flex flex-col gap-3">
              <h3 className="m-0 text-[1.0625rem] font-bold lg:text-xl">अलीकडील फॅक्ट चेक</h3>
              <p className="m-0 text-sm text-[#4A403A]">व्हायरल दाव्यांची पडताळणी — महासंचालनालयाच्या फॅक्ट-चेक टीमकडून</p>
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="निष्कर्षांचे प्रकार">
                {[
                  ['खोटे', 'bg-[#8E2A1E] text-white'],
                  ['दिशाभूल करणारे', 'bg-[#F3C77A] text-[#1D1714]'],
                  ['खरे', 'bg-[#1F6B4A] text-white'],
                ].map(([label, tone]) => (
                  <li key={label} className={`rounded-full px-3 py-[3px] text-[0.8125rem] font-extrabold ${tone}`}>
                    {label}
                  </li>
                ))}
              </ul>
              <p className="m-0 rounded-2xl border-[1.5px] border-dashed border-[#CFC4B4] bg-[#F6F1EA] p-4 text-[0.9375rem] leading-[1.6] text-[#4A403A]">
                टीमचे निष्कर्ष — दावा, दिनांक आणि पडताळणीचा अधिकृत स्रोत —{' '}
                {FACT_CHECK_TEAM_LIVE ? 'प्रसिद्ध झाल्यावर इथे दिसतील.' : 'अधिकृत फॅक्ट-चेक कार्याच्या पुष्टीनंतर इथे प्रसिद्ध होतील.'}
              </p>
            </div>
          </section>

          {/* 11 ─ Social ------------------------------------------------- */}
          <section aria-labelledby="social-h" className="flex flex-col gap-3 lg:gap-6">
            <SectionHead
              eyebrow="सामाजिक माध्यमे"
              id="social-h"
              title="सोशल मीडियावर महासंवाद"
              right={<span className="text-sm text-nr-muted max-lg:hidden">पूर्वावलोकन नमुना · मंजूर प्रसिद्धीपत्रकांतून · अधिकृत खाती</span>}
            />
            <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 lg:grid-cols-4 lg:gap-5">
              {SOCIAL.map((s) => (
                <li key={s.id}>
                  <article className="flex h-full flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_1px_0_#F0DCC8,0_20px_40px_-30px_rgba(120,30,30,0.4)]">
                    <div className="h-1 max-lg:hidden" style={{ background: s.tile }} />
                    <div className="flex items-center gap-2.5 p-3 lg:gap-3 lg:px-[18px] lg:pb-3 lg:pt-4">
                      <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-[18px] text-white lg:h-10 lg:w-10" style={{ background: s.tile }}>
                        {s.glyph}
                      </span>
                      <span className="min-w-0 grow">
                        <b className="block text-[0.9375rem] lg:text-base">{s.name}</b>
                        <span className="text-xs text-nr-muted max-lg:hidden">महासंवाद · DGIPR महाराष्ट्र</span>
                      </span>
                    </div>
                    <div className="grow px-[18px] max-lg:hidden">
                      <SocialPreview id={s.id} pictured={pictured} latest={items} yt={ytItem} />
                    </div>
                    <div className="px-3 pb-3 lg:px-[18px] lg:pb-[18px] lg:pt-3.5">
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${s.name} वर महासंवाद फॉलो करा`}
                        className="flex h-11 items-center justify-center rounded-full border-[1.5px] border-nr-line2 text-sm font-bold"
                      >
                        <span className="max-lg:hidden">{s.name} वर&nbsp;</span>फॉलो करा
                      </a>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* 12 ─ Footer ----------------------------------------------------- */}
        <footer id="footer" className="mt-8 bg-nr-deep text-white lg:mt-24">
          <div
            className={`${WRAP} grid gap-6 pb-6 pt-[26px] text-sm sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))] lg:gap-10 lg:pb-9 lg:pt-[52px] lg:text-[0.9375rem]`}
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
              <a href="#releases">वृत्त विशेष</a>
              <a href="#districts">जिल्हा वार्ता</a>
              <a href="#features">विशेष लेख</a>
              <a href="#archive">संग्रह</a>
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
              {corpus.approvedAt && <> · शेवटची मंजुरी: {stampMr(corpus.approvedAt)}</>}
            </p>
          </div>
        </footer>

        {/* 13 ─ Floating bar + text size ------------------------------------ */}
        <BottomNav />
        <TextSizeCycle className="fixed bottom-[100px] right-7 z-[45] grid h-14 w-14 place-items-center rounded-full border border-nr-line bg-white text-2xl font-extrabold text-nr-primary shadow-[0_12px_28px_-12px_rgba(40,6,10,0.45)] max-lg:hidden" />
      </div>
    </NewsUiProvider>
  )
}

/* ------------------------------------------------------------------ pieces */

function LatestHead({ id }: { id: string }) {
  return (
    <div className="flex w-full items-center justify-between">
      <h2 id={id} className="nr-h m-0 flex items-center gap-2 text-[1.3125rem] font-extrabold leading-normal text-nr-text xl:text-xl">
        <span aria-hidden className="nr-live h-[9px] w-[9px] rounded-full bg-nr-primary" />
        ताज्या बातम्या
      </h2>
      <span className="text-[0.78rem] text-nr-muted">नवीन प्रथम</span>
    </div>
  )
}

function SectionHead({ eyebrow, id, title, right }: { eyebrow: string; id: string; title: string; right?: ReactNode }) {
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

function TopicChip({ href, on, children }: { href: string; on: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={on ? 'true' : undefined}
      className={`flex h-[42px] shrink-0 items-center whitespace-nowrap rounded-full border-[1.5px] px-3.5 text-[0.90625rem] font-semibold lg:px-[18px] lg:text-[0.9375rem] ${
        on ? 'border-nr-primary bg-nr-primary text-white' : 'border-[#DDD3C5] bg-white text-[#2A221D] hover:border-nr-primary'
      }`}
    >
      {children}
    </Link>
  )
}

const ACTION = 'inline-flex h-11 items-center gap-1.5 rounded-full border px-[13px] text-sm font-semibold text-[#2A221D]'

function ReleaseRow({ item: r, origin }: { item: NewsItem; origin: string }) {
  const share = `https://wa.me/?text=${encodeURIComponent(`${r.title}\n${origin}${r.href}\n— महासंवाद, माहिती व जनसंपर्क महासंचालनालय`)}`
  return (
    <li className="flex flex-col gap-2 border-b border-nr-line py-4 sm:grid sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-[26px] sm:py-6">
      <ReadLink item={r} hidden className="block overflow-hidden rounded-[14px] bg-white">
        <StoryPhoto src={r.img} video={r.video} size="md" className="nr-zoom h-[190px] sm:h-[146px]" />
      </ReadLink>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.78rem] lg:text-[0.8125rem]">
          <span className="rounded bg-nr-place-soft px-2 py-px font-bold text-nr-place lg:px-2.5 lg:py-0.5">{r.place}</span>
          <b className="font-extrabold text-nr-primary">{r.topicLabel}</b>
          <time dateTime={r.date} className="text-nr-muted">
            · {r.dateLabel}
            {r.time ? `, ${r.time}` : ''}
          </time>
        </div>
        <h3 className="m-0 font-marathi text-[1.3125rem] font-bold leading-[1.6] sm:text-2xl">
          <ReadLink item={r} className="nr-link text-nr-text">
            {r.title}
          </ReadLink>
        </h3>
        {r.summary && <p className="m-0 line-clamp-2 text-base leading-[1.7] text-[#4A2E30] max-sm:hidden">{r.summary}</p>}
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <ListenButton item={r} className={ACTION} />
          <CopyButton item={r} className={`${ACTION} border-nr-line2 bg-white`} />
          {r.docx && (
            <a href={r.docx} className={`${ACTION} border-nr-line2 bg-white max-sm:hidden`} aria-label={`DOCX — ${r.title}`}>
              <IDownload size={15} strokeWidth={2} /> DOCX
            </a>
          )}
          <a href={share} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp वर शेअर करा — ${r.title}`} className={`${ACTION} border-nr-line2 bg-white`}>
            <IShare size={15} /> शेअर
          </a>
          {r.no && (
            <span className="ml-auto text-[0.8125rem] text-nr-muted max-sm:hidden">
              वृत्त क्र. <b className="font-semibold text-nr-text">{r.no}</b>
            </span>
          )}
        </div>
      </div>
    </li>
  )
}

/** The cards' previews are this page's own approved releases, labelled as a
 *  sample — never presented as posts the accounts made. */
function SocialPreview({ id, pictured, latest, yt }: { id: string; pictured: NewsItem[]; latest: NewsItem[]; yt: NewsItem | null }) {
  if (id === 'facebook' && pictured[0]) {
    return (
      <>
        <StoryPhoto src={pictured[0].img} className="h-[150px] rounded-[14px]" />
        <p className="m-0 mt-2.5 line-clamp-2 text-sm leading-[1.6] text-[#4A2E30]">{pictured[0].title}</p>
        <span className="text-xs text-nr-muted">{pictured[0].dateLabel}</span>
      </>
    )
  }
  if (id === 'x' && latest.length) {
    return (
      <div className="flex flex-col gap-2">
        {latest.slice(0, 2).map((x) => (
          <div key={x.id} className="rounded-[18px] bg-nr-peach p-3.5 text-[0.9375rem] leading-[1.6]">
            <span className="line-clamp-3">{x.title}</span>
            <span className="mt-2 block text-xs text-nr-muted">
              {x.dateLabel}
              {x.time ? `, ${x.time}` : ''}
            </span>
          </div>
        ))}
      </div>
    )
  }
  if (id === 'instagram' && pictured.length >= 3) {
    return (
      <div className="grid grid-cols-3 gap-[3px] overflow-hidden rounded-[14px]">
        {pictured.slice(0, 6).map((x) => (
          <StoryPhoto key={x.id} src={x.img} className="aspect-square" />
        ))}
      </div>
    )
  }
  if (id === 'youtube' && yt) {
    return (
      <>
        <div className="relative">
          <StoryPhoto src={yt.img} video={yt.video} className="h-[150px] rounded-[14px]" />
          {!yt.video && (
            <span aria-hidden className="absolute left-1/2 top-1/2 z-[2] grid h-[34px] w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[18px] bg-[#FF0000] text-white">
              <IPlay size={16} />
            </span>
          )}
        </div>
        <p className="m-0 mt-2.5 line-clamp-2 text-sm leading-[1.6] text-[#4A2E30]">{yt.title}</p>
      </>
    )
  }
  return <p className="m-0 rounded-[14px] border border-dashed border-nr-line2 p-4 text-sm text-nr-muted">पूर्वावलोकन लवकरच</p>
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

function ActiveFilters({ filters, href }: { filters: Filters; href: Href }) {
  const chips: Array<[string, Partial<Filters>]> = []
  if (filters.q) chips.push([`“${filters.q}”`, { q: '' }])
  if (filters.district) {
    chips.push([filters.district === STATEWIDE ? DGIPR_MR.statewide : districtNameMr(filters.district), { district: '' }])
  }
  if (filters.dept) chips.push([deptLabel(filters.dept) ?? filters.dept, { dept: '' }])
  if (filters.lang) chips.push([LANG_MR[filters.lang], { lang: '' }])
  if (filters.cm) chips.push(['मुख्यमंत्री व मंत्रिमंडळ', { cm: false }])
  if (filters.from || filters.to) chips.push([`${filters.from || '…'} ते ${filters.to || '…'}`, { from: '', to: '' }])
  if (!chips.length) return null

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.8125rem]">
      <span className="text-nr-muted">निवडलेले:</span>
      {chips.map(([label, patch]) => (
        <Link
          key={label}
          href={href(patch, '#releases')}
          aria-label={`${label} — फिल्टर काढा`}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-nr-line2 bg-white px-3 font-semibold"
        >
          {label} <span aria-hidden>×</span>
        </Link>
      ))}
      <Link href={href({ q: '', district: '', dept: '', lang: '', from: '', to: '', cm: false, topic: '' }, '#releases')} className="font-bold text-nr-primary">
        सर्व काढा
      </Link>
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
  const topic = one(query.topic)
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
    topic: isTopic(topic) ? topic : '',
    page: Math.max(1, Number.parseInt(one(query.page), 10) || 1),
    d: resolveDistrict(one(query.d)) ?? '',
  }
}

function isNarrowed(f: Filters): boolean {
  return Boolean(f.q || f.district || f.dept || f.lang || f.from || f.to || f.cm || f.topic)
}

/** The list's filters. The words go through `searchItems`, the same matching
 *  the search palette uses, so the palette and the list cannot disagree. */
function filterItems(items: NewsItem[], f: Filters): NewsItem[] {
  const dept = deptLabel(f.dept)
  const base = items.filter((i) => {
    if (f.district === STATEWIDE && i.districtId) return false
    if (f.district && f.district !== STATEWIDE && i.districtId !== f.district) return false
    if (dept && i.dept !== dept) return false
    if (f.lang && i.language !== f.lang) return false
    if (f.cm && !i.cm) return false
    if (f.topic && i.topic !== f.topic) return false
    if (f.from && i.date < f.from) return false
    if (f.to && i.date > f.to) return false
    return true
  })
  return f.q ? searchItems(base, f.q) : base
}

/** Every link on the page is built here, so the reader's filters, district
 *  and language survive it unless the link is the one changing them. Any
 *  change other than paging goes back to page one. */
function buildHref(current: Filters, patch: Partial<Filters>, hash: string): string {
  const qs = queryOf(current, patch)
  return `/news${qs ? `?${qs}` : ''}${hash}`
}

function queryOf(current: Filters, patch: Partial<Filters>): string {
  const next = { ...current, ...patch }
  if (!('page' in patch)) next.page = 1
  const params = new URLSearchParams()
  if (next.q) params.set('q', next.q)
  if (next.topic) params.set('topic', next.topic)
  if (next.district) params.set('district', next.district)
  if (next.dept) params.set('dept', next.dept)
  if (next.lang) params.set('lang', next.lang)
  if (next.from) params.set('from', next.from)
  if (next.to) params.set('to', next.to)
  if (next.cm) params.set('cat', 'cm')
  if (next.d) params.set('d', next.d)
  if (next.page > 1) params.set('page', String(next.page))
  return params.toString()
}

function tally(values: string[]): Array<{ key: string; count: number }> {
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  return [...counts].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count)
}

/** The hero's yellow chip: the release's topic, else what kind of release. */
function kickerOf(item: NewsItem): string {
  if (item.topic) return topicLabel(item.topic)
  if (item.cm) return 'मुख्यमंत्री व मंत्रिमंडळ'
  return item.dept ?? ''
}

function shortTitle(title: string): string {
  const words = title.split(/\s+/)
  return words.length > 7 ? `${words.slice(0, 7).join(' ')}…` : title
}

/** Five steps of the crimson, relative to the window's busiest district. */
function shade(count: number, ceiling: number): string {
  if (count <= 0) return '#efe6dc'
  const step = Math.min(4, Math.floor((count / ceiling) * 4.999))
  return ['#f5d9dc', '#e6a9b1', '#d06f7d', '#b5384b', '#8a1225'][step]
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
