'use client'

import { useEffect, useRef, useState } from 'react'
import type { FeatureArticle } from '@/lib/articles/feature'
import { Overlay, OverlayHeader } from '@/components/articles/Overlay'
import {
  IconClose,
  IconSend,
  IconSparkle,
  IconTrash,
} from '@/components/ui'

const TITLE_ID = 'ask-title'

/** A turn in the thread. `note` is the assistant's own bookkeeping — a context
 *  change — and is never sent to the model. */
type Turn =
  | { role: 'user' | 'assistant'; content: string; failed?: boolean }
  | { role: 'note'; content: string }

const QUICK_PROMPTS = [
  'या बातमीचा २ मिनिटांत सारांश सांगा',
  'यातून नागरिकांना काय लाभ मिळेल?',
  'महत्त्वाचे निर्णय कोणते?',
  'अर्ज कुठे आणि कसा करायचा?',
]

const QUICK_PROMPTS_NO_CONTEXT = [
  'शेतकऱ्यांसाठीच्या योजनांबद्दल सांगा',
  'महिलांसाठी कोणते निर्णय झाले?',
  'माझ्या जिल्ह्यातील बातम्या कोणत्या?',
]

const GENERIC_ERROR = 'उत्तर मिळवता आले नाही. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.'

function errorText(data: unknown): string {
  const err = (data as { error?: unknown } | null)?.error
  return typeof err === 'string' && err.trim() !== '' ? err : GENERIC_ERROR
}

/**
 * The article assistant.
 *
 * It is grounded in one article at a time, and it says which one at the top of
 * the panel where it cannot be missed — an assistant that quietly answers
 * about the wrong release is worse than one that refuses.
 *
 * The context is set by wherever the drawer was opened from and is not
 * switchable inside it. The picker that used to sit in this banner made sense
 * when the only way to read an article was a modal over the list; now that
 * every article has its own page, "which article am I asking about" is
 * answered by which page you are on, and a select that could silently point
 * the assistant at a different release was a way to get a confidently wrong
 * answer. `onClearArticle` is still offered where a general question is
 * meaningful — the list page — and omitted on an article page, where it is not.
 *
 * The thread survives being closed and reopened. Losing a conversation because
 * you looked something up behind the drawer is the fastest way to make an
 * assistant feel disposable.
 */
export function AskDrawer({
  article,
  onClearArticle,
  onClose,
}: {
  /** The article in context, or null for a general question. */
  article: FeatureArticle | null
  /** Drop the context and ask generally. Omitted where that makes no sense. */
  onClearArticle?: () => void
  onClose: () => void
}) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const thread = useRef<HTMLDivElement>(null)

  // Stick to the bottom as turns arrive. `scrollTop = scrollHeight` rather than
  // scrollIntoView: the latter also scrolls the page behind the drawer.
  useEffect(() => {
    const el = thread.current
    if (el) el.scrollTop = el.scrollHeight
  }, [turns, busy])

  async function send(text: string) {
    const question = text.trim()
    if (!question || busy) return

    const next: Turn[] = [...turns, { role: 'user', content: question }]
    setTurns(next)
    setDraft('')
    setBusy(true)

    try {
      const res = await fetch('/api/articles/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article: article
            ? { title: article.title, body: article.body, highlights: article.highlights }
            : null,
          // Notes are ours, not the model's; and only the turns before this
          // question are history.
          history: next
            .filter((t): t is Extract<Turn, { role: 'user' | 'assistant' }> => t.role !== 'note')
            .slice(0, -1)
            .slice(-8),
          question,
        }),
      })
      const data = await res.json().catch(() => null)

      // The route answers every failure in Marathi, so its `error` is fit to
      // print. The fallback covers the case where the request never got there.
      if (!res.ok || typeof data?.reply !== 'string') {
        setTurns((t) => [...t, { role: 'assistant', failed: true, content: errorText(data) }])
      } else {
        setTurns((t) => [...t, { role: 'assistant', content: data.reply }])
      }
    } catch {
      setTurns((t) => [...t, { role: 'assistant', failed: true, content: errorText(null) }])
    } finally {
      setBusy(false)
    }
  }

  function clearContext() {
    if (!onClearArticle) return
    onClearArticle()
    // The answers above stay on screen, so the thread has to say where they
    // stopped applying.
    if (turns.length > 0) {
      setTurns((t) => [...t, { role: 'note', content: 'संदर्भ लेख काढला' }])
    }
  }

  const prompts = article ? QUICK_PROMPTS : QUICK_PROMPTS_NO_CONTEXT

  return (
    <Overlay
      onClose={onClose}
      labelledBy={TITLE_ID}
      overlayClassName="overlay-drawer"
      panelClassName="drawer"
    >
      <OverlayHeader
        id={TITLE_ID}
        eyebrow="महासंवाद सहाय्यक"
        title="या बातमीबद्दल विचारा"
        onClose={onClose}
      />

      {/* --- Context banner ------------------------------------------------ */}
      <div
        className="shrink-0 border-b px-4 py-2"
        style={{
          borderColor: article ? 'var(--accent-edge)' : 'var(--edge)',
          background: article ? 'var(--accent-soft)' : 'var(--surface-2)',
        }}
      >
        <div className="flex items-center gap-2">
          <IconSparkle
            size={13}
            className="shrink-0"
            style={{ color: article ? 'var(--accent)' : 'var(--faint)' }}
          />
          <div className="min-w-0 grow">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span
                className="eyebrow shrink-0 text-[0.625rem]"
                style={{ color: article ? 'var(--accent)' : 'var(--muted)' }}
              >
                संदर्भ लेख:
              </span>
              <span
                className="truncate text-xs font-medium"
                style={{ color: article ? 'var(--text-primary)' : 'var(--muted)' }}
              >
                {article ? article.title : 'निवडलेला नाही — सर्वसाधारण प्रश्न'}
              </span>
            </div>
          </div>
          {article && onClearArticle && (
            <button
              type="button"
              className="btn-quiet btn-sm btn-icon h-6 w-6 shrink-0"
              onClick={clearContext}
              aria-label="संदर्भ लेख काढा"
              title="संदर्भ लेख काढा"
            >
              <IconClose size={12} />
            </button>
          )}
        </div>
      </div>

      {/* --- Thread -------------------------------------------------------- */}
      <div
        ref={thread}
        className="scroll-slim flex-1 min-h-0 overflow-y-auto"
      >
        {turns.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <div
              className="mb-3 flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              <IconSparkle size={20} />
            </div>
            <h3 className="display text-base font-semibold" style={{ color: 'var(--ink)' }}>
              काय जाणून घ्यायचे आहे?
            </h3>
            <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
              {article
                ? 'उत्तरे फक्त या बातमीतील माहितीवर आधारित असतील.'
                : 'एखादी बातमी उघडून विचारल्यास उत्तरे त्या बातमीपुरती मर्यादित राहतील.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {turns.map((t, i) =>
              t.role === 'note' ? (
                <div key={i} className="flex items-center gap-2 py-1">
                  <span className="hairline grow" />
                  <span className="shrink-0 text-[0.6875rem]" style={{ color: 'var(--faint)' }}>
                    {t.content}
                  </span>
                  <span className="hairline grow" />
                </div>
              ) : (
                <div
                  key={i}
                  className={
                    t.role === 'user'
                      ? 'bubble bubble-user'
                      : t.failed
                        ? 'bubble bubble-error'
                        : 'bubble bubble-ai'
                  }
                >
                  {t.content}
                </div>
              ),
            )}

            {busy && (
              <div className="bubble bubble-ai" aria-label="उत्तर तयार होत आहे">
                <span className="typing"><span /><span /><span /></span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- Quick prompts and composer ------------------------------------ */}
      <div
        className="shrink-0 border-t"
        style={{ borderColor: 'var(--edge)', background: 'var(--surface)' }}
      >
        {/* Suggested questions container */}
        <div className="px-4 pt-2.5 pb-1">
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto py-1">
            {prompts.map((p) => (
              <button
                key={p}
                type="button"
                className="chip-action shrink-0 whitespace-nowrap text-xs"
                onClick={() => send(p)}
                disabled={busy}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Input composer */}
        <div className="px-4 pb-3 pt-1">
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => { e.preventDefault(); send(draft) }}
          >
            <input
              className="field grow"
              style={{ height: '2.5rem' }}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="तुमचा प्रश्न लिहा…"
              aria-label="प्रश्न"
              disabled={busy}
            />
            <button
              type="submit"
              className="btn-primary btn-icon shrink-0"
              style={{ height: '2.5rem', width: '2.5rem' }}
              disabled={busy || draft.trim() === ''}
              aria-label="पाठवा"
            >
              <IconSend size={15} />
            </button>
            {turns.length > 0 && (
              <button
                type="button"
                className="btn-quiet btn-icon shrink-0"
                style={{ height: '2.5rem', width: '2.5rem' }}
                onClick={() => setTurns([])}
                disabled={busy}
                aria-label="संभाषण साफ करा"
                title="संभाषण साफ करा"
              >
                <IconTrash size={15} />
              </button>
            )}
          </form>

          <p className="hint mt-2 text-[0.6875rem] leading-tight" style={{ color: 'var(--muted)' }}>
            उत्तरे स्वयंचलितपणे तयार केली जातात. अधिकृत माहितीसाठी मूळ बातमी पहा.
          </p>
        </div>
      </div>
    </Overlay>
  )
}
