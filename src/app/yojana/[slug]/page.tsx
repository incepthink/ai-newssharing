import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SPECIAL_COVERAGE } from '@/data/news-editorial'
import { hubQuery, loadFrame, searchAll } from '@/lib/news/frame'
import { figureSources, liveDecisions, schemeBySlug, schemeName, schemeReleases } from '@/lib/news/hubs'
import { mrDigits } from '@/lib/news/public'
import { ANCHOR, Crumbs, NewsFrame, SectionHead, WRAP } from '@/components/news/redesign/chrome'
import { HubBrowser } from '@/components/news/redesign/hub'
import { HubHero } from '@/components/news/redesign/hub-cards'
import { SchemeFigures } from '@/components/news/redesign/scheme-figures'
import { HUB_SEARCH_ID } from '@/components/news/redesign/triggers'

/**
 * One scheme's page: its figures and their sources, every release it covers,
 * searchable, with its key decisions as ready-made searches — and the way to
 * the other schemes.
 */

export const dynamic = 'force-dynamic'

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const c = schemeBySlug((await params).slug)
  if (!c) return { title: 'योजना' }
  return { title: schemeName(c), description: c.title }
}

const PAGE_SIZE = 10

export default async function SchemePage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const coverage = schemeBySlug(slug)
  if (!coverage) notFound()

  const { q, n } = hubQuery(await searchParams, PAGE_SIZE)
  const { items, frame } = await loadFrame()
  const rows = schemeReleases(items, coverage)
  const decisions = liveDecisions(items, coverage)
  const others = SPECIAL_COVERAGE.filter((c) => c.anchor !== slug).map((c) => ({ c, count: schemeReleases(items, c).length }))
  const path = `/yojana/${slug}`

  return (
    <NewsFrame frame={frame} current="#yojana" search={{ href: '#search', targetId: HUB_SEARCH_ID }} skipTo="#search">
      <HubHero
        tone="deep"
        eyebrow={coverage.kicker}
        title={coverage.title}
        crumbs={
          <Crumbs dark trail={[{ label: 'मुख्यपृष्ठ', href: '/news' }, { label: 'योजना', href: '/yojana' }, { label: schemeName(coverage) }]} />
        }
      >
        <p className="m-0 text-sm font-semibold text-white/75">{mrDigits(rows.length)} मंजूर बातम्या</p>
        {coverage.figures.length > 0 && (
          <div className="mt-2 max-w-[760px]">
            <SchemeFigures figures={coverage.figures} sources={figureSources(items, coverage)} />
          </div>
        )}
      </HubHero>

      <main id="search" className={`${WRAP} ${ANCHOR}`}>
        <HubBrowser
          entries={rows.map((item) => ({ item }))}
          initialQ={q}
          initialOthers={searchAll(items, q)}
          initialCount={n}
          pageSize={PAGE_SIZE}
          path={path}
          origin={frame.origin}
          placeholder={`${schemeName(coverage)} — निर्णय, जिल्हा किंवा वृत्त क्रमांक शोधा…`}
          suggestions={decisions.map((d) => ({ label: d.label, query: d.query }))}
          scopeLabel="या योजनेतील बातम्या"
          noun="बातम्या"
        >
          {others.length > 0 && (
            <section aria-labelledby="other-schemes-h" className="mt-12 flex flex-col gap-4 lg:mt-16">
              <SectionHead
                eyebrow="योजना"
                id="other-schemes-h"
                title="इतर योजना"
                right={
                  <Link href="/yojana" className="text-[0.9375rem] font-extrabold text-nr-primary">
                    सर्व योजना →
                  </Link>
                }
              />
              <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
                {others.map(({ c, count }) => (
                  <li key={c.anchor}>
                    <Link
                      href={`/yojana/${c.anchor}`}
                      className="flex h-full flex-col gap-1.5 rounded-[18px] bg-white p-5 shadow-[0_1px_0_#F0DCC8,0_20px_40px_-30px_rgba(120,30,30,0.4)] hover:shadow-[0_1px_0_#F0DCC8,0_24px_44px_-26px_rgba(120,30,30,0.5)]"
                    >
                      <span className="text-xs font-extrabold text-nr-primary">{c.kicker}</span>
                      <span className="nr-h text-lg font-extrabold leading-[1.45] text-nr-text">{c.title}</span>
                      <span className="mt-auto pt-2 text-sm text-nr-text2">{mrDigits(count)} बातम्या →</span>
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
