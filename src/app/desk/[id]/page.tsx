'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { use, useEffect, useState } from 'react'
import { DISTRICTS, districtName } from '@/lib/districts'
import { datelineEn, datelineMr, toDevanagariDigits } from '@/lib/marathi'
import type { Article } from '@/lib/types'
import {
  IconAlert,
  IconArchive,
  IconArrowLeft,
  IconCheck,
  IconCheckCircle,
  IconDownload,
  IconSparkle,
  LANG_LABEL,
  StatusBadge,
} from '@/components/ui'

/**
 * Proofreading one article.
 *
 * The screen is built around a single question — can this go out? — so the
 * answer is never hidden inside a disabled button. Three gates stand in a
 * checklist beside the text: a headline, a category the desk has actually
 * decided, and a district someone has actually looked at. Each one says what is
 * missing, and the approve button repeats it rather than simply greying out.
 *
 * The preview tab is the other half. What the desk is editing is a document,
 * not a form, and until now the only way to see the document was to download
 * the DOCX — so the fold's own shape (headline, sub-bullets, dateline, byline)
 * is rendered here from the same fields the DOCX is built from.
 */
export default function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [a, setA] = useState<Article | null>(null)
  const [missing, setMissing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [savedOnce, setSavedOnce] = useState(false)
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')

  /**
   * The district gate. The AI guesses; the desk confirms. Nothing is approved
   * until someone has actually looked at this field — an unreviewed guess on
   * the heatmap is worse than no article at all.
   */
  const [districtConfirmed, setDistrictConfirmed] = useState(false)

  /**
   * The segregation gate. The desk does not write articles — deciding whether
   * something is Chief Minister / cabinet business is the call it does make, so
   * it has to be made deliberately rather than inherited from the model.
   */
  const [categoryConfirmed, setCategoryConfirmed] = useState(false)

  useEffect(() => {
    fetch(`/api/articles/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.article) { setMissing(true); return }
        setA(d.article)
        setDistrictConfirmed(d.article.status === 'approved')
        setCategoryConfirmed(d.article.status === 'approved')
      })
      .catch(() => setMissing(true))
  }, [id])

  useEffect(() => {
    // Suggest a release number as soon as the desk opens something without one.
    if (a && !a.release_no) {
      fetch('/api/release-no')
        .then((r) => r.json())
        .then((d) => setA((prev) => (prev && !prev.release_no ? { ...prev, release_no: d.release_no } : prev)))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a?.id, a?.release_no])

  if (missing) {
    return (
      <div className="card p-10 text-center">
        <p className="text-sm font-semibold">हा लेख सापडला नाही.</p>
        <Link href="/desk" className="btn-ghost btn-sm mt-4">रांगेकडे परत</Link>
      </div>
    )
  }

  if (!a) return <EditorSkeleton />

  function set<K extends keyof Article>(k: K, v: Article[K]) {
    setA((prev) => (prev ? { ...prev, [k]: v } : prev))
    setDirty(true)
  }

  const draft = {
    title: a.title,
    body: a.body,
    district: a.district,
    language: a.language,
    release_no: a.release_no,
    office: a.office,
    department: a.department,
    attribution: a.attribution,
    dateline: a.dateline,
    byline: a.byline,
    bullets: a.bullets,
    category: a.category,
  }

  async function persist(patch: Partial<Article>) {
    setSaving(true)
    try {
      const r = await fetch(`/api/articles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const d = await r.json()
      setA(d.article)
      setDirty(false)
      setSavedOnce(true)
      return d.article as Article
    } finally {
      setSaving(false)
    }
  }

  const gates = [
    { ok: a.title.trim().length > 0, label: 'शीर्षक दिले आहे', fix: 'शीर्षक रिकामे आहे' },
    { ok: categoryConfirmed, label: 'वर्ग नक्की केला', fix: 'मुख्यमंत्री / इतर हे नक्की करा' },
    { ok: districtConfirmed, label: 'जिल्हा तपासला', fix: 'जिल्हा तपासून खूण करा' },
  ]
  const blocker = gates.find((g) => !g.ok)
  const canApprove = !blocker

  const words = a.body.trim() ? a.body.trim().split(/\s+/).length : 0
  const paras = a.body.split(/\n\s*\n/).filter((p) => p.trim()).length

  return (
    <div className="space-y-5">
      {/* --- Action bar. Sticky, because approving is what this page is for
              and the body can run to several screens. ---------------------- */}
      <div
        className="sticky top-14 z-30 -mx-4 border-b px-4 py-3 sm:-mx-6 sm:px-6"
        style={{
          borderColor: 'var(--edge)',
          background: 'rgb(246 245 242 / 0.88)',
          backdropFilter: 'saturate(180%) blur(10px)',
          WebkitBackdropFilter: 'saturate(180%) blur(10px)',
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => router.push('/desk')} className="btn-quiet btn-sm">
            <IconArrowLeft size={14} /> रांग
          </button>

          <StatusBadge status={a.status} />

          <span className="num hidden text-xs sm:inline" style={{ color: 'var(--faint)' }}>
            {a.release_no ? `वृत्त क्र. ${a.release_no}` : 'वृत्त क्र. नाही'} · {a.fold_date}
          </span>

          <span className="ml-auto flex items-center gap-2">
            <span className="text-xs" style={{ color: dirty ? 'var(--warn)' : 'var(--faint)' }}>
              {saving ? 'जतन करत आहे…' : dirty ? 'जतन झालेले नाही' : savedOnce ? 'जतन झाले' : ''}
            </span>
            <button className="btn-quiet btn-sm" onClick={() => persist({ ...draft, status: 'parked' })} disabled={saving}>
              <IconArchive size={14} /> राखीव
            </button>
            <button className="btn-ghost btn-sm" onClick={() => persist(draft)} disabled={saving || !dirty}>
              जतन करा
            </button>
            <button
              className="btn-primary btn-sm"
              disabled={saving || !canApprove}
              title={blocker?.fix}
              onClick={() => persist({ ...draft, status: 'approved' }).then(() => router.push('/desk'))}
            >
              <IconCheck size={14} /> मंजूर करा
            </button>
          </span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(19rem,1fr)] lg:items-start">
        {/* --- The article ------------------------------------------------- */}
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div
              className="flex items-center justify-between gap-3 border-b px-3 py-2"
              style={{ borderColor: 'var(--edge)', background: 'var(--surface-2)' }}
            >
              <div className="seg">
                <button className="seg-item" data-active={tab === 'edit'} onClick={() => setTab('edit')}>
                  संपादन
                </button>
                <button className="seg-item" data-active={tab === 'preview'} onClick={() => setTab('preview')}>
                  झलक
                </button>
              </div>
              <span className="num text-xs" style={{ color: 'var(--faint)' }}>
                {toDevanagariDigits(words)} शब्द · {toDevanagariDigits(paras)} परिच्छेद
              </span>
            </div>

            {tab === 'edit' ? (
              <div className="p-4 sm:p-5">
                <label className="label" htmlFor="ed-title">शीर्षक</label>
                {/* A textarea rather than an input: DGIPR headlines run to two
                    and three lines, and an input silently scrolls the end of one
                    out of sight — exactly where a proofreader needs to look. */}
                <textarea
                  id="ed-title"
                  rows={2}
                  className="field field-title"
                  value={a.title}
                  onChange={(e) => set('title', e.target.value.replace(/\n/g, ' '))}
                  placeholder="शीर्षक लिहा…"
                />

                <label className="label mt-4" htmlFor="ed-body">मजकूर</label>
                <textarea
                  id="ed-body"
                  className="field field-body min-h-[30rem]"
                  value={a.body}
                  onChange={(e) => set('body', e.target.value)}
                />
                <p className="hint">
                  रिकाम्या ओळीने परिच्छेद वेगळे होतात. हेच परिच्छेद जशाच्या तसे फोल्डमध्ये जातील.
                </p>
              </div>
            ) : (
              <ArticlePreview article={a} />
            )}
          </div>

          {blocker && (
            <div className="note note-alert">
              <IconAlert size={15} className="mt-0.5 shrink-0" />
              <span>
                <strong>मंजुरी अडली आहे — </strong>{blocker.fix}.
              </span>
            </div>
          )}
        </div>

        {/* --- The desk's decisions ---------------------------------------- */}
        <aside className="space-y-4 lg:sticky lg:top-[7.5rem]">
          {/* The checklist. "Why is approve greyed out" should never need asking. */}
          <div className="card p-4">
            <h2 className="text-sm font-semibold">मंजुरीसाठी आवश्यक</h2>
            <ul className="mt-3 space-y-2">
              {gates.map((g) => (
                <li key={g.label} className="flex items-center gap-2 text-sm">
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: g.ok ? 'var(--ok-soft)' : 'var(--surface-sunk)',
                      color: g.ok ? 'var(--ok)' : 'var(--faint)',
                      border: `1px solid ${g.ok ? 'var(--ok-edge)' : 'var(--edge)'}`,
                    }}
                  >
                    {g.ok && <IconCheck size={10} />}
                  </span>
                  <span style={{ color: g.ok ? 'var(--text-secondary)' : 'var(--ink)' }}>
                    {g.ok ? g.label : g.fix}
                  </span>
                </li>
              ))}
            </ul>
            {canApprove && (
              <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--ok)' }}>
                <IconCheckCircle size={13} /> मंजुरीसाठी तयार
              </p>
            )}
          </div>

          {/* The desk's one editorial call, so it leads. */}
          <div className="card-gate p-4" data-open={!categoryConfirmed}>
            <label className="label">वर्ग</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {([
                ['cm', 'मुख्यमंत्री / मंत्रिमंडळ'],
                ['general', 'इतर'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { set('category', value); setCategoryConfirmed(true) }}
                  /* Soft while it is still only the model's suggestion, solid
                     once the desk has actually made the call. The difference is
                     the whole point of this control. */
                  className={
                    a.category !== value
                      ? 'btn-ghost'
                      : categoryConfirmed
                        ? 'btn-primary'
                        : 'btn-secondary'
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="hint flex items-start gap-1.5">
              {categoryConfirmed ? (
                <>वर्ग नक्की केला — फोल्डमध्ये याच क्रमाने जाईल.</>
              ) : (
                <>
                  <IconSparkle size={12} className="mt-0.5 shrink-0" />
                  AI ची सूचना: {a.category === 'cm' ? 'मुख्यमंत्री / मंत्रिमंडळ' : 'इतर'} — तपासून नक्की करा.
                </>
              )}
            </p>
          </div>

          {/* District next, and visually loud. The heatmap depends on it. */}
          <div className="card-gate p-4" data-open={!districtConfirmed}>
            <label className="label" htmlFor="ed-district">जिल्हा</label>
            <select
              id="ed-district"
              className="field"
              value={a.district ?? ''}
              onChange={(e) => {
                set('district', (e.target.value || null) as Article['district'])
                setDistrictConfirmed(true)
              }}
            >
              <option value="">— राज्यव्यापी / जिल्हा नाही —</option>
              {DISTRICTS.map((d) => <option key={d.key} value={d.key}>{d.mr}</option>)}
            </select>

            <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 accent-[color:var(--accent)]"
                checked={districtConfirmed}
                onChange={(e) => setDistrictConfirmed(e.target.checked)}
              />
              <span>जिल्हा तपासला — हे नकाशावर मोजले जाईल</span>
            </label>
          </div>

          <div className="card p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div>
                <label className="label" htmlFor="ed-release">वृत्त क्र.</label>
                <input
                  id="ed-release"
                  className="field num"
                  value={a.release_no ?? ''}
                  onChange={(e) => set('release_no', e.target.value || null)}
                  placeholder="उदा. 3331"
                />
                <p className="hint">पुढील क्रमांक सुचवला आहे — DGIPR चा क्रमांक वरचढ.</p>
              </div>

              <div>
                <label className="label" htmlFor="ed-lang">भाषा</label>
                <select
                  id="ed-lang"
                  className="field"
                  value={a.language}
                  onChange={(e) => set('language', e.target.value as Article['language'])}
                >
                  <option value="mr">मराठी</option>
                  <option value="hi">हिन्दी</option>
                  <option value="en">English</option>
                </select>
                <p className="hint">फोल्डमधील फॉन्ट यावरून ठरतो.</p>
              </div>
            </div>
          </div>

          {/* Everything the fold prints around the text. Folded away by
              default — the desk fills these in on a minority of articles. */}
          <details className="card group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4">
              <span className="text-sm font-semibold">शीर्षलेख व श्रेय</span>
              <span className="text-xs" style={{ color: 'var(--faint)' }}>
                {[a.office, a.department, a.attribution, a.dateline, a.byline].filter(Boolean).length > 0
                  ? 'भरलेले'
                  : 'रिकामे'}
              </span>
            </summary>
            <div className="space-y-3 border-t p-4" style={{ borderColor: 'var(--edge)' }}>
              <Text label="कार्यालय" value={a.office} onChange={(v) => set('office', v)}
                placeholder="मुख्यमंत्री सचिवालय (जनसंपर्क कक्ष)" />
              <Text label="विभाग" value={a.department} onChange={(v) => set('department', v)}
                placeholder="गृह विभाग" />
              <Text label="श्रेय ओळ" value={a.attribution} onChange={(v) => set('attribution', v)}
                placeholder="– मुख्यमंत्री देवेंद्र फडणवीस" />
              <Text label="वृत्तस्थळ" value={a.dateline} onChange={(v) => set('dateline', v)}
                placeholder="मुंबई" />
              <Text label="लेखक श्रेय" value={a.byline} onChange={(v) => set('byline', v)}
                placeholder="अश्विनी पुजारी/विसंअ" />
              <div>
                <label className="label">उपमुद्दे (प्रत्येक ओळीवर एक)</label>
                <textarea
                  className="field min-h-[5rem]"
                  value={a.bullets.join('\n')}
                  onChange={(e) =>
                    set('bullets', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))
                  }
                />
              </div>
            </div>
          </details>

          <a className="btn-ghost btn-block" href={`/api/articles/${a.id}/docx`}>
            <IconDownload size={15} /> या लेखाची DOCX
          </a>
        </aside>
      </div>
    </div>
  )
}

function Text({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string | null
  onChange: (v: string | null) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="field"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder={placeholder}
      />
    </div>
  )
}

/**
 * The article as the fold will set it.
 *
 * Deliberately not pixel-identical to the DOCX — it cannot be, the DOCX uses
 * fonts that live on the operator's machine. It is the same *structure*: the
 * office block top right, the headline, the sub-bullets, the dateline running
 * into the first paragraph, the byline at the end. That is what the desk is
 * checking when it checks a layout.
 */
function ArticlePreview({ article: a }: { article: Article }) {
  const paras = a.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  const place = a.dateline?.trim()
  const lead = place
    ? a.language === 'en'
      ? datelineEn(place, a.fold_date)
      : datelineMr(place, a.fold_date)
    : null

  return (
    <article className="px-5 py-6 sm:px-10 sm:py-8" style={{ background: 'var(--surface)' }}>
      <div className="mx-auto max-w-[38rem]">
        <div className="flex items-start justify-between gap-4">
          <span className="num text-xs" style={{ color: 'var(--muted)' }}>
            {a.release_no ? `वृत्त क्र. ${a.release_no}` : ''}
          </span>
          <div className="text-right text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
            {a.office && <div>{a.office}</div>}
            {a.department && <div>({a.department})</div>}
          </div>
        </div>

        <h1 className="display mt-5 text-center text-[1.375rem] leading-snug">
          {a.title || <span style={{ color: 'var(--faint)' }}>(शीर्षक नाही)</span>}
        </h1>

        {a.attribution && (
          <p className="mt-2 text-center text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {a.attribution}
          </p>
        )}

        {a.bullets.length > 0 && (
          <ul className="mx-auto mt-4 max-w-[30rem] space-y-1.5">
            {a.bullets.map((b, i) => (
              <li key={i} className="flex gap-2 text-[0.9375rem] font-semibold leading-snug">
                <span style={{ color: 'var(--accent)' }}>•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}

        <hr className="hairline my-5" />

        {paras.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--faint)' }}>मजकूर रिकामा आहे.</p>
        ) : (
          paras.map((p, i) => (
            <p key={i} className="mb-3.5 text-[0.9375rem] leading-[1.9]" style={{ textAlign: 'justify' }}>
              {i === 0 && lead && <strong>{lead} </strong>}
              {p}
            </p>
          ))
        )}

        {a.byline && (
          <p className="mt-6 text-right text-sm" style={{ color: 'var(--muted)' }}>
            ०००० <br />
            {a.byline}
          </p>
        )}

        <p className="mt-6 text-center text-xs" style={{ color: 'var(--faint)' }}>
          {LANG_LABEL[a.language]} · {districtName(a.district)}
        </p>
      </div>
    </article>
  )
}

function EditorSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(19rem,1fr)]">
      <div className="card p-5">
        <div className="skeleton h-3 w-16" />
        <div className="skeleton mt-2 h-10 w-full" />
        <div className="skeleton mt-6 h-3 w-16" />
        <div className="skeleton mt-2 h-[26rem] w-full" />
      </div>
      <div className="space-y-4">
        <div className="card p-4"><div className="skeleton h-24 w-full" /></div>
        <div className="card p-4"><div className="skeleton h-20 w-full" /></div>
        <div className="card p-4"><div className="skeleton h-28 w-full" /></div>
      </div>
    </div>
  )
}
