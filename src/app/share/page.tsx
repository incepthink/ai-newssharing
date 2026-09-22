'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { districtName } from '@/lib/districts'
import { foldWeekdayLineMr, todayIso, toDevanagariDigits } from '@/lib/marathi'
import type { Article } from '@/lib/types'
import type { Recipient } from '@/lib/db'
import {
  DistrictBadge,
  EmptyState,
  IconCheck,
  IconCopy,
  IconLayers,
  IconMail,
  IconShare,
  IconSparkle,
  IconWhatsApp,
  LangBadge,
  PageHeader,
} from '@/components/ui'

/**
 * Distribution. Pick articles — or the whole fold — and get a WhatsApp message
 * that is ready to send: a 60-word summary per article and a DOCX link.
 *
 * Summaries are generated here, against the approved text, so they reflect what
 * the desk published rather than what the DLO pasted. That call takes a few
 * seconds, which is why the right-hand column says what it is doing instead of
 * going blank: a quiet gap during an AI call reads as a broken button.
 */
export default function SharePage() {
  const [date, setDate] = useState(todayIso())
  const [articles, setArticles] = useState<Article[] | null>(null)
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [messages, setMessages] = useState<string[]>([])
  const [scope, setScope] = useState<'fold' | 'picked' | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<number | null>(null)
  const [emailToast, setEmailToast] = useState<{
    index: number
    type: 'ok' | 'error'
    message: string
  } | null>(null)
  const [mail, setMail] = useState<{ configured: boolean; reason: string | null } | null>(null)
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [openPanel, setOpenPanel] = useState<number | null>(null)
  const [newAddr, setNewAddr] = useState('')
  const [attachDocx, setAttachDocx] = useState(true)
  const [sending, setSending] = useState<number | null>(null)

  const load = useCallback(async (d: string) => {
    setArticles(null)
    setPicked(new Set())
    setMessages([])
    setScope(null)
    try {
      const r = await fetch(`/api/fold/${d}`)
      const data = await r.json()
      setArticles(data.articles)
    } catch {
      setArticles([])
    }
  }, [])

  useEffect(() => { load(date) }, [date, load])

  // SMTP state and the saved list are fetched once — the send button stays
  // disabled with a reason rather than failing after the user has typed.
  useEffect(() => {
    fetch('/api/email')
      .then((r) => r.json())
      .then((d) => setMail({ configured: !!d.configured, reason: d.reason ?? null }))
      .catch(() => setMail({ configured: false, reason: 'सेवा उपलब्ध नाही' }))
    fetch('/api/recipients')
      .then((r) => r.json())
      .then((d) => setRecipients(d.recipients ?? []))
      .catch(() => setRecipients([]))
  }, [])

  function toggle(id: number) {
    setPicked((p) => {
      const n = new Set(p)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  async function build(whole: boolean) {
    setBusy(true)
    setMessages([])
    setScope(whole ? 'fold' : 'picked')
    try {
      const r = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(whole ? { date } : { ids: [...picked], date }),
      })
      const d = await r.json()
      setMessages(d.messages ?? [])
    } finally {
      setBusy(false)
    }
  }

  async function copy(text: string, i: number) {
    await navigator.clipboard.writeText(text)
    setCopied(i)
    setTimeout(() => setCopied(null), 1800)
  }

  async function addAddress() {
    const raw = newAddr.trim()
    if (!raw) return
    try {
      const r = await fetch('/api/recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: raw }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'failed')
      setRecipients(d.recipients ?? [])
      setNewAddr('')
    } catch {
      setEmailToast({
        index: openPanel ?? 0,
        type: 'error',
        message: 'पत्ता जोडता आला नाही. ईमेल पत्ता तपासा.',
      })
    }
  }

  async function dropAddress(email: string) {
    try {
      const r = await fetch(`/api/recipients?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
      })
      const d = await r.json()
      setRecipients(d.recipients ?? [])
    } catch {
      /* the list simply stays as it was */
    }
  }

  /**
   * Sends the message the desk is looking at. The text travels to the server
   * as-is, so the email carries exactly the preview above — no regeneration.
   */
  async function sendEmail(text: string, i: number) {
    setSending(i)
    setEmailToast(null)
    try {
      const r = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          date,
          subject: `DGIPR Daily News Summary - ${date}`,
          attachDocx: attachDocx && scope === 'fold',
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'पाठवता आले नाही')

      setEmailToast({
        index: i,
        type: 'ok',
        message: `${toDevanagariDigits(d.sent ?? 0)} पत्त्यांवर ईमेल पाठवला${
          d.attached?.length ? ' (DOCX जोडले)' : ''
        }.`,
      })
      setOpenPanel(null)
      setTimeout(() => {
        setEmailToast((cur) => (cur?.index === i ? null : cur))
      }, 6000)
    } catch (err) {
      setEmailToast({
        index: i,
        type: 'error',
        message: err instanceof Error ? err.message : 'ईमेल पाठवता आला नाही.',
      })
    } finally {
      setSending(null)
    }
  }

  const list = articles ?? []
  const allPicked = list.length > 0 && picked.size === list.length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="वितरण · Share"
        title="व्हॉट्सॲपवर पाठवा"
        description="संपूर्ण फोल्ड, किंवा निवडक लेख. प्रत्येक लेखाचा ६० शब्दांचा सारांश आणि DOCX दुवा — कॉपी करा किंवा थेट व्हॉट्सॲपवर उघडा."
      />

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {/* --- Pick --------------------------------------------------------- */}
        <div className="card overflow-hidden">
          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-3"
            style={{ borderColor: 'var(--edge)' }}
          >
            <input
              type="date"
              className="field num w-auto"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              aria-label="दिनांक"
            />
            <span className="hidden text-xs sm:block" style={{ color: 'var(--muted)' }}>
              {foldWeekdayLineMr(date)}
            </span>
            {list.length > 0 && (
              <button
                className="btn-quiet btn-sm ml-auto"
                onClick={() => setPicked(allPicked ? new Set() : new Set(list.map((a) => a.id)))}
              >
                {allPicked ? 'निवड रद्द' : 'सर्व निवडा'}
              </button>
            )}
          </div>

          {articles === null ? (
            <div className="space-y-3 p-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-14 w-full rounded-[var(--r-md)]" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <EmptyState
              icon={<IconLayers size={18} />}
              title="या दिवशी मंजूर लेख नाहीत"
              description="फक्त मंजूर लेख पाठवता येतात. दुसरा दिवस निवडा, किंवा डेस्कवर मंजुरी द्या."
              action={<Link href="/desk" className="btn-ghost btn-sm">रांग उघडा</Link>}
            />
          ) : (
            <ul className="row-list max-h-[32rem] overflow-y-auto scroll-slim">
              {list.map((a) => {
                const on = picked.has(a.id)
                return (
                  <li key={a.id}>
                    <label className="row flex cursor-pointer items-start gap-3" data-selected={on}>
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 shrink-0 accent-[color:var(--accent)]"
                        checked={on}
                        onChange={() => toggle(a.id)}
                      />
                      <div className="min-w-0 grow">
                        <div className="display text-[0.875rem] leading-snug">{a.title || '(शीर्षक नाही)'}</div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {a.release_no && <span className="badge num">क्र. {a.release_no}</span>}
                          <LangBadge language={a.language} />
                          <DistrictBadge district={a.district} name={districtName(a.district)} />
                          {a.category === 'cm' && <span className="badge badge-accent">मुख्यमंत्री</span>}
                        </div>
                      </div>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}

          {list.length > 0 && (
            <div
              className="flex flex-wrap items-center gap-2 border-t px-4 py-3"
              style={{ borderColor: 'var(--edge)', background: 'var(--surface-2)' }}
            >
              <button className="btn-primary" onClick={() => build(true)} disabled={busy}>
                <IconLayers size={15} /> संपूर्ण फोल्डचा संदेश
              </button>
              <button className="btn-ghost" onClick={() => build(false)} disabled={busy || picked.size === 0}>
                निवडलेले {toDevanagariDigits(picked.size)} पाठवा
              </button>
            </div>
          )}
        </div>

        {/* --- The message --------------------------------------------------- */}
        <div className="lg:sticky lg:top-[4.5rem]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">तयार संदेश</h2>
            {messages.length > 1 && (
              <span className="badge badge-warn">
                {toDevanagariDigits(messages.length)} भाग — स्वतंत्रपणे पाठवा
              </span>
            )}
          </div>

          {busy ? (
            <div className="card p-5">
              <p className="flex items-center gap-2 text-sm font-medium">
                <IconSparkle size={15} className="animate-pulse" style={{ color: 'var(--accent)' }} />
                {scope === 'fold' ? 'संपूर्ण फोल्डचे सारांश तयार करत आहे…' : 'निवडलेल्या लेखांचे सारांश तयार करत आहे…'}
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--faint)' }}>
                प्रत्येक लेखाचा ६० शब्दांचा सारांश मंजूर मजकुरावरून तयार होतो — थोडा वेळ लागतो.
              </p>
              <div className="mt-4 space-y-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="skeleton h-3" style={{ width: `${92 - i * 9}%` }} />
                ))}
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<IconShare size={18} />}
                title="अजून संदेश तयार नाही"
                description="डावीकडून लेख निवडा, किंवा संपूर्ण फोल्डचा संदेश तयार करा."
              />
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div key={i} className="card fade-in overflow-hidden">
                  {messages.length > 1 && (
                    <div
                      className="border-b px-4 py-2 text-xs font-semibold"
                      style={{ borderColor: 'var(--edge)', background: 'var(--surface-2)', color: 'var(--muted)' }}
                    >
                      भाग {toDevanagariDigits(i + 1)} / {toDevanagariDigits(messages.length)}
                    </div>
                  )}
                  <pre
                    className="scroll-slim max-h-[26rem] overflow-auto whitespace-pre-wrap px-4 py-3.5 text-[0.8125rem] leading-relaxed"
                    style={{ fontFamily: 'var(--font-ui)' }}
                  >
                    {m}
                  </pre>
                  <div
                    className="flex flex-wrap gap-2 border-t px-4 py-3"
                    style={{ borderColor: 'var(--edge)', background: 'var(--surface-2)' }}
                  >
                    <a
                      className="btn-primary btn-sm"
                      href={`https://wa.me/?text=${encodeURIComponent(m)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <IconWhatsApp size={14} /> व्हॉट्सॲपवर उघडा
                    </a>
                    <button className="btn-ghost btn-sm" onClick={() => copy(m, i)}>
                      {copied === i ? (
                        <>
                          <IconCheck size={13} style={{ color: 'var(--ok)' }} /> कॉपी झाले
                        </>
                      ) : (
                        <>
                          <IconCopy size={13} /> कॉपी करा
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={() => setOpenPanel(openPanel === i ? null : i)}
                      disabled={mail !== null && !mail.configured}
                      title={mail && !mail.configured ? (mail.reason ?? '') : undefined}
                    >
                      <IconMail size={14} /> ईमेल करा
                    </button>
                    <span className="num ml-auto self-center text-xs" style={{ color: 'var(--faint)' }}>
                      {toDevanagariDigits(m.length)} अक्षरे
                    </span>
                  </div>

                  {openPanel === i && (
                    <div
                      className="space-y-3 border-t px-4 py-3.5"
                      style={{ borderColor: 'var(--edge)', background: 'var(--surface-2)' }}
                    >
                      <div className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
                        प्रापतकर्ते
                      </div>

                      {recipients.length === 0 ? (
                        <p className="text-xs" style={{ color: 'var(--faint)' }}>
                          अजून एकही पत्ता नाही. खाली जोडा.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {recipients.map((r) => (
                            <span
                              key={r.email}
                              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
                              style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
                            >
                              {r.name ? `${r.name} · ${r.email}` : r.email}
                              <button
                                type="button"
                                onClick={() => dropAddress(r.email)}
                                aria-label={`${r.email} काढून टाका`}
                                style={{ color: 'var(--faint)' }}
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <input
                          type="email"
                          className="input flex-1 text-xs"
                          style={{ minWidth: '14rem' }}
                          placeholder="name@example.gov.in"
                          value={newAddr}
                          onChange={(e) => setNewAddr(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addAddress()
                            }
                          }}
                        />
                        <button type="button" className="btn-ghost btn-sm" onClick={addAddress}>
                          जोडा
                        </button>
                      </div>

                      {scope === 'fold' && (
                        <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
                          <input
                            type="checkbox"
                            checked={attachDocx}
                            onChange={(e) => setAttachDocx(e.target.checked)}
                          />
                          संपूर्ण फोल्डची DOCX प्रत जोडा
                        </label>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          onClick={() => sendEmail(m, i)}
                          disabled={sending === i || recipients.length === 0}
                        >
                          <IconMail size={14} />
                          {sending === i ? 'पाठवत आहे...' : 'पाठवा'}
                        </button>
                        <button
                          type="button"
                          className="btn-quiet text-xs"
                          onClick={() => setOpenPanel(null)}
                        >
                          रद्द करा
                        </button>
                      </div>
                    </div>
                  )}

                  {emailToast && emailToast.index === i && (
                    <div
                      className="flex items-center justify-between gap-2 border-t px-4 py-2.5 text-xs font-medium"
                      style={{
                        background: emailToast.type === 'ok' ? 'var(--ok-soft)' : 'var(--warn-soft)',
                        color: emailToast.type === 'ok' ? 'var(--ok)' : 'var(--warn)',
                        borderColor: 'var(--edge)',
                      }}
                    >
                      <span>{emailToast.message}</span>
                      <button
                        type="button"
                        className="btn-quiet text-xs"
                        onClick={() => setEmailToast(null)}
                        aria-label="बंद करा"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
