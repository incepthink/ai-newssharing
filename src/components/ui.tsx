import type { ReactNode, SVGProps } from 'react'
import type { Category, Language, Status } from '@/lib/types'

/* ============================================================================
   The pieces every screen is built from.

   Two rules hold the product together, and they live here rather than in each
   page: a status is always the same colour and the same word, and a thing that
   is missing always looks like a gap rather than like a value. Pages that
   render their own badges drift within a week; pages that call these cannot.
   ========================================================================= */

/* --- Icons ----------------------------------------------------------------
   Stroked, 1.5px, on a 24 grid, currentColor. A small set drawn to one recipe
   reads as a family; mixing icon packs is the fastest way to make an interface
   look assembled rather than designed.
   ------------------------------------------------------------------------ */

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Icon({ size = 16, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IconPen = (p: IconProps) => (
  <Icon {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></Icon>
)
export const IconInbox = (p: IconProps) => (
  <Icon {...p}><path d="M3 13h4l1.5 3h7L17 13h4" /><path d="M5.5 5h13l2.5 8v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5Z" /></Icon>
)
export const IconLayers = (p: IconProps) => (
  <Icon {...p}><path d="m12 3 8 4.5-8 4.5-8-4.5Z" /><path d="m4 12.5 8 4.5 8-4.5" /><path d="m4 17 8 4.5 8-4.5" /></Icon>
)
export const IconShare = (p: IconProps) => (
  <Icon {...p}><circle cx="18" cy="5" r="2.6" /><circle cx="6" cy="12" r="2.6" /><circle cx="18" cy="19" r="2.6" /><path d="m8.4 10.8 7.2-4.1M8.4 13.2l7.2 4.1" /></Icon>
)
export const IconMapPin = (p: IconProps) => (
  <Icon {...p}><path d="M20 10c0 5.2-8 12-8 12s-8-6.8-8-12a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.8" /></Icon>
)
export const IconSearch = (p: IconProps) => (
  <Icon {...p}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></Icon>
)
export const IconDownload = (p: IconProps) => (
  <Icon {...p}><path d="M12 3v11" /><path d="m7.5 10 4.5 4.5L16.5 10" /><path d="M4 20h16" /></Icon>
)
export const IconCopy = (p: IconProps) => (
  <Icon {...p}><rect x="8.5" y="8.5" width="12" height="12" rx="2.2" /><path d="M15.5 5.5H5.8A2.3 2.3 0 0 0 3.5 7.8v9.7" /></Icon>
)
export const IconCheck = (p: IconProps) => (
  <Icon {...p}><path d="m4.5 12.5 5 5 10-11" /></Icon>
)
export const IconCheckCircle = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="m8 12.2 2.8 2.8L16 9.5" /></Icon>
)
export const IconClock = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5.2l3.2 2" /></Icon>
)
export const IconArchive = (p: IconProps) => (
  <Icon {...p}><rect x="3.5" y="4.5" width="17" height="4" rx="1.2" /><path d="M5.5 8.5v10a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-10" /><path d="M10 12.5h4" /></Icon>
)
export const IconAlert = (p: IconProps) => (
  <Icon {...p}><path d="M12 4.5 21 19.5H3Z" /><path d="M12 10v4" /><path d="M12 17h.01" /></Icon>
)
export const IconSparkle = (p: IconProps) => (
  <Icon {...p}><path d="M12 3.5 13.8 9l5.7 1.9-5.7 1.9L12 18.5l-1.8-5.7L4.5 11 10.2 9Z" /><path d="M18.5 4v3M20 5.5h-3" /></Icon>
)
export const IconChevronUp = (p: IconProps) => (
  <Icon {...p}><path d="m6 14.5 6-6 6 6" /></Icon>
)
export const IconChevronDown = (p: IconProps) => (
  <Icon {...p}><path d="m6 9.5 6 6 6-6" /></Icon>
)
export const IconArrowLeft = (p: IconProps) => (
  <Icon {...p}><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></Icon>
)
export const IconArrowRight = (p: IconProps) => (
  <Icon {...p}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></Icon>
)
export const IconClose = (p: IconProps) => (
  <Icon {...p}><path d="m6 6 12 12M18 6 6 18" /></Icon>
)
export const IconWhatsApp = ({ size = 16, ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...rest}>
    <path d="M12.04 2.5A9.42 9.42 0 0 0 2.6 11.9c0 1.66.44 3.28 1.26 4.7L2.5 21.5l5.05-1.32a9.4 9.4 0 0 0 4.49 1.14h.01a9.42 9.42 0 0 0 9.44-9.4 9.35 9.35 0 0 0-2.76-6.65 9.34 9.34 0 0 0-6.69-2.77Zm0 17.24h-.01a7.83 7.83 0 0 1-3.98-1.09l-.28-.17-2.96.77.79-2.88-.19-.3a7.77 7.77 0 0 1-1.2-4.17 7.83 7.83 0 0 1 7.84-7.81c2.09 0 4.06.81 5.54 2.29a7.76 7.76 0 0 1 2.29 5.53 7.83 7.83 0 0 1-7.84 7.83Zm4.3-5.86c-.24-.12-1.4-.68-1.61-.76-.22-.08-.38-.12-.54.12-.16.24-.62.76-.76.92-.14.16-.28.18-.52.06-.24-.12-1-.37-1.9-1.17-.7-.62-1.18-1.4-1.32-1.63-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.1.16 1.52.1.46-.07 1.4-.57 1.6-1.13.2-.55.2-1.03.14-1.13-.06-.1-.22-.16-.46-.28Z" />
  </svg>
)
export const IconEmblem = ({ size = 16, ...rest }: IconProps) => (
  <Icon {...rest} size={size}><path d="M12 2.5 4 6v6.2c0 4.6 3.4 8.2 8 9.3 4.6-1.1 8-4.7 8-9.3V6Z" /><path d="M12 7.5v8M8.5 11h7" /></Icon>
)

/* --- Page header ---------------------------------------------------------- */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0 max-w-2xl">
        {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
        <h1 className="display text-[1.75rem]">{title}</h1>
        {description && (
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

/* --- Status vocabulary ----------------------------------------------------
   One word and one colour per status, decided here and nowhere else.
   ------------------------------------------------------------------------ */

export const STATUS_LABEL: Record<Status, string> = {
  pending: 'प्रलंबित',
  approved: 'मंजूर',
  parked: 'राखीव',
}

const STATUS_CLASS: Record<Status, string> = {
  pending: 'badge-warn',
  approved: 'badge-ok',
  parked: 'badge-hold',
}

const STATUS_TINT: Record<Status, string> = {
  pending: 'var(--warn)',
  approved: 'var(--ok)',
  parked: 'var(--hold)',
}

export function statusTint(s: Status) {
  return STATUS_TINT[s]
}

export function StatusBadge({ status, icon = true }: { status: Status; icon?: boolean }) {
  const I = status === 'approved' ? IconCheckCircle : status === 'pending' ? IconClock : IconArchive
  return (
    <span className={`badge ${STATUS_CLASS[status]}`}>
      {icon && <I size={11} />}
      {STATUS_LABEL[status]}
    </span>
  )
}

export const LANG_LABEL: Record<string, string> = { mr: 'मराठी', hi: 'हिन्दी', en: 'English' }

export function LangBadge({ language }: { language: Language | string }) {
  return <span className="badge">{LANG_LABEL[language] ?? language}</span>
}

export function CategoryBadge({ category }: { category: Category }) {
  if (category !== 'cm') return null
  return <span className="badge badge-accent">मुख्यमंत्री / मंत्रिमंडळ</span>
}

/**
 * The district, or the fact that there isn't one. An unresolved district is
 * the desk's single most common piece of unfinished business, so it is drawn
 * as a dashed gap rather than as grey text that reads like a value.
 */
export function DistrictBadge({ district, name }: { district: string | null; name?: string }) {
  if (!district) return <span className="badge badge-missing">जिल्हा नाही</span>
  return <span className="badge">{name ?? district}</span>
}

/* --- Empty and loading ---------------------------------------------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && (
        <div
          className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-full"
          style={{ background: 'var(--surface-sunk)', color: 'var(--faint)' }}
        >
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/** Rows the shape of the rows that are coming, so the page does not jump. */
export function RowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="row-list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="row">
          <div className="skeleton h-3.5 w-[42%]" />
          <div className="skeleton mt-2.5 h-2.5 w-[76%]" />
          <div className="mt-3 flex gap-1.5">
            <div className="skeleton h-4 w-16 rounded-full" />
            <div className="skeleton h-4 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* --- Numbers -------------------------------------------------------------- */

export function StatCard({
  label,
  value,
  sub,
  tint,
}: {
  label: string
  value: string | number
  sub?: string
  tint?: string
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-1.5">
        {tint && <span className="dot" style={{ background: tint }} />}
        <div className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{label}</div>
      </div>
      <div className="num mt-1.5 text-2xl font-semibold leading-none">{value}</div>
      {sub && <div className="mt-1.5 text-xs" style={{ color: 'var(--faint)' }}>{sub}</div>}
    </div>
  )
}

/** A search box with the glyph inside it rather than a label above it. */
export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="relative">
      <IconSearch
        size={15}
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--faint)' }}
      />
      <input
        className="field field-search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="शोध साफ करा"
          className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded"
          style={{ color: 'var(--faint)' }}
        >
          <IconClose size={13} />
        </button>
      )}
    </div>
  )
}
