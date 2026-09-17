import { NewsMapShell } from '@/components/news-map/news-map-shell'
import { NewsTicker, type NewsItem } from '@/components/news/news-ticker'
import { asMinisterFilter } from '@/data/ministers'
import { resolveDistrict } from '@/lib/districts'
import { DGIPR_MR } from '@/lib/dgipr/marathi'
import {
  buildDgiprMap,
  buildNewsMap,
  legendBands,
  loadCorpus,
  type Corpus,
} from '@/lib/dgipr/from-db'
import { buildMapGeometry } from '@/lib/map/geometry'
import { districtNameMr, NEWS_MR } from '@/lib/news/marathi'
import { asWindowId } from '@/lib/news/window'

import '@/styles/tokens.css'
import '@/styles/base.css'
import '@/styles/map.css'
import '@/styles/news-map.css'
import '@/styles/news.css'
import '@/styles/panel-modal.css'
import '@/styles/dgipr.css'
import '@/styles/share.css'

/**
 * The map reads the database on every request, so it cannot be prerendered.
 *
 * It used to be `revalidate = 3600`, which was the right call for a generated
 * corpus anchored to the hour: the page was a pure function of the clock and
 * rebuilding it more often would have produced the same bytes. It is now a
 * function of what the desk has approved, and a release approved at 10:05
 * should be on the map at 10:05 — a DLO watching their own release appear is
 * the first thing anyone checks after approving one.
 */
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'राज्याचा नकाशा',
  description:
    'महाराष्ट्रात काय घडतं आहे, ते नकाशावर — ३६ जिल्ह्यांतील मंजूर शासकीय प्रसिद्धिपत्रके, जिल्ह्यानुसार.',
}

/** How many headlines the band carries before it starts repeating. */
const TICKER_LENGTH = 40

type MapPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * The state as a sheet you can read.
 *
 * Three things are decided here and only here.
 *
 * **The geometry.** The 36 districts are projected once, on the server, and
 * the client is handed plain SVG path strings — it never loads d3-geo or the
 * 440 kB of source GeoJSON. See `lib/map/geometry.ts`; the result is memoised
 * per process, so this costs nothing after the first request.
 *
 * **The corpus.** Every mark, every shade and every card on this page is a row
 * in `articles` with `status = 'approved'` — the same rows the fold, the DOCX
 * builder and `/news` are built on. The page used to run on
 * `lib/news/sample.ts`, a seeded generator of newspaper headlines, and the
 * reason that had to go is not polish: the map's claim is that a mark on a
 * district is a government release from that district, and a generated
 * headline under that claim is a fabricated government notice. See
 * `lib/dgipr/from-db.ts`.
 *
 * **The reading.** Which window and which minister, parsed from the URL rather
 * than held in the browser, because they decide which rows exist and the rows
 * are in Postgres. `NewsMapShell` writes them back; see the note there.
 */
export default async function MapPage({ searchParams }: MapPageProps) {
  const query = await searchParams
  const requested = asWindowId(one(query.window))
  const minister = asMinisterFilter(one(query.minister))

  /* `?district=` — how `/news` and a release page send a reader back here.
     Resolved rather than trusted: the parameter is written by this app from a
     canonical key, but it also arrives in forwarded links, and a district the
     geometry has never heard of should open nothing rather than open a panel
     about a place that is not on the map. */
  const district = resolveDistrict(one(query.district))

  /* One instant for the whole render. Both layers walk outward from it, and
     reading the clock twice would let the choropleth and the marks disagree
     about which side of a window boundary the same release falls on. */
  const now = Date.now()

  const [geometry, corpus] = await Promise.all([buildMapGeometry(), loadCorpus()])

  /* The district is handed to both builders, not just to the panel. It widens
     the window until the place it names is actually on the sheet — see
     `enoughToShow`. Without that, a reader following "नकाशावर पहा" out of a
     five-day-old Nagpur release lands on a 24-hour map with Nagpur greyed out,
     which answers a question they did not ask. */
  const map = buildNewsMap(corpus, requested, minister, now, district)
  const dgipr = buildDgiprMap(corpus, requested, now, district)

  return (
    <main className="newsmap newsmap-page map-page">
      {/* The band carries the way off the map on its right end. The strip
          above it — a badge, the directorate's name, the page title and a
          tally the plate beside the map already prints — was a second header
          under the masthead, and on a page whose whole subject is a shape that
          has to be looked at, the one thing a header row costs is the height
          of the state. The band was already crossing the top of the page; the
          link rides it instead of paying for a row of its own. */}
      <NewsTicker
        items={tickerItems(corpus)}
        action={{ href: '/news', label: NEWS_MR.allNewsList }}
      />

      <div className="map-stage">
        <NewsMapShell
          geometry={geometry}
          map={map}
          dgipr={dgipr}
          bands={legendBands(map)}
          window={requested}
          minister={minister}
          initialDistrictId={district}
        />
      </div>
    </main>
  )
}

/** One value out of a query parameter that may arrive repeated. */
function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

/**
 * The band's lines: the newest release from each district, then the rest.
 *
 * One per district first, so a dozen Mumbai releases cannot take the strip over
 * and leave the reader watching a Mumbai ticker on a Maharashtra map. After
 * every district has had its say the remainder fills the band newest first,
 * which is what keeps it looking like a wire feed rather than a round-robin.
 *
 * Every line points at the release's own page on this site. It used to point
 * out to whichever newspaper filed the piece, because the corpus was scraped
 * and a link was all this app was entitled to show; these are the department's
 * own notices and this app holds them, so the link goes where the reader can
 * actually read one.
 */
function tickerItems(corpus: Corpus): NewsItem[] {
  const seen = new Set<string>()
  const firsts: typeof corpus.rows = []
  const rest: typeof corpus.rows = []

  // `loadCorpus` already returns newest first.
  for (const row of corpus.rows) {
    const key = row.release.districtId ?? 'state'

    if (seen.has(key)) {
      rest.push(row)
      continue
    }

    seen.add(key)
    firsts.push(row)
  }

  return [...firsts, ...rest].slice(0, TICKER_LENGTH).map(({ release }) => ({
    id: release.id,
    headline: release.titleMr,
    place: release.districtId
      ? districtNameMr(release.districtId)
      : DGIPR_MR.statewide,
    url: release.readerUrl ?? `/news/${release.id}`,
  }))
}
