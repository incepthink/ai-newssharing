'use client'

import { useCallback, useEffect, useRef, type ReactNode } from 'react'

/**
 * The scrim every floating panel on this page sits on.
 *
 * Written once rather than three times because the parts that are easy to get
 * wrong are the parts nobody sees: Escape closes, a click on the scrim closes
 * but a click inside does not, the page behind stops scrolling while it is
 * open, focus moves into the panel and returns to whatever opened it, and Tab
 * cannot walk out of the panel into the page underneath.
 *
 * `labelledBy` points at the heading inside the panel, so a screen reader
 * announces "संदर्भ लेख…" rather than "dialog".
 */
export function Overlay({
  onClose,
  labelledBy,
  panelClassName,
  overlayClassName,
  children,
}: {
  onClose: () => void
  labelledBy: string
  /** `sheet` or `drawer` — the panel classes from globals.css. */
  panelClassName: string
  overlayClassName?: string
  children: ReactNode
}) {
  const panel = useRef<HTMLDivElement>(null)
  // Captured on mount: the element that had focus when the panel opened, which
  // is the button that opened it, and where focus belongs when it closes.
  const opener = useRef<HTMLElement | null>(null)

  useEffect(() => {
    opener.current = document.activeElement as HTMLElement | null
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    // Focus the panel itself rather than its first control: landing on a close
    // button and landing on "the dialog" read very differently when announced.
    panel.current?.focus()

    return () => {
      document.body.style.overflow = overflow
      opener.current?.focus?.()
    }
  }, [])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panel.current) return

      const focusable = panel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (e.shiftKey && (active === first || active === panel.current)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    },
    [onClose],
  )

  return (
    <div
      className={`overlay ${overlayClassName || ''} m-0`.trim()}
      // A mousedown that starts inside the panel and ends on the scrim — the
      // tail of a text selection — must not close it, so the scrim listens for
      // the press rather than the click, and only when it is the target.
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={panelClassName}
        onKeyDown={onKeyDown}
        style={{ outline: 'none' }}
      >
        {children}
      </div>
    </div>
  )
}

/**
 * The bar across the top of a panel: a title, and the way out.
 *
 * Sticky rather than scrolling away — in a 2,000-word article the close button
 * being three screens up is the single most common complaint about reader
 * views of this kind.
 */
export function OverlayHeader({
  id,
  eyebrow,
  title,
  onClose,
  children,
}: {
  id: string
  eyebrow?: string
  title: ReactNode
  onClose: () => void
  children?: ReactNode
}) {
  return (
    <div
      className="sticky top-0 z-10 flex shrink-0 items-start gap-3 border-b px-4 py-3 sm:px-5"
      style={{ borderColor: 'var(--edge)', background: 'var(--surface)' }}
    >
      <div className="min-w-0 grow">
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h2 id={id} className="display text-[0.9375rem] leading-snug">
          {title}
        </h2>
        {children}
      </div>
      <button
        type="button"
        className="btn-quiet btn-sm btn-icon shrink-0"
        onClick={onClose}
        aria-label="बंद करा"
      >
        <CloseGlyph />
      </button>
    </div>
  )
}

function CloseGlyph() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" aria-hidden="true" focusable="false">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  )
}
