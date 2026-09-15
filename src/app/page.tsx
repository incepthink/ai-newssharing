import Link from 'next/link'
import { foldArticles, listArticles } from '@/lib/db'
import { foldWeekdayLineMr, todayIso, toDevanagariDigits } from '@/lib/marathi'
import { DISTRICTS, districtName } from '@/lib/districts'
import {
  IconArrowRight,
  IconInbox,
  IconLayers,
  IconMapPin,
  IconPen,
  IconShare,
  IconSparkle,
  StatCard,
  StatusBadge,
} from '@/components/ui'
import type { Article } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * The front door.
 *
 * It used to be three links. Three links is not a home page for a news desk —
 * the first question anyone has on opening this is "what is waiting for me",
 * and that is a number, not a menu. So the roles stay, but the day's state
 * arrives first: what is queued, what the desk has cleared, how much of the
 * state has filed today.
 *
 * Rendered on the server against the database directly; there is no client
 * state on this page and nothing here is worth a round trip.
 */

const ROLES = [
  {
    href: '/dlo',
    Icon: IconPen,
    title: 'जिल्हा माहिती अधिकारी',
    sub: 'DLO',
    desc: 'लेख जसाच्या तसा पेस्ट करा. शीर्षक, भाषा आणि जिल्हा आपोआप ओळखले जातील.',
    cta: 'लेख पाठवा',
  },
  {
    href: '/desk',
    Icon: IconInbox,
    title: 'वृत्त विभाग',
    sub: 'News Desk',
    desc: 'रांग तपासा, दुरुस्त करा, मुख्यमंत्री वृत्त वेगळे करा, वृत्त क्रमांक द्या आणि मंजूर करा.',
    cta: 'रांग उघडा',
  },
  {
    href: '/share',
    Icon: IconShare,
    title: 'वितरण',
    sub: 'Anyone else',
    desc: 'मंजूर लेखांचा तयार व्हॉट्सॲप संदेश, किंवा संपूर्ण दिवसाचा फोल्ड.',
    cta: 'संदेश तयार करा',
  },
]

const FLOW = [
  { Icon: IconPen, label: 'जिल्ह्यातून लेख', note: 'DLO पेस्ट करतो' },
  { Icon: IconSparkle, label: 'आपोआप ओळख', note: 'शीर्षक · भाषा · जिल्हा' },
  { Icon: IconInbox, label: 'डेस्कची तपासणी', note: 'दुरुस्ती · वर्ग · मंजुरी' },
  { Icon: IconLayers, label: 'दिवसाचा फोल्ड', note: 'एकच DOCX' },
  { Icon: IconShare, label: 'वितरण', note: 'व्हॉट्सॲप · नकाशा' },
]

export default async function Home() {
  const today = todayIso()
  const pending = await listArticles({ status: 'pending' })
  const fold = await foldArticles(today)
  const parked = await listArticles({ status: 'parked' })
  const districtsToday = new Set(fold.map((a) => a.district).filter(Boolean)).size
  const recent = (await listArticles({})).slice(0, 5)

  return (
    <div className="space-y-10">
      {/* --- The day ------------------------------------------------------- */}
      <section className="card overflow-hidden">
        <div className="h-1" style={{ background: 'var(--accent)' }} />
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-center">
          <div>
            <div className="eyebrow">{foldWeekdayLineMr(today)}</div>
            <h1 className="display mt-2 text-[2.25rem] leading-[1.15]">NewsSharing</h1>
            <p className="mt-3 max-w-xl text-[0.9375rem] leading-relaxed" style={{ color: 'var(--muted)' }}>
              जिल्ह्यातून आलेला लेख, डेस्कची तपासणी, दिवसाचा फोल्ड आणि वितरण — एकाच ठिकाणी.
              ईमेलची साखळी नाही.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/dlo" className="btn-primary btn-lg">
                <IconPen size={15} /> लेख पाठवा
              </Link>
              <Link href="/desk" className="btn-ghost btn-lg">
                <IconInbox size={15} /> रांग उघडा
                {pending.length > 0 && (
                  <span
                    className="num ml-0.5 rounded-full px-1.5 py-0.5 text-[0.6875rem] font-semibold"
                    style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}
                  >
                    {toDevanagariDigits(pending.length)}
                  </span>
                )}
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3">
            <StatCard
              label="प्रलंबित"
              value={toDevanagariDigits(pending.length)}
              sub="डेस्कच्या तपासणीसाठी"
              tint="var(--warn)"
            />
            <StatCard
              label="आज मंजूर"
              value={toDevanagariDigits(fold.length)}
              sub="आजच्या फोल्डमध्ये"
              tint="var(--ok)"
            />
            <StatCard
              label="राखीव"
              value={toDevanagariDigits(parked.length)}
              sub="नंतर पाहायचे"
              tint="var(--hold)"
            />
            <StatCard
              label="जिल्हे"
              value={`${toDevanagariDigits(districtsToday)} / ${toDevanagariDigits(DISTRICTS.length)}`}
              sub="आज नोंद झालेले"
              tint="var(--seq-450)"
            />
          </div>
        </div>
      </section>

      {/* --- Who you are --------------------------------------------------- */}
      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <h2 className="text-sm font-semibold">तुम्ही कोण आहात?</h2>
          <span className="text-xs" style={{ color: 'var(--faint)' }}>
            प्रोटोटाइपमध्ये लॉगिन नाही — भूमिका निवडा
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {ROLES.map(({ href, Icon, title, sub, desc, cta }) => (
            <Link key={href} href={href} className="card-link group flex flex-col p-5">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-[10px]"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                <Icon size={18} />
              </span>
              <div className="mt-3.5 text-[0.9375rem] font-semibold">{title}</div>
              <div className="eyebrow mt-0.5">{sub}</div>
              <p className="mt-2.5 grow text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                {desc}
              </p>
              <span
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: 'var(--accent)' }}
              >
                {cta}
                <IconArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* --- Recent, and the shape of the day ------------------------------ */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* min-w-0 on the grid item, not just on the text inside it: a truncated
            headline is `white-space: nowrap`, so the item's automatic minimum
            size is the full width of the longest headline unless this says
            otherwise — which is how one long English title used to push the
            whole page sideways on a phone. */}
        <div className="card min-w-0">
          <div className="flex items-center justify-between gap-3 border-b px-5 py-3.5" style={{ borderColor: 'var(--edge)' }}>
            <h2 className="text-sm font-semibold">अलीकडे आलेले</h2>
            <Link href="/desk" className="link text-xs">सर्व पहा →</Link>
          </div>
          {recent.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>
              अजून एकही लेख आलेला नाही.
            </p>
          ) : (
            <div className="row-list">
              {recent.map((a: Article) => (
                <Link key={a.id} href={`/desk/${a.id}`} className="row flex items-start gap-3">
                  <div className="min-w-0 grow">
                    <div className="truncate text-sm font-medium">
                      {a.title || <span style={{ color: 'var(--faint)' }}>(शीर्षक नाही)</span>}
                    </div>
                    <div className="mt-1 text-xs" style={{ color: 'var(--faint)' }}>
                      {districtName(a.district)} · {a.fold_date}
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card min-w-0 p-5">
          <h2 className="text-sm font-semibold">एका लेखाचा प्रवास</h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--faint)' }}>
            पाच टप्पे. कोणतीही अंतिम वेळ नाही — उशिरा मंजूर झालेला लेख पुढच्या फोल्डमध्ये जातो.
          </p>
          <ol className="mt-4 space-y-0">
            {FLOW.map(({ Icon, label, note }, i) => (
              <li key={label} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border"
                    style={{ borderColor: 'var(--edge)', background: 'var(--surface-2)', color: 'var(--accent)' }}
                  >
                    <Icon size={14} />
                  </span>
                  {i < FLOW.length - 1 && (
                    <span className="w-px grow" style={{ background: 'var(--edge-strong)' }} />
                  )}
                </div>
                <div className={i < FLOW.length - 1 ? 'pb-4' : ''}>
                  <div className="text-sm font-medium leading-7">{label}</div>
                  <div className="-mt-1 text-xs" style={{ color: 'var(--faint)' }}>{note}</div>
                </div>
              </li>
            ))}
          </ol>
          <Link href="/map" className="btn-ghost btn-sm mt-5 w-full">
            <IconMapPin size={14} /> राज्याचा नकाशा पहा
          </Link>
        </div>
      </section>
    </div>
  )
}
