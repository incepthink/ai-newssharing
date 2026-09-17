'use client'

import { useEffect, useState } from 'react'
import { foldDateMr } from '@/lib/marathi'
import { articleHref, type FeatureArticle } from '@/lib/articles/feature'
import { Overlay, OverlayHeader } from '@/components/articles/Overlay'
import {
  IconCheck,
  IconCopy,
  IconFacebook,
  IconLink,
  IconShare,
  IconWhatsApp,
  IconX,
} from '@/components/ui'

const TITLE_ID = 'share-title'

/**
 * Share one article.
 *
 * The link is the article's own page — `/news/<id>` — rather than a query
 * parameter on the list, so what a recipient opens is what the sender was
 * reading, with its own title and preview.
 *
 * It is built from `window.location.origin` at open time rather than from an
 * environment variable, so a deployment behind a different hostname shares its
 * own hostname and not the one that was compiled in.
 *
 * `navigator.share` is offered as an *additional* button, not as a replacement
 * for the explicit ones. It exists on most phones and almost no desktops, and
 * a sheet whose contents change depending on the device is a sheet nobody can
 * be told how to use over the phone — which, for this audience, matters.
 */
export function ShareSheet({
  article,
  onClose,
}: {
  article: FeatureArticle
  onClose: () => void
}) {
  const [url, setUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [canNativeShare, setCanNativeShare] = useState(false)

  useEffect(() => {
    setUrl(`${window.location.origin}${articleHref(article.id)}`)
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  }, [article.id])

  // What goes out with the link: the headline and the date, so a forwarded
  // message says what it is before anyone taps anything.
  const message = `${article.title}\n${foldDateMr(article.publishedAt)} · महासंवाद\n\n${url}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can be refused outright (insecure origin, denied
      // permission). Selecting the field is the fallback that always works.
      const input = document.getElementById('share-url') as HTMLInputElement | null
      input?.select()
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: article.title, text: article.title, url })
    } catch {
      // A cancelled share sheet rejects too; there is nothing to report.
    }
  }

  return (
    <Overlay onClose={onClose} labelledBy={TITLE_ID} panelClassName="sheet max-w-md">
      <OverlayHeader id={TITLE_ID} eyebrow="शेअर करा" title={article.title} onClose={onClose} />

      <div className="space-y-4 px-4 py-5 sm:px-5">
        <div className="grid grid-cols-2 gap-2">
          <a
            className="btn-ghost"
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <IconWhatsApp size={15} style={{ color: '#25D366' }} /> व्हॉट्सॲप
          </a>
          <a
            className="btn-ghost"
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <IconX size={13} /> X वर पोस्ट करा
          </a>
          {/* Facebook's sharer takes the URL only — it reads the headline off
              the page's own metadata, which `/news/[id]` supplies. */}
          <a
            className="btn-ghost"
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <IconFacebook size={15} style={{ color: '#1877F2' }} /> फेसबुक
          </a>
          <button type="button" className={copied ? 'btn-secondary' : 'btn-ghost'} onClick={copy}>
            {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            {copied ? 'कॉपी झाले' : 'दुवा कॉपी करा'}
          </button>
        </div>

        <div>
          <label className="label" htmlFor="share-url">बातमीचा दुवा</label>
          <input
            id="share-url"
            className="field"
            value={url}
            readOnly
            onFocus={(e) => e.currentTarget.select()}
          />
          <p className="hint">
            <IconLink size={11} className="mr-1 inline-block align-[-1px]" />
            हा दुवा उघडल्यावर हीच बातमी थेट वाचनासाठी उघडेल.
          </p>
        </div>

        {canNativeShare && (
          <button type="button" className="btn-primary btn-block" onClick={nativeShare}>
            <IconShare size={14} /> इतर ॲपवर पाठवा
          </button>
        )}
      </div>
    </Overlay>
  )
}
