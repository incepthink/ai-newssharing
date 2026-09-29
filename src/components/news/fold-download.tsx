'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Overlay } from '@/components/articles/Overlay'
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconClose,
  IconDownload,
  IconLayers,
} from '@/components/ui'
import { foldWeekdayLineMr, toDevanagariDigits as mr } from '@/lib/marathi'
import { toFoldItem, type FoldItem } from '@/lib/news/fold-item'
import type { Article, Language } from '@/lib/types'

const TITLE_ID = 'fold-title'
const LANG_MR: Record<Language, string> = { mr: 'मराठी', hi: 'हिंदी', en: 'English' }

type Download = { state: 'idle' | 'busy' | 'error' } | { state: 'done'; count: number }

/**
 * Today's fold, on the public page: a band under the navigation that says what
 * is in it, and a dialog that downloads it as one DOCX.
 *
 * The fold is the desk's — approved releases, in the order the news desk set.
 * The dialog opens on exactly that, everything ticked. A reader can drop
 * articles or move them for their own download; that choice travels only in
 * the download's `?ids=` and never changes the desk's order.
 *
 * Other days load from `/api/fold/<date>` as the reader steps to them and are
 * kept for the life of the page. There is no cutoff: an article approved
 * later is in the next download of that day.
 */
export function FoldDownload({ today, items }: { today: string; items: FoldItem[] }) {
  const [open, setOpen] = useState(false)
  const cm = items.filter((a) => a.cm).length

  return (
    <>
      <section
        aria-label="आजचा फोल्ड"
        className="flex flex-col gap-3.5 rounded-[20px] bg-accent p-4 text-white lg:flex-row lg:items-center lg:gap-[22px] lg:py-[18px] lg:pl-[22px] lg:pr-[18px]"
      >
        <div className="flex min-w-0 items-center gap-3 lg:gap-[22px]">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-white/[0.12] lg:h-14 lg:w-14 lg:rounded-2xl">
            <IconLayers size={24} strokeWidth={1.7} />
          </span>
          <div className="min-w-0">
            <p className="display text-lg font-bold leading-[1.4] lg:text-2xl lg:leading-[1.35]">
              {foldWeekdayLineMr(today).replace(/\.$/, '')}
            </p>
          </div>
        </div>

        <dl className="m-0 flex flex-wrap gap-x-3.5 gap-y-1 text-[0.8125rem] text-white/[0.86] lg:ml-auto lg:flex-nowrap lg:gap-0">
          {(
            [
              ['लेख', items.length],
              ['मुख्यमंत्री / मंत्रिमंडळ', cm],
              ['जिल्हे', districtCount(items)],
            ] as const
          ).map(([label, n]) => (
            <div
              key={label}
              className="flex flex-row-reverse items-baseline gap-1 lg:flex-col lg:gap-0 lg:border-l lg:border-white/[0.24] lg:px-5 lg:py-0.5"
            >
              <dt className="lg:text-xs lg:text-white/[0.82]">{label}</dt>
              <dd className="m-0 text-base font-bold text-white lg:text-[1.375rem] lg:leading-[1.3]">{mr(n)}</dd>
            </div>
          ))}
        </dl>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className="flex h-[54px] shrink-0 items-center justify-center gap-2.5 rounded-full bg-saffron px-7 text-base font-bold text-ink shadow-[0_8px_20px_-10px_rgba(0,0,0,0.55)] hover:brightness-105 lg:h-[58px] lg:text-[1.0625rem]"
        >
          <IconDownload size={20} strokeWidth={2.2} />
          फोल्ड डाउनलोड करा
        </button>
      </section>

      {open && <FoldDialog today={today} todayItems={items} onClose={() => setOpen(false)} />}
    </>
  )
}

function FoldDialog({ today, todayItems, onClose }: { today: string; todayItems: FoldItem[]; onClose: () => void }) {
  /* Days already fetched, today's from the server. */
  const cache = useRef(new Map<string, FoldItem[]>([[today, todayItems]]))
  const current = useRef(today)
  const allBox = useRef<HTMLInputElement>(null)
  const moveTimer = useRef<number | undefined>(undefined)

  const [date, setDate] = useState(today)
  /* null while the day loads; 'error' when it could not. */
  const [items, setItems] = useState<FoldItem[] | null | 'error'>(todayItems)
  const [order, setOrder] = useState<number[]>(() => todayItems.map((a) => a.id))
  const [sel, setSel] = useState<Set<number>>(() => new Set(todayItems.map((a) => a.id)))
  const [moving, setMoving] = useState<number | null>(null)
  const [dl, setDl] = useState<Download>({ state: 'idle' })

  /** Every day opens with its whole fold ticked, in the desk's order. */
  const show = useCallback((list: FoldItem[]) => {
    setItems(list)
    setOrder(list.map((a) => a.id))
    setSel(new Set(list.map((a) => a.id)))
  }, [])

  const goTo = useCallback(
    async (d: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return
      current.current = d
      setDate(d)
      setMoving(null)
      setDl({ state: 'idle' })
      const hit = cache.current.get(d)
      if (hit) return show(hit)

      setItems(null)
      try {
        const r = await fetch(`/api/fold/${d}`)
        if (!r.ok) throw new Error(String(r.status))
        const list = ((await r.json()).articles as Article[]).map(toFoldItem)
        cache.current.set(d, list)
        /* The reader may have stepped on while this was in flight. */
        if (current.current === d) show(list)
      } catch {
        if (current.current === d) setItems('error')
      }
    },
    [show],
  )

  useEffect(() => () => window.clearTimeout(moveTimer.current), [])

  const list = Array.isArray(items) ? items : []
  const byId = new Map(list.map((a) => [a.id, a]))
  const rows = order.flatMap((id) => byId.get(id) ?? [])
  const picked = rows.filter((a) => sel.has(a.id))
  const total = rows.length
  const n = picked.length
  const allOn = total > 0 && n === total
  const busy = dl.state === 'busy'
  const reordered = order.join(',') !== list.map((a) => a.id).join(',')

  useEffect(() => {
    if (allBox.current) allBox.current.indeterminate = n > 0 && n < total
  }, [n, total])

  function move(from: number, to: number) {
    if (to < 0 || to >= order.length) return
    const next = [...order]
    const [id] = next.splice(from, 1)
    next.splice(to, 0, id)
    setOrder(next)
    setMoving(id)
    setDl({ state: 'idle' })
    window.clearTimeout(moveTimer.current)
    moveTimer.current = window.setTimeout(() => setMoving(null), 400)
  }

  function toggle(id: number) {
    const next = new Set(sel)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSel(next)
    setDl({ state: 'idle' })
  }

  async function download() {
    if (!n || busy) return
    setDl({ state: 'busy' })
    try {
      const ids = picked.map((a) => a.id).join(',')
      const r = await fetch(`/api/fold/${date}/docx?ids=${ids}`)
      if (!r.ok) throw new Error(String(r.status))
      const url = URL.createObjectURL(await r.blob())
      const a = document.createElement('a')
      a.href = url
      a.download = fileName(date)
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
      setDl({ state: 'done', count: n })
    } catch {
      setDl({ state: 'error' })
    }
  }

  const label =
    total === 0 ? 'फोल्ड डाउनलोड करा'
    : n === 0 ? 'किमान एक लेख निवडा'
    : busy ? 'फोल्ड तयार होत आहे…'
    : allOn ? `पूर्ण फोल्ड डाउनलोड करा · ${mr(n)} लेख`
    : `फोल्ड डाउनलोड करा · ${mr(n)} लेख`

  const dayButton = 'grid h-11 w-11 shrink-0 place-items-center rounded-[10px] border border-edge bg-surface disabled:opacity-40 sm:h-10 sm:w-10'

  return (
    <Overlay
      onClose={onClose}
      labelledBy={TITLE_ID}
      panelClassName="sheet h-[92vh] max-w-[820px] overflow-hidden sm:h-[min(860px,88vh)] sm:rounded-3xl"
    >
      <div className="flex shrink-0 items-start gap-3 px-4 pb-3 pt-3.5 sm:gap-4 sm:px-7 sm:pb-[18px] sm:pt-6">
        <div className="min-w-0 grow">
          <h2 id={TITLE_ID} className="display text-[1.375rem] font-bold leading-[1.35] sm:text-[1.75rem] sm:leading-[1.3]">
            फोल्ड डाउनलोड करा
          </h2>
          <p className="mt-1.5 hidden text-sm leading-[1.65] text-secondary sm:block">
            मंजूर लेख, वृत्त विभागाने ठरवलेल्या क्रमाने. नको असलेले लेख काढा किंवा क्रम बदला — क्रमांक म्हणजे DOCX मधील त्या
            लेखाचे स्थान.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="बंद करा"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-paper hover:bg-sunk"
        >
          <IconClose size={18} strokeWidth={2} />
        </button>
      </div>

      <div className="mx-4 flex shrink-0 flex-col gap-1 rounded-[14px] bg-paper p-1.5 sm:mx-7 sm:flex-row sm:items-center sm:gap-3.5 sm:p-2">
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => goTo(shift(date, -1))} aria-label="आदला दिवस" className={dayButton}>
            <IconArrowLeft size={16} strokeWidth={2} />
          </button>
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => goTo(e.target.value)}
            aria-label="दिनांक"
            className="h-11 min-w-0 grow rounded-[10px] border border-edge-strong bg-surface px-2.5 text-[0.9375rem] sm:h-10 sm:grow-0 sm:text-sm"
          />
          <button
            type="button"
            onClick={() => goTo(shift(date, 1))}
            disabled={date >= today}
            aria-label="पुढचा दिवस"
            className={dayButton}
          >
            <IconArrowRight size={16} strokeWidth={2} />
          </button>
          {date !== today && (
            <button
              type="button"
              onClick={() => goTo(today)}
              className="h-11 shrink-0 rounded-[10px] px-3 text-sm font-bold text-accent hover:bg-surface sm:h-10"
            >
              आज
            </button>
          )}
        </div>
        <span className="px-1.5 pb-1 text-[0.8125rem] text-secondary sm:p-0 sm:text-sm">{foldWeekdayLineMr(date)}</span>
      </div>

      <div className="scroll-slim mt-2.5 min-h-0 grow overflow-y-auto border-t border-sunk sm:mt-3.5">
        {items === null ? (
          <div className="flex flex-col gap-3 px-4 py-4 sm:px-7" aria-busy="true" aria-label="फोल्ड येत आहे">
            {[0, 1, 2, 3].map((k) => (
              <div key={k} className="skeleton h-[72px]" />
            ))}
          </div>
        ) : items === 'error' ? (
          <FoldEmpty title="हा फोल्ड आत्ता आणता आला नाही">
            <button
              type="button"
              onClick={() => {
                cache.current.delete(date)
                goTo(date)
              }}
              className="mt-1.5 h-11 rounded-full bg-accent-soft px-[18px] text-sm font-bold text-accent"
            >
              पुन्हा प्रयत्न करा
            </button>
          </FoldEmpty>
        ) : total === 0 ? (
          <FoldEmpty title="या दिवसासाठी अजून कोणताही लेख मंजूर झालेला नाही">
            <p className="m-0 max-w-[420px] text-sm leading-[1.65] text-secondary">
              वृत्त विभागाने लेख मंजूर करताच तो इथे — आणि पुढच्या डाउनलोडमध्ये — आपोआप येईल.
            </p>
            {date !== today && (
              <button
                type="button"
                onClick={() => goTo(today)}
                className="mt-1.5 h-11 rounded-full bg-accent-soft px-[18px] text-sm font-bold text-accent"
              >
                आजचा फोल्ड पहा
              </button>
            )}
          </FoldEmpty>
        ) : (
          <>
            <div className="sticky top-0 z-[1] flex flex-wrap items-center gap-x-4 border-b border-sunk bg-surface px-4 pb-2 pt-1 sm:px-7 sm:py-2">
              <label className="flex min-h-11 cursor-pointer items-center gap-3">
                <input
                  ref={allBox}
                  type="checkbox"
                  checked={allOn}
                  onChange={() => {
                    setSel(allOn ? new Set() : new Set(order))
                    setDl({ state: 'idle' })
                  }}
                  className="h-[22px] w-[22px] accent-[var(--accent)] sm:h-5 sm:w-5"
                />
                <span className="text-[0.9375rem] font-bold">सर्व निवडा</span>
              </label>
              <span className="text-[0.8125rem] text-secondary">
                <b className="text-ink">{mr(n)}</b> / {mr(total)} निवडले
              </span>
              {reordered && (
                <button
                  type="button"
                  onClick={() => {
                    setOrder(list.map((a) => a.id))
                    setDl({ state: 'idle' })
                  }}
                  className="ml-auto h-9 rounded-full border border-edge bg-surface px-3 text-[0.8125rem] font-semibold text-secondary hover:bg-paper"
                >
                  मूळ क्रम
                </button>
              )}
            </div>

            <ol aria-label="फोल्डमधील लेख" className="m-0 list-none p-0">
              {rows.map((a, k) => (
                <FoldRow
                  key={a.id}
                  item={a}
                  k={k}
                  last={k === rows.length - 1}
                  checked={sel.has(a.id)}
                  num={sel.has(a.id) ? picked.indexOf(a) + 1 : null}
                  moving={moving === a.id}
                  onToggle={() => toggle(a.id)}
                  onMove={move}
                />
              ))}
            </ol>
          </>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-2.5 border-t border-sunk bg-[#fbfaf8] px-4 pb-4 pt-2.5 sm:flex-row sm:items-center sm:gap-4 sm:px-7 sm:py-4">
        <button
          type="button"
          onClick={onClose}
          className="hidden h-12 shrink-0 rounded-full px-[18px] text-[0.9375rem] font-semibold text-secondary hover:bg-paper sm:-ml-[18px] sm:block"
        >
          रद्द करा
        </button>
        <div role="status" aria-live="polite" className="min-w-0 grow text-xs leading-[1.6] text-muted">
          {dl.state === 'done' ? (
            <span className="flex items-start gap-1.5 break-words text-[0.8125rem] font-semibold text-place">
              <IconCheck size={18} strokeWidth={2.4} className="shrink-0" />
              {fileName(date)} डाउनलोड झाले · {mr(dl.count)} लेख
            </span>
          ) : dl.state === 'error' ? (
            <span className="text-[0.8125rem] font-semibold text-accent">डाउनलोड झाले नाही — पुन्हा प्रयत्न करा.</span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={download}
          disabled={n === 0 || busy}
          aria-busy={busy}
          className={`flex h-[54px] shrink-0 items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-6 text-base font-bold sm:h-[52px] ${
            n === 0 ? 'bg-edge text-muted' : 'bg-accent text-white hover:bg-[var(--accent-hover)]'
          }`}
        >
          {busy ? <Spinner /> : <IconDownload size={18} strokeWidth={2.2} />}
          {label}
        </button>
      </div>
    </Overlay>
  )
}

function FoldRow({
  item: a,
  k,
  last,
  checked,
  num,
  moving,
  onToggle,
  onMove,
}: {
  item: FoldItem
  k: number
  last: boolean
  checked: boolean
  /** Its page in the DOCX, or null when left out. */
  num: number | null
  moving: boolean
  onToggle: () => void
  onMove: (from: number, to: number) => void
}) {
  const step = 'grid h-8 w-9 place-items-center disabled:opacity-30 sm:h-[26px] sm:w-[30px]'
  const docx = (
    <a
      href={`/api/articles/${a.id}/docx`}
      aria-label={`${a.title} — DOCX`}
      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-edge px-2.5 text-xs font-semibold text-secondary hover:bg-paper sm:h-9 sm:gap-1.5 sm:px-3 sm:text-[0.8125rem]"
    >
      <IconDownload size={13} strokeWidth={2.2} /> DOCX
    </a>
  )

  return (
    <li
      className={`flex items-start gap-2.5 border-b border-sunk px-4 py-3 transition-colors duration-300 sm:gap-3.5 sm:px-7 sm:py-3.5 ${
        moving ? 'bg-accent-soft' : 'bg-surface'
      }`}
    >
      <label className="mt-6 grid h-11 w-[26px] shrink-0 cursor-pointer place-items-center sm:mt-[17px] sm:w-7">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          aria-label={`${a.title} — फोल्डमध्ये समाविष्ट करा`}
          className="h-[22px] w-[22px] accent-[var(--accent)] sm:h-5 sm:w-5"
        />
      </label>

      <div className="flex shrink-0 flex-col overflow-hidden rounded-[10px] border border-edge bg-paper">
        <button type="button" onClick={() => onMove(k, k - 1)} disabled={k === 0} aria-label={`${a.title} — वर सरकवा`} className={step}>
          <IconChevronUp size={15} strokeWidth={2.2} />
        </button>
        <span
          className={`grid h-[26px] w-9 place-items-center border-y border-edge bg-surface text-[0.8125rem] font-bold sm:w-[30px] sm:text-xs ${
            num ? 'text-ink' : 'text-faint'
          }`}
        >
          {num ? mr(num) : '–'}
        </span>
        <button type="button" onClick={() => onMove(k, k + 1)} disabled={last} aria-label={`${a.title} — खाली सरकवा`} className={step}>
          <IconChevronDown size={15} strokeWidth={2.2} />
        </button>
      </div>

      <div className={`min-w-0 grow pt-0.5 transition-opacity duration-200 ${checked ? '' : 'opacity-50'}`}>
        <div className="flex items-start gap-2">
          <Link href={a.href} className="display text-[0.9375rem] font-semibold leading-[1.55] hover:text-accent sm:text-base">
            {a.title}
          </Link>
          {a.cm && (
            <span className="hidden shrink-0 rounded-full bg-saffron-soft px-[9px] py-0.5 text-xs font-bold text-saffron-ink sm:inline">
              मुख्यमंत्री
            </span>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-[5px] text-xs sm:mt-2 sm:gap-1.5">
          {a.cm && (
            <span className="rounded-full bg-saffron-soft px-2 py-0.5 font-bold text-saffron-ink sm:hidden">मुख्यमंत्री</span>
          )}
          {a.releaseNo ? (
            <span className="rounded-full bg-sunk px-2 py-0.5 text-secondary sm:px-[9px]">
              वृत्त क्र. <b className="font-semibold text-ink">{mr(a.releaseNo)}</b>
            </span>
          ) : (
            <span className="rounded-full border border-dashed border-saffron-ink px-[7px] py-px font-semibold text-saffron-ink sm:px-2">
              वृत्त क्र. नाही
            </span>
          )}
          <span className="rounded-full bg-sunk px-2 py-0.5 text-secondary sm:px-[9px]">{LANG_MR[a.language]}</span>
          <span className="rounded-full bg-place-soft px-2 py-0.5 font-semibold text-place sm:px-[9px]">
            {a.district ?? 'राज्यव्यापी'}
          </span>
          <span className="sm:hidden">{docx}</span>
        </div>
      </div>

      <span className="mt-1 hidden sm:block">{docx}</span>
    </li>
  )
}

function FoldEmpty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-6 py-14 text-center sm:px-10 sm:py-[72px]">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-paper text-muted">
        <IconLayers size={24} strokeWidth={1.7} />
      </span>
      <p className="text-base font-bold leading-normal sm:text-[1.0625rem]">{title}</p>
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true" className="animate-spin motion-reduce:animate-none">
      <path d="M12 3a9 9 0 1 1-9 9" />
    </svg>
  )
}

function districtCount(items: FoldItem[]): number {
  return new Set(items.flatMap((a) => a.district ?? [])).size
}

/** Mirrors `foldFileName` in `lib/docx/fold`, which is server-only. */
function fileName(date: string): string {
  return `Dgipr-News-Fold-${date}.docx`
}

function shift(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d + days)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`
}
