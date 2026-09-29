'use client'

import { useEffect, useRef, useState } from 'react'
import { IconCamera, IconPlay } from '@/components/ui'

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
 *
 * A story with a video gets a play mark over its frame, so a reader scanning
 * the list can tell which ones have footage. Where there is a video and no
 * photograph, the video's own opening frame stands in as the still — it is
 * the story's own picture, not a stand-in.
 */
export function StoryPhoto({
  src,
  video,
  size = 'sm',
  eager = false,
  fill = false,
  className = '',
}: {
  src: string | null | undefined
  video?: string | null
  /** `lg` says in words that there is no photograph; smaller frames only
   *  draw the camera. */
  size?: 'lg' | 'md' | 'sm'
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
  const still = !shown && Boolean(video)
  const badge = size === 'lg' ? 'h-14 w-14' : size === 'md' ? 'h-10 w-10' : 'h-7 w-7'

  return (
    <div
      className={`${fill ? 'absolute inset-0' : 'relative'} overflow-hidden ${shown ? 'bg-sunk' : still ? 'bg-black' : 'photo-plate'} ${className}`}
    >
      {video && (
        <span className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center" aria-hidden>
          <span className={`flex items-center justify-center rounded-full text-white ${badge}`} style={{ background: 'rgb(0 0 0 / 0.55)' }}>
            <IconPlay size={size === 'lg' ? 22 : size === 'md' ? 16 : 12} />
          </span>
        </span>
      )}
      {still ? (
        /* `#t=0.1` asks for a frame just past the start: some browsers paint
           nothing for frame zero until playback begins. */
        <video
          src={`${video}#t=0.1`}
          preload="metadata"
          muted
          playsInline
          tabIndex={-1}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : shown ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={img}
            src={src!}
            alt=""
            loading={eager ? 'eager' : 'lazy'}
            fetchPriority={eager ? 'high' : undefined}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
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
