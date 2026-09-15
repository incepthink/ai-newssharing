'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { DISTRICTS, districtName } from '@/lib/districts'
import { toDevanagariDigits } from '@/lib/marathi'
import type { Article } from '@/lib/types'
import {
  DistrictBadge,
  EmptyState,
  IconAlert,
  IconArrowRight,
  IconCheckCircle,
  IconPen,
  IconSparkle,
  LangBadge,
  PageHeader,
  StatusBadge,
} from '@/components/ui'

/**
 * Where everything enters the system.
 *
 * A DLO does one thing here — paste the article they have already written — so
 * the page is one column with one field in it and nothing competing for the
 * eye. The district select sits in the composer's footer rather than above the
 * text, because it is optional and the text is not.
 *
 * What changed: submitting used to leave a sentence beside the button. It now
 * hands back a receipt — the headline the model pulled out, the district it
 * resolved, the language it detected — because that is the moment a DLO can
 * catch a misread, and a sentence that disappears on the next keystroke is not
 * a moment.
 */
export default function DloPage() {
  const [text, setText] = useState('')
  const [district, setDistrict] = useState('')
  const [busy, setBusy] = useState(false)
  const [recent, setRecent] = useState<Article[] | null>(null)
  const [receipt, setReceipt] = useState<{ article: Article; degraded: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const areaRef = useRef<HTMLTextAreaElement>(null)

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/articles')
      const d = await r.json()
      setRecent((d.articles as Article[]).slice(0, 8))
    } catch {
      setRecent([])
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function submit() {
    if (!text.trim() || busy) return
    setBusy(true)
    setError(null)
    setReceipt(null)
    try {
      const r = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: text, district: district || null }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'लेख पाठवता आला नाही')

      setReceipt({ article: d.article, degraded: Boolean(d.extractionError) })
      setText('')
      setDistrict('')
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'काहीतरी चुकले')
    } finally {
      setBusy(false)
    }
  }

  const trimmed = text.trim()
  const words = trimmed ? trimmed.split(/\s+/).length : 0
  const paras = trimmed ? trimmed.split(/\n\s*\n/).filter(Boolean).length : 0

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="जिल्हा माहिती अधिकारी · DLO"
        title="लेख पाठवा"
        description="संपूर्ण लेख जसाच्या तसा पेस्ट करा. शीर्षक वेगळे काढण्याची गरज नाही — शीर्षक, भाषा आणि जिल्हा आपोआप ओळखले जातात आणि वृत्त विभाग ते तपासते."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(17rem,1fr)] lg:items-start">
        {/* --- The composer ------------------------------------------------ */}
        <div className="space-y-4">
          {receipt && (
            <Receipt
              article={receipt.article}
              degraded={receipt.degraded}
              onDismiss={() => { setReceipt(null); areaRef.current?.focus() }}
            />
          )}

          {error && (
            <div className="note note-alert" role="alert">
              <IconAlert size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="card overflow-hidden">
            <div
              className="flex items-center justify-between gap-3 border-b px-4 py-2.5"
              style={{ borderColor: 'var(--edge)', background: 'var(--surface-2)' }}
            >
              <span className="text-xs font-semibold">लेखाचा मजकूर</span>
              <span className="num flex items-center gap-2.5 text-xs" style={{ color: 'var(--faint)' }}>
                <span>{toDevanagariDigits(words)} शब्द</span>
                <span aria-hidden>·</span>
                <span>{toDevanagariDigits(paras)} परिच्छेद</span>
                {text && (
                  <button type="button" className="btn-quiet btn-sm -mr-1.5" onClick={() => setText('')}>
                    साफ करा
                  </button>
                )}
              </span>
            </div>

            <textarea
              ref={areaRef}
              className="field field-body min-h-[26rem] rounded-none border-0 shadow-none focus:shadow-none"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit()
              }}
              placeholder={'इथे लेख पेस्ट करा…\n\nमराठी, हिन्दी किंवा इंग्रजी — भाषा आपोआप ओळखली जाईल.\nरिकाम्या ओळीने परिच्छेद वेगळे होतात; तेच परिच्छेद फोल्डमध्ये जातील.'}
            />

            <div
              className="flex flex-wrap items-end justify-between gap-3 border-t px-4 py-3"
              style={{ borderColor: 'var(--edge)', background: 'var(--surface-2)' }}
            >
              <div className="w-full max-w-[16rem]">
                <label className="label" htmlFor="dlo-district">जिल्हा (ऐच्छिक)</label>
                <select
                  id="dlo-district"
                  className="field"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                >
                  <option value="">आपोआप ओळखा</option>
                  {DISTRICTS.map((d) => (
                    <option key={d.key} value={d.key}>{d.mr}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span className="hidden items-center gap-1.5 text-xs sm:flex" style={{ color: 'var(--faint)' }}>
                  <span className="kbd">Ctrl</span>
                  <span className="kbd">Enter</span>
                </span>
                <button className="btn-primary btn-lg" onClick={submit} disabled={busy || !trimmed}>
                  {busy ? (
                    <>
                      <IconSparkle size={15} className="animate-pulse" /> ओळखत आहे…
                    </>
                  ) : (
                    <>
                      <IconPen size={15} /> पाठवा
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <p className="text-xs leading-relaxed" style={{ color: 'var(--faint)' }}>
            जिल्हा निवडला नाही तर मजकुरावरून ओळखला जाईल. हाताने निवडलेला जिल्हा नेहमी वरचढ ठरतो.
          </p>
        </div>

        {/* --- What you have already sent ---------------------------------- */}
        <aside className="card lg:sticky lg:top-[4.5rem]">
          <div
            className="flex items-center justify-between gap-3 border-b px-4 py-3"
            style={{ borderColor: 'var(--edge)' }}
          >
            <h2 className="text-sm font-semibold">अलीकडे पाठवलेले</h2>
            <Link href="/desk" className="link text-xs">रांग →</Link>
          </div>

          {recent === null ? (
            <div className="space-y-3 p-4">
              {[0, 1, 2].map((i) => (
                <div key={i}>
                  <div className="skeleton h-3.5 w-3/4" />
                  <div className="skeleton mt-2 h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : recent.length === 0 ? (
            <EmptyState
              icon={<IconPen size={18} />}
              title="अजून काहीही नाही"
              description="पाठवलेला पहिला लेख इथे दिसेल."
            />
          ) : (
            <ul className="row-list max-h-[30rem] overflow-y-auto scroll-slim">
              {recent.map((a) => (
                <li key={a.id}>
                  <Link href={`/desk/${a.id}`} className="row">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium leading-snug">
                        {a.title || <span style={{ color: 'var(--faint)' }}>(शीर्षक नाही)</span>}
                      </span>
                      <StatusBadge status={a.status} icon={false} />
                    </div>
                    <div className="mt-1.5 text-xs" style={{ color: 'var(--faint)' }}>
                      {districtName(a.district)} · {a.fold_date}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  )
}

/**
 * The receipt.
 *
 * Extraction failing is not an error — the article is saved either way — so a
 * degraded submit gets the same card in a different key rather than a red
 * banner that implies something was lost.
 */
function Receipt({
  article,
  degraded,
  onDismiss,
}: {
  article: Article
  degraded: boolean
  onDismiss: () => void
}) {
  return (
    <div className={`card fade-in overflow-hidden`}>
      <div className="h-1" style={{ background: degraded ? 'var(--warn)' : 'var(--ok)' }} />
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-2.5">
          <span style={{ color: degraded ? 'var(--warn)' : 'var(--ok)' }}>
            {degraded ? <IconAlert size={17} /> : <IconCheckCircle size={17} />}
          </span>
          <div className="min-w-0 grow">
            <div className="text-sm font-semibold">
              {degraded ? 'लेख जतन झाला — ओळख झाली नाही' : 'लेख वृत्त विभागाकडे पाठवला'}
            </div>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              {degraded
                ? 'शीर्षक आणि जिल्हा आपोआप ओळखता आले नाहीत. मजकूर सुरक्षित आहे — वृत्त विभाग ते भरेल.'
                : 'खालील तपशील आपोआप ओळखले गेले. काही चुकले असल्यास वृत्त विभाग दुरुस्त करेल.'}
            </p>

            <div className="mt-3 rounded-[var(--r-md)] border p-3" style={{ borderColor: 'var(--edge)', background: 'var(--surface-2)' }}>
              <div className="eyebrow">ओळखलेले शीर्षक</div>
              <div className="display mt-1 text-[0.9375rem] leading-snug">
                {article.title || <span style={{ color: 'var(--faint)' }}>— शीर्षक मिळाले नाही —</span>}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <LangBadge language={article.language} />
                <DistrictBadge district={article.district} name={districtName(article.district)} />
                {article.category === 'cm' && <span className="badge badge-accent">मुख्यमंत्री / मंत्रिमंडळ</span>}
                <StatusBadge status={article.status} />
              </div>
            </div>

            <div className="mt-3.5 flex flex-wrap gap-2">
              <button className="btn-ghost btn-sm" onClick={onDismiss}>
                <IconPen size={13} /> आणखी एक पाठवा
              </button>
              <Link href={`/desk/${article.id}`} className="btn-quiet btn-sm">
                डेस्कवर पहा <IconArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
