'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { DISTRICTS, districtName } from '@/lib/districts'
import { toDevanagariDigits } from '@/lib/marathi'
import type { Article, Category, Status } from '@/lib/types'
import {
  DistrictBadge,
  EmptyState,
  IconArrowRight,
  IconInbox,
  IconLayers,
  LangBadge,
  PageHeader,
  RowSkeleton,
  SearchField,
  STATUS_LABEL,
  statusTint,
} from '@/components/ui'

/**
 * The queue — ~36 articles a day from 13 DLOs, and the screen the desk lives on.
 *
 * Two changes carry the redesign. Status is a row of tabs carrying live counts
 * instead of a select: the shape of the day is legible without opening a menu,
 * and "how much is left" is the question this screen exists to answer. And the
 * queue is one list of hairline-separated rows rather than thirty floating
 * cards, so the eye runs down a single column of headlines the way it does on
 * a wire.
 *
 * The counts are computed client-side from one fetch of everything matching the
 * other filters, so a tab's number always agrees with what clicking it shows.
 */

const TABS: { key: Status | 'all'; label: string }[] = [
  { key: 'pending', label: STATUS_LABEL.pending },
  { key: 'approved', label: STATUS_LABEL.approved },
  { key: 'parked', label: STATUS_LABEL.parked },
  { key: 'all', label: 'सर्व' },
]

export default function DeskPage() {
  const [articles, setArticles] = useState<Article[] | null>(null)
  const [status, setStatus] = useState<Status | 'all'>('pending')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [language, setLanguage] = useState('')
  const [district, setDistrict] = useState('')
  const [q, setQ] = useState('')

  // Arriving from the map: /desk?district=pune&status=approved
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const d = p.get('district')
    const s = p.get('status') as Status | null
    if (d) setDistrict(d)
    if (s && ['pending', 'approved', 'parked'].includes(s)) setStatus(s)
  }, [])

  // Status is deliberately not in this query — the tabs need every status back
  // in order to count them.
  useEffect(() => {
    let live = true
    setArticles(null)
    const p = new URLSearchParams()
    if (category !== 'all') p.set('category', category)
    if (language) p.set('language', language)
    if (district) p.set('district', district)
    fetch(`/api/articles?${p}`)
      .then((r) => r.json())
      .then((d) => { if (live) setArticles(d.articles) })
      .catch(() => { if (live) setArticles([]) })
    return () => { live = false }
  }, [category, language, district])

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, parked: 0, all: 0, cm: 0, noDistrict: 0 }
    for (const a of articles ?? []) {
      c[a.status]++
      c.all++
      if (a.category === 'cm') c.cm++
      if (!a.district) c.noDistrict++
    }
    return c
  }, [articles])

  const visible = useMemo(() => {
    let list = articles ?? []
    if (status !== 'all') list = list.filter((a) => a.status === status)
    const needle = q.trim().toLowerCase()
    if (needle) {
      list = list.filter(
        (a) => a.title.toLowerCase().includes(needle) || a.body.toLowerCase().includes(needle),
      )
    }
    return list
  }, [articles, status, q])

  const filtered = category !== 'all' || Boolean(language) || Boolean(district) || Boolean(q.trim())

  function reset() {
    setCategory('all')
    setLanguage('')
    setDistrict('')
    setQ('')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="वृत्त विभाग · News Desk"
        title="रांग"
        description="तपासा, दुरुस्त करा, मुख्यमंत्री वृत्त वेगळे करा, वृत्त क्रमांक द्या आणि मंजूर करा. डेस्क लेख लिहीत नाही — ते जिल्ह्यातून येतात."
        actions={
          <>
            <Link href="/fold" className="btn-ghost">
              <IconLayers size={15} /> आजचा फोल्ड
            </Link>
            <Link href="/dlo" className="btn-primary">नवीन लेख</Link>
          </>
        }
      />

      {/* --- Filters. Sticky, because the desk changes them constantly and the
              list below is long. ------------------------------------------- */}
      <div
        className="sticky top-14 z-30 -mx-4 border-b px-4 py-3 sm:-mx-6 sm:px-6"
        style={{
          borderColor: 'var(--edge)',
          background: 'rgb(246 245 242 / 0.88)',
          backdropFilter: 'saturate(180%) blur(10px)',
          WebkitBackdropFilter: 'saturate(180%) blur(10px)',
        }}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="seg" role="tablist" aria-label="स्थिती">
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={status === t.key}
                data-active={status === t.key}
                className="seg-item"
                onClick={() => setStatus(t.key)}
              >
                {t.key !== 'all' && (
                  <span className="dot" style={{ background: statusTint(t.key as Status) }} />
                )}
                {t.label}
                <span className="seg-count num">
                  {articles === null ? '·' : toDevanagariDigits(counts[t.key])}
                </span>
              </button>
            ))}
          </div>

          <div className="seg" role="group" aria-label="वर्ग">
            {([
              ['all', 'सर्व वर्ग'],
              ['cm', 'मुख्यमंत्री'],
              ['general', 'इतर'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                data-active={category === value}
                className="seg-item"
                onClick={() => setCategory(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <select
            className="field w-auto"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label="भाषा"
          >
            <option value="">सर्व भाषा</option>
            <option value="mr">मराठी</option>
            <option value="hi">हिन्दी</option>
            <option value="en">English</option>
          </select>

          <select
            className="field w-auto max-w-[12rem]"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            aria-label="जिल्हा"
          >
            <option value="">सर्व जिल्हे</option>
            {DISTRICTS.map((d) => <option key={d.key} value={d.key}>{d.mr}</option>)}
          </select>

          <div className="ml-auto w-full min-w-[12rem] max-w-xs sm:w-auto">
            <SearchField value={q} onChange={setQ} placeholder="शीर्षक किंवा मजकूर शोधा…" />
          </div>

          {filtered && (
            <button className="btn-quiet btn-sm" onClick={reset}>निकष काढा</button>
          )}
        </div>
      </div>

      {/* --- Two standing facts about the queue, when they are true. -------- */}
      {articles !== null && (counts.noDistrict > 0 || counts.cm > 0) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {counts.noDistrict > 0 && (
            <button
              className="badge badge-missing"
              onClick={() => { setStatus('pending'); setQ('') }}
              title="जिल्हा नसलेले लेख मंजूर होऊ शकत नाहीत"
            >
              {toDevanagariDigits(counts.noDistrict)} लेखांना जिल्हा नाही
            </button>
          )}
          {counts.cm > 0 && (
            <button className="badge badge-accent" onClick={() => setCategory('cm')}>
              {toDevanagariDigits(counts.cm)} मुख्यमंत्री / मंत्रिमंडळ
            </button>
          )}
        </div>
      )}

      {/* --- The queue ----------------------------------------------------- */}
      <div className="card overflow-hidden">
        {articles === null ? (
          <RowSkeleton count={5} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<IconInbox size={18} />}
            title={
              filtered
                ? 'या निकषात काहीही नाही'
                : status === 'all'
                  ? 'रांग रिकामी आहे'
                  : `${STATUS_LABEL[status]} रांगेत काहीही नाही`
            }
            description={
              filtered
                ? 'निकष थोडे सैल करा, किंवा दुसरी स्थिती पहा.'
                : 'जिल्ह्यातून नवीन लेख आला की तो इथे दिसेल.'
            }
            action={filtered ? <button className="btn-ghost btn-sm" onClick={reset}>निकष काढा</button> : null}
          />
        ) : (
          <div className="row-list">
            {visible.map((a) => (
              <ArticleRow key={a.id} article={a} />
            ))}
          </div>
        )}
      </div>

      {articles !== null && visible.length > 0 && (
        <p className="text-center text-xs" style={{ color: 'var(--faint)' }}>
          {toDevanagariDigits(visible.length)} लेख दाखवले — नवीनतम प्रथम
        </p>
      )}
    </div>
  )
}

/**
 * One line of the queue.
 *
 * The status is a coloured rule down the left rather than another badge in the
 * pile: at thirty rows the eye finds the block of pending work by colour long
 * before it reads a word.
 */
function ArticleRow({ article: a }: { article: Article }) {
  return (
    <Link href={`/desk/${a.id}`} className="row group relative flex gap-3.5 pl-4">
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: statusTint(a.status), opacity: a.status === 'approved' ? 0.55 : 0.85 }}
      />

      <div className="min-w-0 grow">
        <div className="flex items-start gap-2">
          <h3 className="display min-w-0 text-[0.9375rem] leading-snug">
            {a.title || <span style={{ color: 'var(--faint)' }}>(शीर्षक नाही)</span>}
          </h3>
          {a.category === 'cm' && <span className="badge badge-accent shrink-0">मुख्यमंत्री</span>}
        </div>

        <p
          className="mt-1.5 line-clamp-2 text-[0.8125rem] leading-relaxed"
          style={{ color: 'var(--muted)' }}
        >
          {a.body.slice(0, 260)}
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <DistrictBadge district={a.district} name={districtName(a.district)} />
          <LangBadge language={a.language} />
          {a.release_no ? (
            <span className="badge num">वृत्त क्र. {a.release_no}</span>
          ) : (
            <span className="badge badge-missing">वृत्त क्र. नाही</span>
          )}
          <span className="text-xs" style={{ color: 'var(--faint)' }}>{a.fold_date}</span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end justify-between gap-2 self-stretch">
        <span
          className="badge"
          style={{
            background: `color-mix(in srgb, ${statusTint(a.status)} 8%, white)`,
            borderColor: `color-mix(in srgb, ${statusTint(a.status)} 25%, white)`,
            color: statusTint(a.status),
            fontWeight: 600,
          }}
        >
          {STATUS_LABEL[a.status]}
        </span>
        <IconArrowRight
          size={15}
          className="opacity-0 transition-opacity group-hover:opacity-100"
          style={{ color: 'var(--accent)' }}
        />
      </div>
    </Link>
  )
}
