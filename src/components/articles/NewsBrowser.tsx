'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  applyFilters,
  DEFAULT_FILTERS,
  isFiltered,
  NEWS_LABEL_MR,
  type FeatureArticle,
  type Filters,
} from '@/lib/articles/feature'
import { NEWS_MR } from '@/lib/news/marathi'
import { ArticleCard } from '@/components/articles/ArticleCard'
import { AskDrawer } from '@/components/articles/AskDrawer'
import { FilterBar } from '@/components/articles/FilterBar'
import { ShareSheet } from '@/components/articles/ShareSheet'
import { EmptyState, IconMap, IconMessage, IconSearch, PageHeader } from '@/components/ui'

/**
 * The listing, with everything that has state.
 *
 * Split out of `app/news/page.tsx` so the page can be a server component and
 * read `?district=` before anything renders. That matters more than it sounds:
 * the district arrives from the map, and a list that mounts unfiltered and then
 * narrows itself in an effect shows the reader every district in the state for
 * one frame before showing them the one they asked for.
 */
export function NewsBrowser({
  articles,
  /** The district the reader arrived with, from `?district=`. Already resolved
   *  to a canonical key by the page; `''` means no filter. */
  initialDistrict,
}: {
  articles: FeatureArticle[]
  initialDistrict: string
}) {
  const [filters, setFilters] = useState<Filters>({
    ...DEFAULT_FILTERS,
    district: initialDistrict,
  })
  const [sharing, setSharing] = useState<FeatureArticle | null>(null)
  const [askOpen, setAskOpen] = useState(false)
  const [askContext, setAskContext] = useState<FeatureArticle | null>(null)

  const visible = useMemo(() => applyFilters(articles, filters), [articles, filters])

  const patch = useCallback((p: Partial<Filters>) => setFilters((f) => ({ ...f, ...p })), [])
  const reset = useCallback(() => setFilters(DEFAULT_FILTERS), [])

  const ask = useCallback((article: FeatureArticle | null) => {
    setAskContext(article)
    setAskOpen(true)
  }, [])

  return (
    <>
      <div className="space-y-6">
        <PageHeader
        eyebrow="महासंवाद · नागरिकांसाठी"
        title={NEWS_LABEL_MR}
        description="राज्य शासनाच्या योजना, निर्णय आणि उपक्रमांवरील सविस्तर बातम्या. मंत्री, विभाग किंवा जिल्ह्यानुसार शोधा, वर्ड फाइल उतरवा, शेअर करा — किंवा बातमीबद्दल थेट प्रश्न विचारा."
        actions={
          <>
            {/* The way back to the map, and the reciprocal of the map's own
                "सर्व बातम्यांची यादी". The two surfaces are one corpus asked two
                questions — where is news happening, and what did it say — and
                until now a reader who arrived at one could only reach the other
                through the masthead, which names both but never says they are
                the same releases.

                It carries the district the list is currently narrowed to, so
                somebody who filtered to नांदेड here and then asks to see it on
                the map is not dropped back at the whole state. */}
            <Link
              className="btn-ghost"
              href={filters.district ? `/map?district=${filters.district}` : '/map'}
            >
              <IconMap size={15} /> {NEWS_MR.viewOnMap}
            </Link>

            <button type="button" className="btn-ghost" onClick={() => ask(null)}>
              <IconMessage size={15} /> सहाय्यकाला विचारा
            </button>
          </>
        }
      />

      <FilterBar
        value={filters}
        onChange={patch}
        onReset={reset}
        shown={visible.length}
        total={articles.length}
      />

      {visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconSearch size={18} />}
            title="या निकषात एकही बातमी नाही"
            description={
              isFiltered(filters)
                ? 'शोधशब्द थोडा वेगळा वापरून पहा, किंवा एखादा फिल्टर काढून पहा.'
                : 'सध्या या विभागात प्रसिद्ध झालेली बातमी उपलब्ध नाही.'
            }
            action={
              isFiltered(filters) ? (
                <button type="button" className="btn-ghost btn-sm" onClick={reset}>
                  सर्व फिल्टर्स काढा
                </button>
              ) : null
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((a) => (
            <ArticleCard
              key={a.id}
              article={a}
              onShare={() => setSharing(a)}
              onAsk={() => ask(a)}
            />
          ))}
        </div>
      )}

        <p className="pt-2 text-center text-xs leading-relaxed" style={{ color: 'var(--faint)' }}>
          माहिती व जनसंपर्क महासंचालनालय, महाराष्ट्र शासन
          <br />
          या पानावरील बातम्या हे मांडणी दाखविण्यासाठीचा प्रातिनिधिक नमुना मजकूर आहे.
        </p>
      </div>

      {/* Order matters: whatever is rendered last sits on top, so the assistant
          opens over the share sheet rather than under it. */}
      {sharing && <ShareSheet article={sharing} onClose={() => setSharing(null)} />}

      {askOpen && (
        <AskDrawer
          article={askContext}
          onClearArticle={() => setAskContext(null)}
          onClose={() => setAskOpen(false)}
        />
      )}
    </>
  )
}
