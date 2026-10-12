import { VIDEO_PROGRAMMES } from '@/data/news-editorial'
import { hubQuery, loadFrame, searchAll } from '@/lib/news/frame'
import { programmeEpisodes } from '@/lib/news/hubs'
import { mrDigits } from '@/lib/news/public'
import { ANCHOR, Crumbs, NewsFrame, SectionHead, WRAP } from '@/components/news/redesign/chrome'
import { HubBrowser, type HubEntry } from '@/components/news/redesign/hub'
import { HubHero, ProgrammeCard } from '@/components/news/redesign/hub-cards'
import { HUB_SEARCH_ID } from '@/components/news/redesign/triggers'

/**
 * व्हिडिओ — the directorate's programmes (`VIDEO_PROGRAMMES`: जय महाराष्ट्र,
 * दिलखुलास), each as a card leading to its own page (`/video/<slug>`), under
 * one big search over every episode first and the rest of the corpus after.
 */

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'व्हिडिओ',
  description: 'जय महाराष्ट्र आणि दिलखुलास — माहिती व जनसंपर्क महासंचालनालयाच्या कार्यक्रमांतील मुलाखतींचे सर्व भाग.',
}

const PAGE_SIZE = 9

export default async function VideoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { q, n } = hubQuery(await searchParams, PAGE_SIZE)
  const { items, frame } = await loadFrame()

  const episodes = programmeEpisodes(items)
  const programmes = VIDEO_PROGRAMMES.map((p) => ({ programme: p, episodes: episodes.get(p.slug) ?? [] }))

  /* Every episode as one list, newest first; a joint release names both
     programmes. */
  const badges = new Map<string, string[]>()
  for (const p of programmes) for (const e of p.episodes) badges.set(e.id, [...(badges.get(e.id) ?? []), p.programme.name])
  const entries: HubEntry[] = items.filter((i) => badges.has(i.id)).map((item) => ({ item, badge: badges.get(item.id)!.join(' · ') }))

  return (
    <NewsFrame frame={frame} current="#video" search={{ href: '#search', targetId: HUB_SEARCH_ID }} skipTo="#search">
      <HubHero
        tone="night"
        eyebrow="व्हिडिओ"
        title="मुलाखती व कार्यक्रम"
        lede="जय महाराष्ट्र आणि दिलखुलास कार्यक्रमांचे सर्व भाग. पाहुणे, विषय किंवा दिनांक — काहीही शोधा."
        crumbs={<Crumbs dark trail={[{ label: 'मुख्यपृष्ठ', href: '/news' }, { label: 'व्हिडिओ' }]} />}
      >
        <p className="m-0 text-sm font-semibold text-white/75">
          {mrDigits(programmes.length)} कार्यक्रम · {mrDigits(entries.length)} भाग
        </p>
      </HubHero>

      <main id="search" className={`${WRAP} ${ANCHOR}`}>
        <HubBrowser
          entries={entries}
          initialQ={q}
          initialOthers={searchAll(items, q)}
          initialCount={n}
          pageSize={PAGE_SIZE}
          path="/video"
          origin={frame.origin}
          placeholder="पाहुणे, मंत्री, विषय किंवा कार्यक्रम शोधा…"
          suggestions={programmes.map((p) => ({ label: p.programme.name, query: p.programme.name }))}
          layout="grid"
          listWhenEmpty={false}
          scopeLabel="कार्यक्रमांचे भाग"
          noun="भाग"
        >
          <section aria-labelledby="programmes-h" className="mt-8 flex flex-col gap-4 lg:mt-12 lg:gap-6">
            <SectionHead eyebrow="व्हिडिओ" id="programmes-h" title="सर्व कार्यक्रम" />
            <ul className="m-0 grid list-none gap-4 p-0 lg:grid-cols-2 lg:gap-6">
              {programmes.map((p) => (
                <li key={p.programme.slug}>
                  <ProgrammeCard programme={p.programme} episodes={p.episodes} />
                </li>
              ))}
            </ul>
          </section>
        </HubBrowser>
      </main>
    </NewsFrame>
  )
}
