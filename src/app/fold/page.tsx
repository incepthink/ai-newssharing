'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { districtName } from '@/lib/districts'
import { foldWeekdayLineMr, todayIso, toDevanagariDigits } from '@/lib/marathi'
import type { Article } from '@/lib/types'
import {
  DistrictBadge,
  EmptyState,
  IconArrowLeft,
  IconArrowRight,
  IconChevronDown,
  IconChevronUp,
  IconDownload,
  IconInbox,
  IconLayers,
  LangBadge,
  PageHeader,
  RowSkeleton,
} from '@/components/ui'

function shiftIso(iso: string, days: number) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d + days)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`
}

/**
 * The day's fold. One document, hand-ordered by the desk, no cutoff —
 * approving a late article simply puts it in the next download.
 *
 * The order is the whole screen, so it is drawn as one: a numbered column with
 * the move controls attached to each row, the number reading as the page order
 * it will have in the DOCX. Days step with arrows as well as the date field,
 * because "yesterday's fold" is the thing anyone actually asks for and typing
 * a date to get it is a tax.
 */
export default function FoldPage() {
  const [date, setDate] = useState(todayIso())
  const [articles, setArticles] = useState<Article[] | null>(null)
  const [moving, setMoving] = useState<number | null>(null)

  const load = useCallback(async (d: string) => {
    setArticles(null)
    try {
      const r = await fetch(`/api/fold/${d}`)
      const data = await r.json()
      setArticles(data.articles)
    } catch {
      setArticles([])
    }
  }, [])

  useEffect(() => { load(date) }, [date, load])

  async function reorder(from: number, to: number) {
    if (!articles || to < 0 || to >= articles.length) return
    const next = [...articles]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setArticles(next)
    setMoving(moved.id)
    setTimeout(() => setMoving(null), 400)
    await fetch(`/api/fold/${date}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article_order: next.map((a) => a.id) }),
    })
  }

  const list = articles ?? []
  const cmCount = list.filter((a) => a.category === 'cm').length
  const districts = new Set(list.map((a) => a.district).filter(Boolean)).size
  const isToday = date === todayIso()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="वृत्त विभाग · Fold"
        title="दिवसाचा फोल्ड"
        description="मंजूर लेख, वृत्त विभागाने ठरवलेल्या क्रमाने. एका दिवसाचा एकच दस्तऐवज — आणि कोणतीही अंतिम वेळ नाही."
        actions={
          <a className="btn-primary btn-lg" href={`/api/fold/${date}/docx`}>
            <IconDownload size={15} /> फोल्ड डाउनलोड करा
          </a>
        }
      />

      {/* --- Which day ----------------------------------------------------- */}
      <div className="card flex flex-wrap items-center gap-x-4 gap-y-3 p-3 sm:p-4">
        <div className="flex items-center gap-1.5">
          <button
            className="btn-ghost btn-icon btn-sm"
            onClick={() => setDate(shiftIso(date, -1))}
            aria-label="आदला दिवस"
          >
            <IconArrowLeft size={14} />
          </button>
          <input
            type="date"
            className="field num w-auto"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            aria-label="दिनांक"
          />
          <button
            className="btn-ghost btn-icon btn-sm"
            onClick={() => setDate(shiftIso(date, 1))}
            aria-label="पुढचा दिवस"
          >
            <IconArrowRight size={14} />
          </button>
          {!isToday && (
            <button className="btn-quiet btn-sm" onClick={() => setDate(todayIso())}>आज</button>
          )}
        </div>

        <div className="hidden text-sm sm:block" style={{ color: 'var(--muted)' }}>
          {foldWeekdayLineMr(date)}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--muted)' }}>
          <span>
            <strong className="num text-sm" style={{ color: 'var(--ink)' }}>
              {articles === null ? '—' : toDevanagariDigits(list.length)}
            </strong>{' '}
            लेख
          </span>
          <span>
            <strong className="num text-sm" style={{ color: 'var(--ink)' }}>
              {toDevanagariDigits(cmCount)}
            </strong>{' '}
            मुख्यमंत्री / मंत्रिमंडळ
          </span>
          <span>
            <strong className="num text-sm" style={{ color: 'var(--ink)' }}>
              {toDevanagariDigits(districts)}
            </strong>{' '}
            जिल्हे
          </span>
        </div>
      </div>

      {/* --- The order ------------------------------------------------------ */}
      <div className="card overflow-hidden">
        {articles === null ? (
          <RowSkeleton count={4} />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<IconLayers size={18} />}
            title="या दिवसासाठी अजून कोणताही लेख मंजूर झालेला नाही"
            description="डेस्कवर लेख मंजूर होताच तो इथे — आणि पुढच्या डाउनलोडमध्ये — आपोआप येईल."
            action={
              <Link href="/desk" className="btn-ghost btn-sm">
                <IconInbox size={14} /> रांग उघडा
              </Link>
            }
          />
        ) : (
          <div className="row-list">
            {list.map((a, i) => (
              <div
                key={a.id}
                className="row flex items-start gap-3 sm:gap-4"
                style={moving === a.id ? { background: 'var(--accent-soft)' } : undefined}
              >
                {/* Order controls, drawn as one stepper attached to the row they
                    move. Two loose chevrons floating beside a number do not read
                    as a control; a bordered column with the position in the
                    middle of it does. */}
                <div
                  className="flex shrink-0 flex-col items-center overflow-hidden rounded-[var(--r-md)] border"
                  style={{ borderColor: 'var(--edge)', background: 'var(--surface-2)' }}
                >
                  <button
                    className="flex h-6 w-7 items-center justify-center transition-colors disabled:opacity-25 enabled:hover:bg-[color:var(--surface-sunk)] enabled:hover:text-[color:var(--accent)]"
                    style={{ color: 'var(--muted)' }}
                    onClick={() => reorder(i, i - 1)}
                    disabled={i === 0}
                    aria-label={`${a.title} — वर सरकवा`}
                  >
                    <IconChevronUp size={14} />
                  </button>
                  <span
                    className="num flex h-6 w-7 items-center justify-center border-y text-xs font-semibold"
                    style={{ borderColor: 'var(--edge)', background: 'var(--surface)', color: 'var(--ink)' }}
                  >
                    {toDevanagariDigits(i + 1)}
                  </span>
                  <button
                    className="flex h-6 w-7 items-center justify-center transition-colors disabled:opacity-25 enabled:hover:bg-[color:var(--surface-sunk)] enabled:hover:text-[color:var(--accent)]"
                    style={{ color: 'var(--muted)' }}
                    onClick={() => reorder(i, i + 1)}
                    disabled={i === list.length - 1}
                    aria-label={`${a.title} — खाली सरकवा`}
                  >
                    <IconChevronDown size={14} />
                  </button>
                </div>

                <div className="min-w-0 grow">
                  <div className="flex flex-wrap items-start gap-2">
                    <Link href={`/desk/${a.id}`} className="display min-w-0 text-[0.9375rem] leading-snug hover:underline">
                      {a.title || '(शीर्षक नाही)'}
                    </Link>
                    {a.category === 'cm' && <span className="badge badge-accent">मुख्यमंत्री</span>}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {a.release_no ? (
                      <span className="badge num">वृत्त क्र. {a.release_no}</span>
                    ) : (
                      <span className="badge badge-missing">वृत्त क्र. नाही</span>
                    )}
                    <LangBadge language={a.language} />
                    <DistrictBadge district={a.district} name={districtName(a.district)} />
                  </div>
                </div>

                <a
                  className="btn-ghost btn-sm shrink-0"
                  href={`/api/articles/${a.id}/docx`}
                  aria-label={`${a.title} — DOCX`}
                >
                  <IconDownload size={13} /> DOCX
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {list.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs" style={{ color: 'var(--faint)' }}>
          <span>
            क्रम तुम्ही बदलताच जतन होतो. नंतर मंजूर झालेला लेख यादीच्या शेवटी येतो — आधीचा क्रम बदलत नाही.
          </span>
          <Link href="/share" className="link">हा फोल्ड शेअर करा →</Link>
        </div>
      )}
    </div>
  )
}
