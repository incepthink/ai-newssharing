'use client'

import { useState } from 'react'
import type { NewsItem, Verdict } from '@/lib/news/public'
import { ICheckCircle, IShield, IWarn, IXCircle } from './icons'
import { ReadLink } from './triggers'
import { useNewsUi } from './ui'

const HEAD = {
  match: 'अधिकृत — हा मजकूर मंजूर प्रसिद्धीपत्रकाशी जुळतो',
  partial: 'अंशतः जुळतो — मिळतेजुळते अधिकृत प्रसिद्धीपत्रक आहे',
  none: 'अधिकृत नोंदीत सापडले नाही',
} as const

const TONE = {
  match: { bg: 'bg-[#E3F1EA]', ink: 'text-[#1F6B4A]' },
  partial: { bg: 'bg-[#FCEFD9]', ink: 'text-[#7A4A08]' },
  none: { bg: 'bg-[#FBE6E3]', ink: 'text-[#8E2A1E]' },
} as const

function body(v: Verdict, teamLive: boolean): string {
  if (v.kind === 'match') return 'संदेशात बदल केलेला असू शकतो — शंका असल्यास खालील मूळ प्रत वाचून शब्दशः तुलना करा.'
  if (v.kind === 'partial') return 'संदेश तंतोतंत जुळत नाही. आकडे, तारखा आणि नावे मूळ प्रसिद्धीपत्रकाशी तुलना करा.'
  return `${v.no ? `वृत्त क्र. ${v.no} मंजूर नोंदीत नाही. ` : ''}शासनाने असे प्रसिद्धीपत्रक दिलेले नाही. पुढे पाठवण्यापूर्वी थांबा${teamLive ? ' — हवे तर आमच्या फॅक्ट-चेक टीमकडे पडताळणीसाठी पाठवा.' : '.'}`
}

/**
 * फॅक्ट चेक: paste a message or a वृत्त क्र., get back what the approved
 * record holds — a match, a partial match, or nothing. It never rules on
 * whether a claim is true, only on whether the directorate issued it.
 *
 * Sending a message on to a fact-check team waits on DGIPR confirming that
 * function (`FACT_CHECK_TEAM_LIVE`); until then the panel says so instead of
 * pretending to send.
 */
export function FactCheck({ samples, teamLive }: { samples: Array<{ label: string; text: string }>; teamLive: boolean }) {
  const ui = useNewsUi()
  const [text, setText] = useState('')
  const [res, setRes] = useState<{ verdict: Verdict; items: NewsItem[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [sent, setSent] = useState(false)

  async function check(value: string) {
    if (!value.trim() || busy) return
    setBusy(true)
    setFailed(false)
    setSent(false)
    try {
      const r = await fetch('/api/news/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: value }),
      })
      if (!r.ok) throw new Error(String(r.status))
      setRes(await r.json())
    } catch {
      setRes(null)
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  const v = res?.verdict
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center gap-2 text-sm font-bold text-nr-accent-ink">
        <IShield size={18} strokeWidth={2} />
        फॅक्ट चेक
      </div>
      <h2 id="fc-h" className="nr-h m-0 text-[1.6875rem] font-bold leading-[1.3] lg:text-[2.625rem] lg:leading-[1.25]">
        मेसेज खरा आहे का? इथे तपासा
      </h2>
      <p className="m-0 text-[0.9375rem] leading-[1.65] text-[#3A302A] lg:text-[1.0625rem]">
        WhatsApp वर आलेला शासकीय संदेश, बातमी किंवा वृत्त क्रमांक इथे पेस्ट करा. तो मंजूर प्रसिद्धीपत्रकांशी लगेच जुळवून दाखवू.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          check(text)
        }}
        className="flex flex-col gap-2.5"
      >
        <label htmlFor="fc-text" className="text-[0.9375rem] font-bold">
          संदेशाचा मजकूर किंवा वृत्त क्रमांक
        </label>
        <textarea
          id="fc-text"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setRes(null)
            setSent(false)
          }}
          rows={4}
          placeholder="इथे संदेश पेस्ट करा…"
          className="min-h-[120px] w-full resize-y rounded-[14px] border-[1.5px] border-[#DDD3C5] bg-[#FAF7F2] px-4 py-3.5 text-base leading-[1.6] text-[#1D1714]"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={!text.trim() || busy}
            aria-busy={busy}
            className="flex h-[50px] items-center gap-2 rounded-full bg-nr-primary px-[26px] text-base font-bold text-white disabled:opacity-50"
          >
            <IShield size={18} strokeWidth={2} />
            {busy ? 'तपासत आहे…' : 'तपासा'}
          </button>
          {samples.map((x) => (
            <button
              key={x.label}
              type="button"
              onClick={() => {
                setText(x.text)
                check(x.text)
              }}
              className="h-11 rounded-full border border-dashed border-[#BFB3A3] bg-white px-3.5 text-sm text-[#3A302A]"
            >
              {x.label}
            </button>
          ))}
        </div>
      </form>

      <div role="status" aria-live="polite">
        {failed && <p className="m-0 text-[0.9375rem] font-semibold text-nr-primary">तपासता आले नाही — पुन्हा प्रयत्न करा.</p>}
        {v && (
          <div className={`flex flex-col gap-3 rounded-[18px] p-5 ${TONE[v.kind].bg}`}>
            <div className={`flex items-start gap-2.5 text-[1.1875rem] font-extrabold leading-[1.4] ${TONE[v.kind].ink}`}>
              {v.kind === 'match' ? (
                <ICheckCircle size={24} strokeWidth={2.2} className="shrink-0" />
              ) : v.kind === 'partial' ? (
                <IWarn size={24} strokeWidth={2.2} className="shrink-0" />
              ) : (
                <IXCircle size={24} strokeWidth={2.2} className="shrink-0" />
              )}
              <span>{HEAD[v.kind]}</span>
            </div>
            <p className="m-0 text-[0.9375rem] leading-[1.6] text-[#2A221D]">{body(v, teamLive)}</p>
            {res!.items.length > 0 && (
              <div className="flex flex-col gap-2">
                {res!.items.map((c) => (
                  <div key={c.id} className="flex flex-col gap-1 rounded-[14px] bg-white px-4 py-3.5">
                    <span className="text-[0.8125rem] text-[#4A403A]">
                      मंजूर प्रसिद्धीपत्रक · {c.place} · {c.dateLabel} · वृत्त क्र. {c.no ?? 'नाही'}
                    </span>
                    <ReadLink item={c} className="nr-h nr-link text-[1.0625rem] leading-[1.45] lg:text-[1.1875rem]">
                      {c.title}
                    </ReadLink>
                  </div>
                ))}
              </div>
            )}
            {v.kind === 'none' &&
              (teamLive ? (
                sent ? (
                  <p className="m-0 text-[0.9375rem] font-semibold text-[#2A221D]">पडताळणीसाठी पाठवले. निष्कर्ष “अलीकडील फॅक्ट चेक” मध्ये प्रसिद्ध होईल.</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSent(true)
                      ui.flash('पडताळणीसाठी पाठवले')
                    }}
                    className={`h-[46px] self-start rounded-full border-[1.5px] bg-white px-[18px] text-[0.9375rem] font-bold border-[#8E2A1E] text-[#8E2A1E]`}
                  >
                    फॅक्ट-चेक टीमकडे पडताळणीसाठी पाठवा
                  </button>
                )
              ) : (
                <p className="m-0 text-[0.8125rem] leading-[1.6] text-[#4A403A]">
                  फॅक्ट-चेक टीमकडे पाठवण्याची सोय महासंचालनालयाच्या अधिकृत पुष्टीनंतर सुरू होईल.
                </p>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
