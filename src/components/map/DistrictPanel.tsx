'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toDevanagariDigits } from '@/lib/marathi'
import type { Article } from '@/lib/types'
import { IconArrowRight, IconClose, IconInbox } from '@/components/ui'

interface DistrictPanelProps {
  /** District key, or null when nothing is open. */
  districtId: string | null
  name: string
  /** The count the map is painted with, which is the claim about the place. */
  count: number
  from: string
  to: string
  onClose: () => void
}

/**
 * What the map is a picture of, for one district.
 *
 * The choropleth can only say "more here than there"; this is where a reader
 * finds out what the colour was made of. It fetches on open rather than
 * shipping every article with the map — 36 districts of full text is the whole
 * corpus, and the reader opens one.
 *
 * A district with nothing in the window still gets a panel, and it says so in
 * words. "Nothing here in this window" is an answer; a click that does nothing
 * reads as a broken map.
 */
export function DistrictPanel({
  districtId,
  name,
  count,
  from,
  to,
  onClose,
}: DistrictPanelProps) {
  const [articles, setArticles] = useState<Article[] | null>(null)

  useEffect(() => {
    if (!districtId) return

    // Cleared first, so a slow fetch never shows the previous district's
    // articles under this one's name.
    setArticles(null)
    const params = new URLSearchParams({ district: districtId, status: 'approved', from, to })
    let live = true

    fetch(`/api/articles?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (live) setArticles(d.articles ?? [])
      })
      .catch(() => {
        if (live) setArticles([])
      })

    return () => {
      live = false
    }
  }, [districtId, from, to])

  if (!districtId) return null

  return (
    <aside className="card fade-in flex max-h-[34rem] flex-col overflow-hidden">
      <div
        className="flex items-start justify-between gap-3 border-b px-4 py-3.5"
        style={{ borderColor: 'var(--edge)' }}
      >
        <div className="min-w-0">
          <h3 className="display text-[1.0625rem]">{name}</h3>
          <p className="num mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {from} — {to}
          </p>
          <p className="mt-2">
            <span className={count === 0 ? 'badge' : 'badge badge-ok'}>
              {count === 0 ? 'या कालावधीत बातमी नाही' : `${toDevanagariDigits(count)} मंजूर लेख`}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="बंद करा"
          className="btn-quiet btn-icon btn-sm -mr-1.5 -mt-0.5"
        >
          <IconClose size={14} />
        </button>
      </div>

      <div className="min-h-0 grow overflow-y-auto scroll-slim">
        {articles === null ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <div className="skeleton h-3.5 w-4/5" />
                <div className="skeleton mt-2 h-2.5 w-1/2" />
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <span style={{ color: 'var(--faint)' }}><IconInbox size={18} /></span>
            <p className="mt-2.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              या कालावधीत या जिल्ह्यातून एकही मंजूर लेख नाही.
            </p>
          </div>
        ) : (
          <ul className="row-list">
            {articles.map((a) => (
              <li key={a.id}>
                {/* And the row itself: the reader page, not the desk record. */}
                <Link href={`/news/${a.id}`} className="row">
                  <div className="text-sm font-medium leading-snug">
                    {a.title || <span style={{ color: 'var(--faint)' }}>(शीर्षक नाही)</span>}
                  </div>
                  <div className="num mt-1 text-xs" style={{ color: 'var(--faint)' }}>
                    {a.fold_date}
                    {a.category === 'cm' ? ' · मुख्यमंत्री' : ''}
                    {a.release_no ? ` · वृत्त क्र. ${a.release_no}` : ''}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* The way on, and it is a citizen's way rather than an official's.

          This used to point at `/desk?district=…&status=approved` — the queue,
          with its status column and its pending rows. That is the right
          destination when the person holding the map works here, and the wrong
          one for everybody else: a reader who has just looked at how much news
          came out of their district wants to read it, not to inspect the state
          of its review. `/news?district=…` opens the listing with the district
          already chosen in the filter bar; the desk remains one click away
          through the masthead for the people who need it.

          The same change, and the same reasoning, in `DgiprPanel`'s footer —
          which is the panel the live map actually opens. */}
      <Link
        href={`/news?district=${districtId}`}
        className="flex shrink-0 items-center justify-between gap-2 border-t px-4 py-3 text-xs font-semibold"
        style={{ borderColor: 'var(--edge)', color: 'var(--accent)', background: 'var(--surface-2)' }}
      >
        अधिक बातम्या पहा
        <IconArrowRight size={13} />
      </Link>
    </aside>
  )
}
