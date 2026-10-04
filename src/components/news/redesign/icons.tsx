import type { ReactNode, SVGProps } from 'react'

/**
 * The redesign's glyphs, drawn from the artboard's own paths: stroked,
 * currentColor, on a 24 grid. Decorative everywhere — the control beside each
 * one carries the words.
 */

type P = SVGProps<SVGSVGElement> & { size?: number }

function G({ size = 18, strokeWidth = 1.9, children, ...rest }: P & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
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

export const ISpeaker = (p: P) => (
  <G {...p}><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" /><path d="M15.5 9a4 4 0 0 1 0 6" /><path d="M18 6.5a7.5 7.5 0 0 1 0 11" /></G>
)
export const ICopy = (p: P) => (
  <G {...p}><rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2" /><path d="M15.5 8.5V5.5a1.5 1.5 0 0 0-1.5-1.5H5.5A1.5 1.5 0 0 0 4 5.5V14a1.5 1.5 0 0 0 1.5 1.5h3" /></G>
)
export const IShare = (p: P) => (
  <G {...p}><circle cx="18" cy="5.5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="18.5" r="2.5" /><path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1" /></G>
)
export const IDownload = (p: P) => (
  <G {...p}><path d="M12 4v11" /><path d="m7 10 5 5 5-5" /><path d="M5 20h14" /></G>
)
export const ISearch = (p: P) => (
  <G {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4" /></G>
)
export const ISitemap = (p: P) => (
  <G {...p}><rect x="9" y="3" width="6" height="5" rx="1" /><rect x="3" y="16" width="6" height="5" rx="1" /><rect x="15" y="16" width="6" height="5" rx="1" /><path d="M12 8v4M6 16v-4h12v4" /></G>
)
export const IPin = (p: P) => (
  <G {...p}><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></G>
)
export const IHome = (p: P) => (
  <G {...p}><path d="M4 20V9l8-5 8 5v11" /><path d="M9 20v-6h6v6" /></G>
)
export const IShield = (p: P) => (
  <G {...p}><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.3 7.5 9.5 4.3-1.2 7.5-4.9 7.5-9.5V6z" /><path d="m8.8 12.2 2.3 2.3 4.3-4.6" /></G>
)
export const IChat = (p: P) => (
  <G {...p}><path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.1A8 8 0 1 1 20 12z" /><path d="M8.5 11h7M8.5 14h4.5" /></G>
)
export const IArchive = (p: P) => (
  <G {...p}><path d="M3 21h18" /><path d="M5 21V10h14v11" /><path d="M12 3 4 8h16z" /><path d="M9 21v-7M15 21v-7" /></G>
)
export const ISend = (p: P) => (
  <G {...p}><path d="M4 12 20 4l-5 16-3-7z" /><path d="m12 13 8-9" /></G>
)
export const IArrowRight = (p: P) => (
  <G {...p}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></G>
)
export const IArrowLeft = (p: P) => (
  <G {...p}><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></G>
)
export const IClose = (p: P) => (
  <G {...p}><path d="M6 6l12 12" /><path d="M18 6 6 18" /></G>
)
export const ICheckCircle = (p: P) => (
  <G {...p}><circle cx="12" cy="12" r="9" /><path d="m8 12.5 2.7 2.7L16.5 9.5" /></G>
)
export const IWarn = (p: P) => (
  <G {...p}><path d="M12 3.5 21.5 20h-19z" /><path d="M12 10v4.5M12 17.2v.1" /></G>
)
export const IXCircle = (p: P) => (
  <G {...p}><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></G>
)
export const ICheck = (p: P) => (
  <G {...p}><path d="m5 12 5 5 9-10" /></G>
)

export const IPlay = ({ size = 16, ...rest }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...rest}>
    <path d="M7 4.5v15l12.5-7.5z" />
  </svg>
)
export const IPause = ({ size = 16, ...rest }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...rest}>
    <rect x="6" y="4.5" width="4" height="15" rx="1" />
    <rect x="14" y="4.5" width="4" height="15" rx="1" />
  </svg>
)
