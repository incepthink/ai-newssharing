'use client'

import { useEffect, useRef, useState } from 'react'
import { IconCamera } from '@/components/ui'

/**
 * A story's photograph, or the frame where one would be.
 *
 * The photographs are the directorate's own, hot-linked from mahasamvad.in, so
 * a plain `<img>` rather than `next/image` — see the note in `dgipr-panel.tsx`.
 * Somebody else's host can drop a file, so a broken load falls back to the
 * same hatched plate a story without a photo gets; a torn-image icon on a
 * government page reads as the page being broken.
 *
 * The wrapper takes its size from `className`; the image covers it.
 */
export function StoryPhoto({
  src,
  credit,
  size = 'sm',
  chip = false,
  chipClassName = '',
  eager = false,
  fill = false,
  className = '',
}: {
  src: string | null | undefined
  credit?: string | null
  /** `lg` says in words that there is no photograph; smaller frames only
   *  draw the camera. */
  size?: 'lg' | 'md' | 'sm'
  /** Print the credit on the photo. Off for thumbnails too small to carry
   *  it legibly, where it goes in the tooltip instead. */
  chip?: boolean
  chipClassName?: string
  eager?: boolean
  /** Cover the positioned parent instead of taking a size from `className`. */
  fill?: boolean
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const img = useRef<HTMLImageElement>(null)

  /* An image that failed before hydration fired its error event before React
     was listening, so ask the element directly — on mount, and again for each
     new `src`, which also clears a failure left over from the previous one. */
  useEffect(() => {
    const el = img.current
    setFailed(Boolean(el && el.complete && el.naturalWidth === 0))
  }, [src])

  const shown = Boolean(src) && !failed
  const creditLine = credit ? `छायाचित्र: ${credit}` : undefined

  return (
    <div className={`${fill ? 'absolute inset-0' : 'relative'} overflow-hidden ${shown ? 'bg-sunk' : 'photo-plate'} ${className}`}>
      {shown ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={img}
            src={src!}
            alt=""
            title={chip ? undefined : creditLine}
            loading={eager ? 'eager' : 'lazy'}
            fetchPriority={eager ? 'high' : undefined}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
          {chip && creditLine && (
            <span
              className={`absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] truncate rounded-full px-2.5 py-0.5 text-[0.6875rem] text-secondary ${chipClassName}`}
              style={{ background: 'rgb(255 255 255 / 0.88)' }}
            >
              {creditLine}
            </span>
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5" aria-hidden>
          <IconCamera size={size === 'lg' ? 40 : size === 'md' ? 26 : 18} strokeWidth={1.4} />
          {size === 'lg' && <span className="text-[0.8125rem]">छायाचित्र उपलब्ध नाही</span>}
        </div>
      )}
    </div>
  )
}
