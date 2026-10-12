import { SPECIAL_COVERAGE } from '@/data/news-editorial'
import { hubQuery, loadFrame, searchAll } from '@/lib/news/frame'
import { liveDecisions, schemeName, schemeQuery, schemeReleases } from '@/lib/news/hubs'
import { mrDigits } from '@/lib/news/public'
import { ANCHOR, Crumbs, NewsFrame, SectionHead, WRAP } from '@/components/news/redesign/chrome'
import { HubBrowser, type HubEntry } from '@/components/news/redesign/hub'
import { HubHero, SchemeCard } from '@/components/news/redesign/hub-cards'
import { HUB_SEARCH_ID } from '@/components/news/redesign/triggers'

/**
 * योजना — every scheme the directorate is covering (`SPECIAL_COVERAGE`), each
 * as a card leading to its own page (`/yojana/<slug>`), under one big search.
 * The search reads every scheme's releases first and the rest of the corpus
 * after, so it finds anything; see `HubBrowser`.
 */

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'योजना',
  description: 'महाराष्ट्र शासनाच्या योजना व विशेष वृत्तांकन — दुष्काळ, कर्जमुक्ती आणि इतर योजनांवरील मंजूर प्रसिद्धीपत्रके एका ठिकाणी.',
}

const PAGE_SIZE = 10

export default async function YojanaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { q, n } = hubQuery(await searchParams, PAGE_SIZE)
  const { items, frame } = await loadFrame()

  const schemes = SPECIAL_COVERAGE.map((c) => ({
    coverage: c,
    name: schemeName(c),
    rows: schemeReleases(items, c),
    decisions: liveDecisions(items, c),
  }))

  /* Every scheme's releases as one list, newest first; a release two schemes
     share carries both names. */
  const badges = new Map<string, string[]>()
  for (const s of schemes) for (const r of s.rows) badges.set(r.id, [...(badges.get(r.id) ?? []), s.name])
  const entries: HubEntry[] = items.filter((i) => badges.has(i.id)).map((item) => ({ item, badge: badges.get(item.id)!.join(' · ') }))

  const suggestions = [
    ...schemes.map((s) => ({ label: s.name, query: schemeQuery(s.coverage) })),
    ...schemes.flatMap((s) => s.decisions.map((d) => ({ label: d.query, query: d.query }))),
  ].filter((s, i, all) => all.findIndex((x) => x.query === s.query) === i)

  return (
    <NewsFrame frame={frame} current="#yojana" search={{ href: '#search', targetId: HUB_SEARCH_ID }} skipTo="#search">
      <HubHero
        tone="deep"
        eyebrow="योजना व विशेष वृत्तांकन"
        title="शासनाच्या योजना — एका ठिकाणी"
        lede="प्रत्येक योजनेवरील मंजूर प्रसिद्धीपत्रके, आकडे आणि महत्त्वाचे निर्णय. योजना, निर्णय, जिल्हा किंवा वृत्त क्रमांक — काहीही शोधा."
        crumbs={<Crumbs dark trail={[{ label: 'मुख्यपृष्ठ', href: '/news' }, { label: 'योजना' }]} />}
      >
        <p className="m-0 text-sm font-semibold text-white/75">
          {mrDigits(schemes.length)} योजना · {mrDigits(entries.length)} बातम्या
        </p>
      </HubHero>

      <main id="search" className={`${WRAP} ${ANCHOR}`}>
        <HubBrowser
          entries={entries}
          initialQ={q}
          initialOthers={searchAll(items, q)}
          initialCount={n}
          pageSize={PAGE_SIZE}
          path="/yojana"
          origin={frame.origin}
          placeholder="योजना, निर्णय, जिल्हा किंवा वृत्त क्रमांक शोधा…"
          suggestions={suggestions}
          listWhenEmpty={false}
          scopeLabel="योजनांतील बातम्या"
          noun="बातम्या"
        >
          <section aria-labelledby="schemes-h" className="mt-8 flex flex-col gap-4 lg:mt-12 lg:gap-6">
            <SectionHead eyebrow="योजना" id="schemes-h" title="सर्व योजना" />
            <ul className="m-0 grid list-none gap-4 p-0 lg:grid-cols-2 lg:gap-6">
              {schemes.map((s) => (
                <li key={s.coverage.anchor}>
                  <SchemeCard coverage={s.coverage} rows={s.rows} />
                </li>
              ))}
            </ul>
          </section>
        </HubBrowser>
      </main>
    </NewsFrame>
  )
}
