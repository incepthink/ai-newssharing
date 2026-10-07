import Image from 'next/image'
import Link from 'next/link'
import { headers } from 'next/headers'
import type { ReactNode } from 'react'
import { FACT_CHECK_TEAM_LIVE, MAIN_NAV, SPECIAL_COVERAGE, TRENDING, type SpecialCoverage } from '@/data/news-editorial'
import { MINISTERS } from '@/data/ministers'
import { foldArticles } from '@/lib/db'
import { DISTRICTS } from '@/lib/districts'
import { DGIPR_MR } from '@/lib/dgipr/marathi'
import { buildNewsMap } from '@/lib/dgipr/from-db'
import { buildMapGeometry } from '@/lib/map/geometry'
import { todayIso } from '@/lib/marathi'
import { toFoldItem } from '@/lib/news/fold-item'
import { loadNewsCorpus } from '@/lib/news/items'
import { districtNameMr } from '@/lib/news/marathi'
import { searchItems, TOPICS, topicLabel, type NewsItem, type TopicId } from '@/lib/news/public'
import { buildHref, parseFilters, queryOf, STATEWIDE, type Filters, type Query } from '@/lib/news/release-filters'
import { releasePage } from '@/lib/news/releases'
import { StoryPhoto } from '@/components/news/story-photo'
import { FactCheck } from '@/components/news/redesign/fact-check'
import { HeroCarousel, type HeroSlide } from '@/components/news/redesign/hero'
import { MainNav } from '@/components/news/redesign/main-nav'
import { IDownload, IPlay, ISearch } from '@/components/news/redesign/icons'
import { ReleasesBrowser, type DistrictOption, type MinisterOption } from '@/components/news/redesign/releases'
import {
  BottomNav,
  FoldButton,
  ReadLink,
  ReleaseSearchLink,
  SearchChip,
} from '@/components/news/redesign/triggers'
import { NewsUiProvider } from '@/components/news/redesign/ui'
import { IconFacebookF, IconInstagram, IconX, IconYouTube } from '@/components/ui'

/**
 * News — the public front door, to the "नवी रचना — प्रस्ताव" redesign
 * (`docs/design/news-redesign`): a cream ground, the Mahasamvad logo (which
 * carries the emblem), a red-tinted full-bleed hero with the directorate's
 * social accounts beside it, and a floating pill bar at the bottom.
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
 * Filters, topic, district, search and pages are plain GET parameters, so the
 * page works without JavaScript and every view is a link. With it, the
 * releases section (`ReleasesBrowser`) changes them in place and refetches
 * only its list. The
 * hero, the reading panel, the search palette, the assistant, the fold dialog,
 * listening and copying are the client islands (`components/news/redesign`).
 */

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'बातम्या',
  description:
    'महाराष्ट्र शासनाच्या अधिकृत बातम्या — ताज्या, विषयानुसार आणि तुमच्या जिल्ह्यातील. माहिती व जनसंपर्क महासंचालनालयाची मंजूर प्रसिद्धीपत्रके.',
}

const LEAD_COUNT = 5
/** The content column: 1280px, with a gutter that keeps it off the window's
 *  edge below that. */
const WRAP = 'mx-auto w-full max-w-[1328px] px-4 sm:px-6'
/** Anchored sections clear the sticky masthead. */
const ANCHOR = 'scroll-mt-[126px] lg:scroll-mt-[148px]'

/**
 * DGIPR's social channels — the four official accounts confirmed by DGIPR.
 * Each tile wears its platform's own colour and mark, the one place on the
 * page outside the palette, because a reader looks for the logo they know.
 */
const SOCIAL = [
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

type Href = (patch: Partial<Filters>, hash?: string) => string

export default async function NewsPage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams
  const filters = parseFilters(query)
  const now = Date.now()
  const today = todayIso()

  const [{ corpus, items }, geometry, origin, todayFold] = await Promise.all([
    loadNewsCorpus(),
    buildMapGeometry(),
    requestOrigin(),
    foldArticles(today),
  ])

  const href: Href = (patch, hash = '') => buildHref(filters, patch, hash)

  /* --- the release list: first paint; the island takes over from here ---- */
  const releases = releasePage(items, filters)
  const topicCounts = new Map<TopicId, number>()
  for (const i of items) if (i.topic) topicCounts.set(i.topic, (topicCounts.get(i.topic) ?? 0) + 1)

  /* --- the hero --------------------------------------------------------- */
  /* No editor-picked lead exists in the schema yet. The hero carries the
     newest releases with a photograph or a video, topped up from the newest
     without. */
  const hasMedia = (i: NewsItem) => Boolean(i.img || i.video)
  const lead = [...items.filter(hasMedia), ...items.filter((i) => !hasMedia(i))].slice(0, LEAD_COUNT)
  const slides: HeroSlide[] = lead.map((item) => ({ item, kicker: kickerOf(item), short: shortTitle(item.title) }))

  const trending = TRENDING.filter((t) => searchItems(items, t.query).length > 0)

  /* --- special coverage ------------------------------------------------- */
  /* A band with no approved release in it is not shown. */
  const coverage = SPECIAL_COVERAGE.flatMap((c) => {
    const sel = c.select
    const rows = 'topic' in sel ? items.filter((i) => i.topic === sel.topic) : searchItems(items, sel.query)
    if (!rows.length) return []
    return {
      coverage: c,
      stories: [...rows.filter(hasMedia), ...rows.filter((i) => !hasMedia(i))].slice(0, 4),
      decisions: c.decisions.filter((d) => searchItems(items, d.query).length > 0),
      figureSources: [...new Set(c.figures.map((f) => f.source))].map((no) => ({
        no,
        item: items.find((i) => i.no === no) ?? null,
      })),
      allHref: 'topic' in sel ? href({ topic: sel.topic }, '#releases') : href({ q: sel.query }, '#releases'),
    }
  })

  /* --- districts -------------------------------------------------------- */
  /* The map reads a week and says so. `buildNewsMap` widens only when fewer
     than three districts filed, and the count line names the window it
     settled on. */
  const map = buildNewsMap(corpus, '7d', null, now)
  /* The dropdown lists every district, busiest or not, by name, each with
     the rows it will show; राज्यव्यापी first. */
  const perDistrict = new Map<string, number>()
  for (const i of items) {
    const key = i.districtId ?? STATEWIDE
    perDistrict.set(key, (perDistrict.get(key) ?? 0) + 1)
  }
  const districtOptions: DistrictOption[] = [
    { key: STATEWIDE, label: DGIPR_MR.statewide, count: perDistrict.get(STATEWIDE) ?? 0, terms: ['statewide', 'maharashtra', 'महाराष्ट्र'] },
    ...DISTRICTS.map((d) => ({
      key: d.key,
      label: districtNameMr(d.key),
      count: perDistrict.get(d.key) ?? 0,
      terms: [d.mr, d.en, ...d.aliases],
    })).sort((a, b) =>
      a.label.localeCompare(b.label, 'mr'),
    ),
  ]

  /* Every minister on the roster, in Gazette order, with the releases that
     name them. */
  const perMinister = new Map<string, number>()
  for (const i of items) for (const id of i.ministers) perMinister.set(id, (perMinister.get(id) ?? 0) + 1)
  const ministerOptions: MinisterOption[] = MINISTERS.map((m) => ({
    id: m.id,
    label: m.nameMr,
    count: perMinister.get(m.id) ?? 0,
    terms: [m.formalMr, m.portfolioMr, ...m.aliasesMr, ...m.aliasesEn],
  }))

  /* --- the rest --------------------------------------------------------- */
  /* An episode is the directorate's announcement of the programme's interview
     — its headline names the programme and says मुलाखत. A story that only
     quotes the slogan ("…‘जय महाराष्ट्र’चा निनाद") is not one. */
  const episodesOf = (name: string) => items.filter((i) => i.title.includes(name) && i.title.includes('मुलाखत'))
  const jaiMaharashtra = episodesOf('जय महाराष्ट्र')
  /* Most interviews air on both programmes under one joint release, whose
     photograph is the जय महाराष्ट्र card. So दिलखुलास leads with its newest
     episode of its own, else one the band above is not already leading. */
  const dilkhulasAll = episodesOf('दिलखुलास')
  const dilkhulasLead =
    dilkhulasAll.find((i) => !i.title.includes('जय महाराष्ट्र')) ??
    dilkhulasAll.find((i) => i.id !== jaiMaharashtra[0]?.id) ??
    dilkhulasAll[0]
  const dilkhulas = dilkhulasLead ? [dilkhulasLead, ...dilkhulasAll.filter((i) => i !== dilkhulasLead)] : []
  const pictured = items.filter((i) => i.img)
  const ytItem = jaiMaharashtra[0] ?? dilkhulas[0] ?? items.find((i) => i.video) ?? null

  /* The fact check's two samples: a forwarded copy of a real approved
     release, and a message no release says. */
  const sampleSource = items.find((i) => i.cm && i.summary) ?? items[0]
  const factSamples = [
    ...(sampleSource
      ? [{ label: 'उदाहरण: फॉरवर्ड केलेली खरी बातमी', text: `*आनंदाची बातमी* ${sampleSource.title}. सर्वांना पाठवा!` }]
      : []),
    { label: 'उदाहरण: संशयास्पद संदेश', text: 'सर्व शेतकऱ्यांच्या खात्यात थेट ५०,००० रुपये जमा होणार — आजच लिंकवर नोंदणी करा!' },
  ]

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

        {/* 2 ─ Masthead (sticky)--------------------------------------- */}
        <header className="sticky top-0 z-30 border-b border-nr-line bg-[rgba(255,248,238,0.97)]">
          <div className={`${WRAP} flex h-[64px] items-center justify-between gap-2 lg:h-[88px] lg:gap-6`}>
            <a href="#top" aria-label="महासंवाद — मुखपृष्ठ" className="min-w-0 shrink-0">
              <Image src="/mahasamvad-logo.png" alt="महासंवाद" width={292} height={100} priority className="h-[40px] w-auto lg:h-[62px]" />
            </a>
            <div className="flex shrink-0 items-center gap-2.5">
              <ReleaseSearchLink className="flex h-12 items-center gap-2 rounded-full border-[1.5px] border-nr-primary bg-white px-[18px] text-[0.9375rem] font-bold text-nr-primary max-lg:hidden">
                <ISearch size={18} strokeWidth={2.2} />
                शोधा
              </ReleaseSearchLink>
              <ReleaseSearchLink
                label="प्रसिद्धीपत्रकांत शोधा"
                className="grid h-11 w-11 place-items-center rounded-full border-[1.5px] border-nr-primary bg-white text-nr-primary lg:hidden"
              >
                <ISearch size={18} strokeWidth={2.2} />
              </ReleaseSearchLink>
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

        {/* 3 ─ Hero carousel + सोशल मीडिया ----------------------------- */}
        {slides.length ? (
          <HeroCarousel
            slides={slides}
            aside={
              <aside
                aria-labelledby="follow-h"
                className="absolute bottom-12 right-[max(1.5rem,calc((100vw-1280px)/2))] top-12 hidden w-[400px] flex-col rounded-[22px] bg-[rgba(255,248,238,0.95)] px-[22px] pb-[18px] pt-[22px] shadow-[0_30px_60px_-24px_rgba(40,6,10,0.55)] xl:flex"
              >
                <FollowHead id="follow-h" />
                <ul className="m-0 mt-4 flex min-h-0 grow list-none flex-col gap-2.5 p-0">
                  {SOCIAL.map((s) => (
                    <li key={s.id} className="min-h-0 flex-1">
                      <FollowLink social={s} className="h-full max-h-[84px]" />
                    </li>
                  ))}
                </ul>
              </aside>
            }
          />
        ) : (
          <section id="top" className="bg-nr-deep px-4 py-20 text-center text-white">
            <p className="nr-h m-0 text-2xl font-bold">अद्याप एकही प्रसिद्धीपत्रक मंजूर झालेले नाही.</p>
            <p className="mt-2 text-white/80">वृत्त विभागाने मंजूर केलेली बातमी येथे लगेच दिसेल.</p>
          </section>
        )}

        {/* Below the widest screens, the accounts are a grid under the hero. */}
        <section aria-labelledby="follow-h-m" className={`${WRAP} pt-[18px] xl:hidden`}>
          <div className="border-b border-nr-line pb-2">
            <FollowHead id="follow-h-m" />
          </div>
          <ul className="m-0 mt-3 grid list-none grid-cols-2 gap-2.5 p-0 lg:grid-cols-4">
            {SOCIAL.map((s) => (
              <li key={s.id}>
                <FollowLink social={s} className="h-16" />
              </li>
            ))}
          </ul>
        </section>

        <main id="main" className={`${WRAP} flex flex-col gap-9 pt-8 lg:gap-20 lg:pt-[72px]`}>
          {/* 5 ─ वृत्त विशेष: नकाशा + सर्व मंजूर प्रसिद्धीपत्रके -------------- */}
          <section id="releases" aria-labelledby="rel-h" className={`flex flex-col gap-3 lg:gap-5 ${ANCHOR}`}>
            <SectionHead
              eyebrow="वृत्त विशेष"
              id="rel-h"
              title="सर्व मंजूर प्रसिद्धीपत्रके"
              right={<p className="m-0 text-[0.9375rem] text-nr-text2 max-lg:hidden">प्रत्येक बातमी माहिती व जनसंपर्क महासंचालनालयाने मंजूर केलेली</p>}
            />

            <ReleasesBrowser
              key={queryOf(filters)}
              initialFilters={filters}
              initial={releases}
              origin={origin}
              map={{
                viewBox: geometry.viewBox,
                shapes: geometry.districts.map(({ id, nameMr, d }) => ({ id, nameMr, d })),
                counts: Object.fromEntries(Object.entries(map.districts).map(([id, v]) => [id, v.count])),
                ceiling: map.ceiling,
                windowLabel: map.window.labelMr,
                widened: map.widened,
              }}
              districts={districtOptions}
              ministers={ministerOptions}
              topics={TOPICS.filter((t) => topicCounts.get(t.id)).map(({ id, label }) => ({ id, label }))}
            />
          </section>
        </main>

        {/* 6 ─ Special coverage: दुष्काळ २०२६, कर्जमुक्ती २०२६ ------------ */}
        {coverage.map((c) => (
          <CoverageBand key={c.coverage.anchor} {...c} />
        ))}

        {/* 9 ─ Media bands: जय महाराष्ट्र, then दिलखुलास --------------------- */}
        <EpisodeBand id="media" name="जय महाराष्ट्र" episodes={jaiMaharashtra} />
        <EpisodeBand id="dilkhulas" name="दिलखुलास" episodes={dilkhulas} />

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
          <section id="social" aria-labelledby="social-h" className={`flex flex-col gap-3 lg:gap-6 ${ANCHOR}`}>
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

        {/* 13 ─ Floating bar ------------------------------------------------ */}
        <BottomNav />
      </div>
    </NewsUiProvider>
  )
}

/* ------------------------------------------------------------------ pieces */

/** A special coverage band: its figures, four of its releases, the decisions
 *  it leads to and the full list. */
function CoverageBand({
  coverage,
  stories,
  decisions,
  figureSources,
  allHref,
}: {
  coverage: SpecialCoverage
  stories: NewsItem[]
  decisions: SpecialCoverage['decisions']
  figureSources: Array<{ no: string; item: NewsItem | null }>
  allHref: string
}) {
  const headId = `${coverage.anchor}-h`
  return (
    <section id={coverage.anchor} aria-labelledby={headId} className={`mt-9 bg-nr-deep text-white lg:mt-20 ${ANCHOR}`}>
      <div className={`${WRAP} flex flex-col gap-[18px] py-[30px] lg:gap-9 lg:py-14`}>
        <div className="grid gap-[18px] lg:grid-cols-[minmax(0,1fr)_640px] lg:items-end lg:gap-14">
          <div>
            <div className="inline-flex rounded bg-nr-accent px-2.5 py-[3px] text-[0.78rem] font-extrabold text-nr-text lg:px-3 lg:py-1 lg:text-[0.8125rem]">
              {coverage.kicker}
            </div>
            <h2 id={headId} className="nr-h m-0 mt-3 text-[1.75rem] font-extrabold leading-[1.45] lg:mt-3.5 lg:text-[2.875rem] lg:leading-[1.4]">
              {coverage.title}
            </h2>
          </div>
          {coverage.figures.length > 0 && (
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
          )}
        </div>

        <div className="nr-scroll -mx-4 flex gap-3 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:px-0">
          {stories.map((d) => (
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
            href={allHref}
            className="flex h-12 items-center justify-center rounded-full bg-white px-5 text-[0.9375rem] font-extrabold text-nr-deep lg:col-start-3 lg:h-[46px]"
          >
            {coverage.allLabel} →
          </Link>
        </div>
      </div>
    </section>
  )
}

/** One programme's band: the newest episode large, the three before it
 *  listed, and the channel for the rest. */
function EpisodeBand({ id, name, episodes }: { id: string; name: string; episodes: NewsItem[] }) {
  const headId = `${id}-h`
  return (
    <section id={id} aria-labelledby={headId} className={`mt-9 bg-nr-night text-white lg:mt-20 ${ANCHOR}`}>
      <div className={`${WRAP} grid items-start gap-6 py-7 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10 lg:py-14`}>
        <div className="flex flex-col gap-3.5 lg:gap-4">
          <h2 id={headId} className="nr-h m-0 text-[1.625rem] font-extrabold lg:text-4xl">
            {name}
          </h2>
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
              ‘{name}’ चे भाग मंजूर झाल्यावर इथे दिसतील.
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
      </div>
    </section>
  )
}

function FollowHead({ id }: { id: string }) {
  return (
    <h2 id={id} className="nr-h m-0 text-[1.3125rem] font-extrabold leading-normal text-nr-text xl:text-xl">
      सोशल मीडिया
    </h2>
  )
}

/** One account: its own mark and colour, the handle, and — where there is
 *  room — a follow pill. The whole row is the link. */
function FollowLink({ social: s, className }: { social: (typeof SOCIAL)[number]; className: string }) {
  return (
    <a
      href={s.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${s.name} वर महासंवाद फॉलो करा (${s.handle})`}
      className={`group flex items-center gap-3 rounded-2xl border border-nr-line bg-white px-3 transition-colors hover:border-nr-line2 hover:bg-nr-peach xl:px-3.5 ${className}`}
    >
      <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white xl:h-11 xl:w-11" style={{ background: s.tile }}>
        {s.glyph}
      </span>
      <span className="min-w-0 grow leading-tight">
        <b className="block text-[0.9375rem] text-nr-text">{s.name}</b>
        <span className="block truncate text-xs text-nr-muted">{s.handle}</span>
      </span>
      <span className="shrink-0 rounded-full border-[1.5px] border-nr-line2 px-3 py-1 text-[0.8125rem] font-bold text-nr-primary transition-colors group-hover:border-nr-primary max-xl:hidden">
        फॉलो करा
      </span>
    </a>
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
