import Link from 'next/link'
import { IconChevronRight } from '@/components/ui'

export interface Crumb {
  label: string
  /** Omitted on the last crumb — the page you are already on. */
  href?: string
}

/**
 * मुख्य पृष्ठ › News › <headline>
 *
 * A trail rather than a back button: a reader who arrived from a forwarded
 * WhatsApp link has no history to go back to, and "back" would strand them.
 * The list is ordered, so it is an `<ol>`; the separators are drawn rather
 * than typed, so a screen reader reads three names and not three chevrons.
 */
export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  return (
    <nav aria-label="पथदर्शिका">
      <ol className="crumbs">
        {trail.map((c, i) => (
          <li key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && (
              <IconChevronRight size={12} style={{ color: 'var(--faint)' }} aria-hidden />
            )}
            {c.href ? (
              <Link href={c.href}>{c.label}</Link>
            ) : (
              <span aria-current="page" title={c.label}>{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
