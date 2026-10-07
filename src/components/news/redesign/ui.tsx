'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Overlay } from '@/components/articles/Overlay'
import { FoldDialog } from '@/components/news/fold-download'
import { StoryPhoto } from '@/components/news/story-photo'
import type { FoldItem } from '@/lib/news/fold-item'
import { AUTHORITY_MR, mrDigits, type NewsItem } from '@/lib/news/public'
import { IArrowRight, IChat, IClose, IDownload, ISearch, ISend, IShare } from './icons'

/**
 * Everything on `/news` that floats above the page, and the one place that
 * knows whether any of it is open.
 *
 * The page itself is server-rendered — every headline is a real link to
 * `/news/<id>`, every filter a GET URL — and these are the enhancements laid
 * over it: a plain click on a headline opens the reading panel instead of
 * navigating, the search icon opens a palette that searches as you type, and
 * the centre button opens the assistant. The carousel reads `busy` from here so
 * it holds still while any of them is open.

 */

type Ui = {
  openReader: (item: NewsItem) => void
  openSearch: (q?: string) => void
  openFold: () => void
  openChat: (q?: string) => void
  flash: (msg: string) => void
  /** A dialog is open: the carousel holds. */
  busy: boolean
  origin: string
}

const Ctx = createContext<Ui | null>(null)

export function useNewsUi(): Ui {
  const ui = useContext(Ctx)
  if (!ui) throw new Error('useNewsUi outside NewsUiProvider')
  return ui
}

export function NewsUiProvider({
  today,
  foldItems,
  recent,
  suggestions,
  origin,
  children,
}: {
  today: string
  foldItems: FoldItem[]
  /** The palette's "ताजी प्रसिद्धीपत्रके" before anything is typed. */
  recent: NewsItem[]
  suggestions: Array<{ label: string; query: string }>
  /** For the absolute link a WhatsApp share needs. */
  origin: string
  children: ReactNode
}) {
  const [reader, setReader] = useState<NewsItem | null>(null)
  const [search, setSearch] = useState<string | null>(null)
  const [fold, setFold] = useState(false)
  const [chat, setChat] = useState<{ open: boolean; ask: string | null }>({ open: false, ask: null })
  const [toast, setToast] = useState('')
  const toastTimer = useRef<number | undefined>(undefined)

  const flash = useCallback((msg: string) => {
    window.clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = window.setTimeout(() => setToast(''), 2600)
  }, [])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const ui = useMemo<Ui>(
    () => ({
      openReader: (item) => {
        setSearch(null)
        setReader(item)
      },
      openSearch: (q = '') => setSearch(q),
      openFold: () => {
        setReader(null)
        setSearch(null)
        setFold(true)
      },
      openChat: (q) => {
        setSearch(null)
        setChat({ open: true, ask: q?.trim() || null })
      },
      flash,
      busy: Boolean(reader || search !== null || fold || chat.open),
      origin,
    }),
    [flash, reader, search, fold, chat.open, origin],
  )

  return (
    <Ctx.Provider value={ui}>
      {children}
      {reader && <ReaderPanel key={reader.id} item={reader} onClose={() => setReader(null)} />}
      {search !== null && (
        <SearchPalette initial={search} recent={recent} suggestions={suggestions} onClose={() => setSearch(null)} />
      )}
      {fold && <FoldDialog today={today} todayItems={foldItems} onClose={() => setFold(false)} />}
      <Assistant open={chat.open} ask={chat.ask} onAsked={() => setChat((c) => ({ ...c, ask: null }))} onClose={() => setChat({ open: false, ask: null })} />
      <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-24 left-1/2 z-[90] -translate-x-1/2 sm:bottom-8">
        {toast && (
          <div className="whitespace-nowrap rounded-full bg-[#1D1714] px-5 py-3 text-[0.9375rem] font-semibold text-white shadow-[0_12px_30px_-10px_rgba(0,0,0,0.5)]">
            {toast}
          </div>
        )}
      </div>
    </Ctx.Provider>
  )
}

/* ----------------------------------------------------------------- helpers */

export function waHref(item: Pick<NewsItem, 'title' | 'href'>, origin: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${item.title}\n${origin}${item.href}\n— महासंवाद, माहिती व जनसंपर्क महासंचालनालय`)}`
}

const pill =
  'inline-flex h-11 items-center gap-1.5 rounded-full border px-3.5 text-[0.9375rem] font-semibold text-[#1D1714] bg-white'

/* ------------------------------------------------------------ reading panel */

type Payload = { body: string[]; issuedBy: string | null; related: NewsItem[] }

/**
 * A release, read in place: a drawer from the right on a desk, the whole
 * screen on a phone. Shown at once from what the list already had; the full
 * text and the related releases arrive behind it. Escape closes, focus is
 * held inside and goes back to the headline that opened it (`Overlay`).
 */
function ReaderPanel({ item, onClose }: { item: NewsItem; onClose: () => void }) {
  const ui = useNewsUi()
  const [data, setData] = useState<Payload | null | 'error'>(null)

  useEffect(() => {
    let live = true
    fetch(`/api/news/item/${encodeURIComponent(item.id)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: Payload) => live && setData(d))
      .catch(() => live && setData('error'))
    return () => {
      live = false
    }
  }, [item.id])

  return (
    <Overlay
      onClose={onClose}
      labelledBy="nr-reader-title"
      overlayClassName="bg-[rgb(14_16_22/0.55)] !z-[60]"
      panelClassName="nr nr-drawer-in ml-auto h-full w-full overflow-y-auto bg-white shadow-[-30px_0_80px_-30px_rgba(0,0,0,0.5)] sm:max-w-[720px]"
    >
      <div className="sticky top-0 z-[1] flex flex-wrap items-center gap-2 border-b border-[#E7E0D5] bg-white/[0.97] px-4 py-2.5 sm:px-12">
        <button type="button" onClick={onClose} aria-label="बंद करा" className="grid h-11 w-11 place-items-center rounded-full bg-[#F4EFE7]">
          <IClose size={18} strokeWidth={2} />
        </button>
        <a href={waHref(item, ui.origin)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp वर पाठवा" className={`${pill} ml-auto border-[#DDD3C5]`}>
          <IShare size={15} /> शेअर
        </a>
      </div>

      <article className="flex flex-col gap-[18px] px-4 pb-12 pt-7 sm:px-12">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-nr-place-soft px-3 py-[3px] font-bold text-nr-place">{item.place}</span>
          <span className="rounded-full bg-[#EFE8DD] px-3 py-[3px] font-semibold text-[#2A221D]">{item.topicLabel}</span>
        </div>
        <h2 id="nr-reader-title" className="nr-h m-0 text-[1.875rem] font-bold leading-[1.36] sm:text-[2.25rem]">
          {item.title}
        </h2>
        <dl className="m-0 flex flex-wrap gap-x-[22px] gap-y-1.5 text-sm text-[#4A403A]">
          <div className="flex gap-1.5">
            <dt>प्रसिद्धी:</dt>
            <dd className="m-0 font-semibold text-[#1D1714]">{item.dateFull}</dd>
          </div>
          {item.dept && (
            <div className="flex gap-1.5">
              <dt>विभाग:</dt>
              <dd className="m-0 font-semibold text-[#1D1714]">{item.dept}</dd>
            </div>
          )}
          <div className="flex gap-1.5">
            <dt>वृत्त क्र.:</dt>
            <dd className="m-0 font-semibold text-[#1D1714]">{item.no ?? 'नाही'}</dd>
          </div>
        </dl>

        {(item.img || item.video) && (
          <figure className="m-0 flex flex-col gap-1.5">
            {item.video ? (
              <video
                src={item.video}
                poster={item.img ?? undefined}
                controls
                playsInline
                preload="metadata"
                aria-label={item.title}
                className="h-[220px] w-full rounded-[14px] bg-black object-contain sm:h-[360px]"
              />
            ) : (
              <StoryPhoto src={item.img} size="lg" className="h-[220px] rounded-[14px] sm:h-[360px]" />
            )}
            {item.credit && <figcaption className="text-xs text-nr-muted">छायाचित्र: {item.credit}</figcaption>}
          </figure>
        )}

        {item.summary && (
          <p className="m-0 text-[1.0625rem] font-medium leading-[1.85] text-[#1D1714] sm:text-[1.1875rem]">{item.summary}</p>
        )}

        {data === null ? (
          <div className="flex flex-col gap-2.5" aria-busy="true" aria-label="पूर्ण मजकूर येत आहे">
            {[0, 1, 2, 3].map((k) => (
              <div key={k} className="h-4 animate-pulse rounded bg-[#F4EFE7] motion-reduce:animate-none" style={{ width: `${92 - k * 9}%` }} />
            ))}
          </div>
        ) : data === 'error' ? (
          <p className="m-0 rounded-[14px] border-[1.5px] border-dashed border-[#CFC4B4] p-5 text-[0.9375rem] leading-[1.7] text-[#4A403A]">
            पूर्ण मजकूर आत्ता आणता आला नाही.{' '}
            <a href={item.href} className="font-bold text-nr-primary underline">
              बातमीचे पान उघडा
            </a>
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <h3 className="sr-only">प्रसिद्धीपत्रकाचा पूर्ण मजकूर</h3>
            {data.body.map((line, i) => (
              <p key={i} className="m-0 text-base leading-[1.95] text-[#2A221D] sm:text-[1.0625rem]">
                {line}
              </p>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <a href={item.href} className="inline-flex h-11 items-center gap-2 rounded-full bg-nr-primary px-5 text-[0.9375rem] font-bold text-white">
            बातमीचे पूर्ण पान <IArrowRight size={16} strokeWidth={2.2} />
          </a>
          {item.docx && (
            <a href={item.docx} className={`${pill} border-[#DDD3C5]`}>
              <IDownload size={15} strokeWidth={2} /> DOCX
            </a>
          )}
        </div>

        <p className="m-0 border-t border-[#E7E0D5] pt-4 text-sm text-[#4A403A]">
          जारी करणारे: {data && data !== 'error' && data.issuedBy ? `${data.issuedBy} · ` : ''}
          {AUTHORITY_MR} · मंजूर प्रसिद्धीपत्रक
        </p>

        {data && data !== 'error' && data.related.length > 0 && (
          <div>
            <h3 className="mb-1 mt-2 text-lg font-bold">संबंधित बातम्या</h3>
            <ul className="m-0 list-none p-0">
              {data.related.map((x) => (
                <li key={x.id} className="border-t border-[#EFE8DD] py-3">
                  <a
                    href={x.href}
                    onClick={(e) => {
                      if (plainClick(e)) {
                        e.preventDefault()
                        ui.openReader(x)
                      }
                    }}
                    className="nr-link block text-[1.0625rem] font-semibold leading-[1.45]"
                  >
                    {x.title}
                  </a>
                  <span className="text-[0.8125rem] text-[#6B615A]">
                    {x.place} · {x.dateLabel}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
    </Overlay>
  )
}

/** A left click with no modifier: everything else keeps the link's own
 *  behaviour, so a new tab still opens the release's page. */
export function plainClick(e: React.MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.defaultPrevented
}

/* ------------------------------------------------------------ search palette */

/**
 * Search as you type, over the same corpus and the same matching as the
 * page's `?q=` list. Enter opens the first result; "सर्व निकाल" hands the
 * query to the list as a GET URL that can be saved and shared.
 */
function SearchPalette({
  initial,
  recent,
  suggestions,
  onClose,
}: {
  initial: string
  recent: NewsItem[]
  suggestions: Array<{ label: string; query: string }>
  onClose: () => void
}) {
  const ui = useNewsUi()
  const [q, setQ] = useState(initial)
  const [res, setRes] = useState<{ q: string; results: NewsItem[]; total: number } | null>(null)
  const input = useRef<HTMLInputElement>(null)

  /* `Overlay` focuses the panel; the palette is for typing. */
  useEffect(() => {
    input.current?.focus()
  }, [])

  useEffect(() => {
    const term = q.trim()
    if (!term) {
      setRes(null)
      return
    }
    const ctl = new AbortController()
    const t = window.setTimeout(() => {
      fetch(`/api/news/search?q=${encodeURIComponent(term)}`, { signal: ctl.signal })
        .then((r) => r.json())
        .then((d) => setRes({ q: term, results: d.results ?? [], total: d.total ?? 0 }))
        .catch(() => {})
    }, 180)
    return () => {
      window.clearTimeout(t)
      ctl.abort()
    }
  }, [q])

  const term = q.trim()
  const results = res && res.q === term ? res.results : []
  const settled = Boolean(res && res.q === term)

  const row = (x: NewsItem, meta: string) => (
    <li key={x.id}>
      <button
        type="button"
        onClick={() => ui.openReader(x)}
        className="flex w-full flex-col gap-0.5 px-5 py-3 text-left hover:bg-nr-peach focus-visible:bg-nr-peach"
      >
        <span className="text-base font-semibold leading-[1.45] text-[#1D1714]">{x.title}</span>
        <span className="text-[0.8125rem] text-[#6B615A]">{meta}</span>
      </button>
    </li>
  )

  return (
    <Overlay
      onClose={onClose}
      labelledBy="nr-pal-label"
      overlayClassName="bg-[rgb(14_16_22/0.55)] !z-[70]"
      panelClassName="nr nr-rise mx-auto h-full w-full overflow-y-auto bg-white sm:mt-[72px] sm:h-fit sm:max-h-[calc(100vh-144px)] sm:w-[min(760px,calc(100%-32px))] sm:rounded-2xl sm:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.55)]"
    >
      <div className="sticky top-0 flex items-center gap-3 border-b border-[#E7E0D5] bg-white py-2.5 pl-5 pr-3.5">
        <ISearch size={20} strokeWidth={2} className="shrink-0 text-nr-text2" />
        <label id="nr-pal-label" htmlFor="nr-pal-q" className="sr-only">
          बातम्या शोधा
        </label>
        <input
          ref={input}
          id="nr-pal-q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (results[0]) ui.openReader(results[0])
            }
          }}
          placeholder="उदा. पीक नुकसान, चंद्रपूर, २१७७११"
          autoComplete="off"
          className="h-[52px] min-w-0 grow border-0 bg-transparent text-lg outline-none sm:text-xl"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="शोध बंद करा"
          className="h-11 shrink-0 rounded-[18px] border border-[#DDD3C5] bg-white px-3.5 text-sm font-semibold text-[#3A302A]"
        >
          Esc
        </button>
      </div>

      {!term ? (
        <>
          <div className="px-5 pb-2 pt-[18px]">
            <div className="text-[0.8125rem] font-bold text-[#6B615A]">सुचवलेले शोध</div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {suggestions.map((g) => (
                <button
                  key={g.label}
                  type="button"
                  onClick={() => setQ(g.query)}
                  className="h-10 rounded-full border border-[#DDD3C5] bg-[#FAF7F2] px-3.5 text-[0.9375rem] text-[#1D1714]"
                >
                  {g.label}
                </button>
              ))}
            </div>
            <div className="mt-5 text-[0.8125rem] font-bold text-[#6B615A]">ताजी प्रसिद्धीपत्रके</div>
          </div>
          <ul className="m-0 list-none p-0 pb-2">{recent.map((x) => row(x, `${x.place} · ${x.dateLabel}`))}</ul>
        </>
      ) : (
        <>
          <p role="status" className="m-0 px-5 pb-1 pt-3.5 text-sm text-[#4A403A]">
            {!settled
              ? 'शोधत आहे…'
              : results.length
                ? `${mrDigits(res!.total)} निकाल · Enter दाबल्यास पहिला उघडतो`
                : ''}
          </p>
          <ul className="m-0 list-none p-0 pb-2">
            {results.map((x) =>
              row(x, `${x.place} · ${x.topicLabel} · ${x.dateLabel}${x.no ? ` · वृत्त क्र. ${x.no}` : ''}`),
            )}
          </ul>
          {settled && results.length === 0 && (
            <div className="px-5 pb-7 pt-5 text-[0.9375rem] leading-[1.6] text-[#3A302A]">
              “{term}” साठी काही सापडले नाही. दुसरा शब्द, जिल्ह्याचे नाव किंवा वृत्त क्रमांक लिहून पाहा.
            </div>
          )}
          <div className="flex flex-wrap gap-2 px-5 pb-3.5 pt-1">
            {settled && res!.total > results.length && (
              <a
                href={`/news?q=${encodeURIComponent(term)}#releases`}
                onClick={onClose}
                className="inline-flex min-h-11 items-center rounded-full bg-nr-primary-soft px-4 text-[0.9375rem] font-bold text-nr-primary"
              >
                सर्व {mrDigits(res!.total)} निकाल यादीत पहा →
              </a>
            )}
            <button
              type="button"
              onClick={() => ui.openChat(term)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-nr-primary bg-white px-4 text-[0.9375rem] font-bold text-nr-primary"
            >
              <IChat size={18} /> “{term}” बद्दल सहाय्यकाला विचारा
            </button>
          </div>
        </>
      )}

      <div className="border-t border-[#EFE8DD] px-5 py-3 text-[0.8125rem] text-[#6B615A]">
        शीर्षक, जिल्हा, विषय, विभाग आणि वृत्त क्रमांकात शोधते · इंग्रजी अंकही चालतात (217711)
      </div>
    </Overlay>
  )
}

/* ----------------------------------------------------------------- assistant */

type Msg = { from: 'me' | 'bot'; text: string; cites: NewsItem[]; fc?: boolean }

const GREETING: Msg = {
  from: 'bot',
  text: 'नमस्कार! मी महासंवाद सहाय्यक. शासनाच्या मंजूर प्रसिद्धीपत्रकांवरूनच उत्तर देतो — प्रत्येक उत्तरासोबत स्रोत. काय जाणून घ्यायचे आहे?',
  cites: [],
}

const CHIPS = ['आज काय मंजूर झाले?', 'दुष्काळासाठी शासन काय करत आहे?', 'कर्जमुक्तीचा लाभ किती शेतकऱ्यांना?', 'हा मेसेज खरा आहे का?']

/**
 * महासंवाद सहाय्यक: answers only from approved releases, always with its
 * sources (`/api/news/assistant`). Not modal — a reader can keep scrolling
 * the page beside it — and it stays mounted while closed, so the
 * conversation is still there when it is opened again.
 */
function Assistant({
  open,
  ask,
  onAsked,
  onClose,
}: {
  open: boolean
  ask: string | null
  onAsked: () => void
  onClose: () => void
}) {
  const ui = useNewsUi()
  const [msgs, setMsgs] = useState<Msg[]>([GREETING])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const log = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const wasOpen = useRef(false)

  const send = useCallback(
    async (q: string) => {
      const question = q.trim()
      if (!question || busy) return
      const history = msgs
        .slice(1)
        .map((m) => ({ role: m.from === 'me' ? 'user' : 'assistant', content: m.text }))
      setMsgs((m) => [...m, { from: 'me', text: question, cites: [] }])
      setText('')
      setBusy(true)
      try {
        const r = await fetch('/api/news/assistant', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ question, history }),
        })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error)
        setMsgs((m) => [...m, { from: 'bot', text: d.text, cites: d.cites ?? [], fc: d.fc }])
      } catch {
        setMsgs((m) => [
          ...m,
          { from: 'bot', text: 'उत्तर मिळवता आले नाही. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा, किंवा वरील शोध वापरा.', cites: [] },
        ])
      } finally {
        setBusy(false)
      }
    },
    [busy, msgs],
  )

  /* A question handed over from the search palette. */
  useEffect(() => {
    if (open && ask) {
      onAsked()
      send(ask)
    }
  }, [open, ask, onAsked, send])

  useEffect(() => {
    if (open && !wasOpen.current) input.current?.focus()
    if (!open && wasOpen.current) document.getElementById('nr-chat-trigger')?.focus()
    wasOpen.current = open
  }, [open])

  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight
  }, [msgs, busy, open])

  if (!open) return null

  const goFactCheck = () => {
    onClose()
    window.setTimeout(() => {
      document.getElementById('factcheck')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      document.getElementById('fc-text')?.focus({ preventScroll: true })
    }, 50)
  }

  return (
    <div
      id="nr-chat"
      role="dialog"
      aria-modal="false"
      aria-labelledby="nr-chat-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          onClose()
        }
      }}
      className="nr nr-rise fixed inset-x-2 bottom-2 z-[58] flex h-[min(660px,calc(100dvh-16px))] flex-col overflow-hidden rounded-2xl border border-nr-line bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] sm:inset-x-auto sm:bottom-7 sm:right-7 sm:h-[min(660px,calc(100vh-56px))] sm:w-[420px]"
    >
      <div className="flex items-center gap-3 bg-nr-deep py-3 pl-4 pr-3 text-white">
        <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-nr-accent text-nr-text">
          <IChat size={20} />
        </span>
        <div className="min-w-0 grow">
          <h2 id="nr-chat-title" className="m-0 text-[1.0625rem] font-bold">
            महासंवाद सहाय्यक
          </h2>
          <div className="text-xs leading-[1.4] text-white/[0.82]">फक्त मंजूर प्रसिद्धीपत्रकांवरून · प्रत्येक उत्तरासोबत स्रोत</div>
        </div>
        <button type="button" onClick={onClose} aria-label="सहाय्यक बंद करा" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/[0.12]">
          <IClose size={18} strokeWidth={2} />
        </button>
      </div>

      <div ref={log} role="log" aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-[#F6F1EA] p-4">
        {msgs.map((m, i) =>
          m.from === 'me' ? (
            <div key={i} className="max-w-[82%] self-end rounded-[16px_16px_4px_16px] bg-nr-primary px-3.5 py-2.5 text-[0.9375rem] leading-[1.55] text-white">
              {m.text}
            </div>
          ) : (
            <div key={i} className="flex max-w-[90%] flex-col gap-2 self-start">
              <div className="rounded-[16px_16px_16px_4px] border border-[#E7E0D5] bg-white px-3.5 py-3 text-[0.9375rem] leading-[1.6]">{m.text}</div>
              {m.cites.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-[#6B615A]">स्रोत</span>
                  {m.cites.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => ui.openReader(c)}
                      className="flex flex-col gap-0.5 rounded-xl border border-[#E7E0D5] bg-white px-3 py-2.5 text-left"
                    >
                      <span className="text-sm font-semibold leading-[1.45] text-[#1D1714]">{c.title}</span>
                      <span className="text-xs text-[#6B615A]">
                        {c.place} · {c.dateLabel} · वृत्त क्र. {c.no ?? 'नाही'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {m.fc && (
                <button
                  type="button"
                  onClick={goFactCheck}
                  className="h-11 self-start rounded-full border-[1.5px] border-nr-primary bg-white px-4 text-[0.9375rem] font-bold text-nr-primary"
                >
                  फॅक्ट चेक उघडा →
                </button>
              )}
            </div>
          ),
        )}
        {busy && (
          <div className="self-start rounded-2xl border border-[#E7E0D5] bg-white px-3.5 py-2.5 text-sm text-[#6B615A]">प्रसिद्धीपत्रकांत शोधत आहे…</div>
        )}
      </div>

      {msgs.length <= 1 && (
        <div className="flex flex-wrap gap-1.5 bg-white px-3 pt-2.5">
          {CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => send(c)}
              className="min-h-10 rounded-full border border-[#DDD3C5] bg-[#FAF7F2] px-3 text-sm text-[#1D1714]"
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(text)
        }}
        className="flex gap-2 bg-white p-3"
      >
        <label htmlFor="nr-chat-in" className="sr-only">
          तुमचा प्रश्न
        </label>
        <input
          ref={input}
          id="nr-chat-in"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="तुमचा प्रश्न लिहा…"
          autoComplete="off"
          className="h-12 min-w-0 grow rounded-full border-[1.5px] border-[#DDD3C5] px-4 text-base text-[#1D1714]"
        />
        <button
          type="submit"
          aria-label="पाठवा"
          disabled={busy}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-nr-accent text-nr-text disabled:opacity-60"
        >
          <ISend size={20} strokeWidth={2} />
        </button>
      </form>
      <p className="m-0 bg-white px-4 pb-3 text-xs leading-normal text-[#6B615A]">सहाय्यक अंदाज करत नाही; शंका असल्यास मूळ प्रसिद्धीपत्रक वाचा.</p>
    </div>
  )
}
