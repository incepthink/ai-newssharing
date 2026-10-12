import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { VIDEO_PROGRAMMES } from '@/data/news-editorial'
import { hubQuery, loadFrame, searchAll } from '@/lib/news/frame'
import { programmeBySlug, programmeEpisodes } from '@/lib/news/hubs'
import { mrDigits } from '@/lib/news/public'
import { ANCHOR, Crumbs, NewsFrame, SectionHead, WRAP, YOUTUBE_URL } from '@/components/news/redesign/chrome'
import { EpisodeCard, HubBrowser } from '@/components/news/redesign/hub'
import { HubHero } from '@/components/news/redesign/hub-cards'
import { HUB_SEARCH_ID } from '@/components/news/redesign/triggers'

/**
 * One programme's page: its newest episode large, then every episode,
 * searchable — and the way to the other programme and the channel.
 */

export const dynamic = 'force-dynamic'

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const p = programmeBySlug((await params).slug)
  if (!p) return { title: 'व्हिडिओ' }
  return { title: p.name, description: `‘${p.name}’ कार्यक्रमातील मुलाखतींचे सर्व भाग — महासंवाद.` }
}

const PAGE_SIZE = 9

export default async function ProgrammePage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const programme = programmeBySlug(slug)
  if (!programme) notFound()

  const { q, n } = hubQuery(await searchParams, PAGE_SIZE)
  const { items, frame } = await loadFrame()
  const all = programmeEpisodes(items)
  const episodes = all.get(slug) ?? []
  const latest = episodes[0]
  const others = VIDEO_PROGRAMMES.filter((p) => p.slug !== slug).map((p) => ({ p, episodes: all.get(p.slug) ?? [] }))
  const path = `/video/${slug}`

  return (
    <NewsFrame frame={frame} current="#video" search={{ href: '#search', targetId: HUB_SEARCH_ID }} skipTo="#search">
      <HubHero
        tone="night"
        eyebrow="व्हिडिओ · कार्यक्रम"
        title={programme.name}
        crumbs={<Crumbs dark trail={[{ label: 'मुख्यपृष्ठ', href: '/news' }, { label: 'व्हिडिओ', href: '/video' }, { label: programme.name }]} />}
      >
        <p className="m-0 text-sm font-semibold text-white/75">
          {mrDigits(episodes.length)} भाग{latest && ` · नवा भाग: ${latest.dateLabel}`} ·{' '}
          <a href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer" className="font-extrabold text-nr-accent hover:underline">
            YouTube वर पहा →
          </a>
        </p>
        {latest && (
          <div className="mt-3 max-w-[820px]">
            <EpisodeCard item={latest} large dark />
          </div>
        )}
      </HubHero>

      <main id="search" className={`${WRAP} ${ANCHOR}`}>
        <HubBrowser
          entries={episodes.map((item) => ({ item }))}
          initialQ={q}
          initialOthers={searchAll(items, q)}
          initialCount={n}
          pageSize={PAGE_SIZE}
          path={path}
          origin={frame.origin}
          placeholder={`‘${programme.name}’ मध्ये पाहुणे, मंत्री किंवा विषय शोधा…`}
          layout="grid"
          featuredId={latest?.id}
          scopeLabel="या कार्यक्रमाचे भाग"
          noun="भाग"
        >
          {others.length > 0 && (
            <section aria-labelledby="other-prog-h" className="mt-12 flex flex-col gap-4 lg:mt-16">
              <SectionHead
                eyebrow="व्हिडिओ"
                id="other-prog-h"
                title="इतर कार्यक्रम"
                right={
                  <Link href="/video" className="text-[0.9375rem] font-extrabold text-nr-primary">
                    सर्व व्हिडिओ →
                  </Link>
                }
              />
              <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
                {others.map(({ p, episodes: eps }) => (
                  <li key={p.slug}>
                    <Link href={`/video/${p.slug}`} className="flex h-full flex-col gap-1.5 rounded-[18px] bg-nr-night p-5 text-white">
                      <span className="text-xs font-extrabold text-nr-accent">कार्यक्रम</span>
                      <span className="nr-h text-xl font-extrabold">{p.name}</span>
                      {eps[0] && <span className="line-clamp-2 text-sm leading-[1.55] text-white/80">नवा भाग: {eps[0].title}</span>}
                      <span className="mt-auto pt-2 text-sm font-bold text-nr-accent">{mrDigits(eps.length)} भाग →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </HubBrowser>
      </main>
    </NewsFrame>
  )
}
