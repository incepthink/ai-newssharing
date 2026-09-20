'use client'

import Link from 'next/link'
import { useState } from 'react'
import { foldDateMr } from '@/lib/marathi'
import {
  articleHref,
  categoryLabel,
  departmentLabel,
  districtLabel,
  ministerLabel,
  readingLabel,
  type FeatureArticle,
} from '@/lib/articles/feature'
import { downloadArticleDocx } from '@/lib/articles/export'
import {
  IconAlert,
  IconBookOpen,
  IconCheck,
  IconDownload,
  IconMessage,
  IconShare,
} from '@/components/ui'

/**
 * One article, as a citizen meets it.
 *
 * The card carries four actions, which is three more than an editorial card
 * usually has, so they are set as a toolbar under a rule rather than scattered
 * into the body: below the hairline is what you can *do*, above it is what the
 * article *is*. "वाचा" is the primary one and keeps the maroon; the other three
 * are quiet until hovered, so a grid of nine cards does not read as
 * thirty-six buttons.
 *
 * Reading is a navigation now, not a modal, so the whole plate above the rule
 * is one target: the headline is a real link and its `::after` is stretched
 * over the card. The toolbar is lifted above that overlay, so the three
 * buttons still belong to themselves — a card where "शेअर" quietly opens the
 * article instead is worse than a card you cannot click at all.
 */
export function ArticleCard({
  article,
  onShare,
  onAsk,
}: {
  article: FeatureArticle
  onShare: () => void
  onAsk: () => void
}) {
  const href = articleHref(article.id)

  return (
    <article className="card-link relative flex flex-col overflow-hidden">
      {article.heroImage ? (
        <div
          className="relative aspect-[16/9] w-full overflow-hidden border-b"
          style={{ borderColor: 'var(--edge)', background: 'var(--surface-2)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.heroImage}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      ) : null}
      <div className="flex grow flex-col p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="badge badge-accent">{categoryLabel(article.category)}</span>
          <span className="badge">{departmentLabel(article.department)}</span>
          <span className="badge">{districtLabel(article.district)}</span>
        </div>

        <div className="mt-3 text-xs" style={{ color: 'var(--faint)' }}>
          {foldDateMr(article.publishedAt)} • {readingLabel(article)}
        </div>

        <h3 className="mt-1.5">
          <Link
            href={href}
            className="display text-start text-[1.0625rem] leading-snug after:absolute after:inset-0 hover:underline"
            style={{ textUnderlineOffset: '3px' }}
          >
            {article.title}
          </Link>
        </h3>

        <p
          className="mt-2.5 line-clamp-3 grow text-[0.8125rem] leading-relaxed"
          style={{ color: 'var(--muted)' }}
        >
          {article.excerpt}
        </p>

        <div className="mt-3 text-[0.6875rem]" style={{ color: 'var(--faint)' }}>
          {ministerLabel(article.minister)}
        </div>
      </div>

      <div
        className="relative z-10 flex flex-wrap items-center gap-1 border-t px-3 py-2.5 sm:px-4"
        style={{ borderColor: 'var(--edge)', background: 'var(--surface-2)' }}
      >
        <Link href={href} className="btn-secondary btn-sm">
          <IconBookOpen size={13} /> वाचा
        </Link>
        <DocxButton article={article} />
        <button
          type="button"
          className="btn-quiet btn-sm"
          onClick={onShare}
          aria-label={`शेअर करा — ${article.title}`}
        >
          <IconShare size={13} /> शेअर
        </button>
        <button
          type="button"
          className="btn-quiet btn-sm ml-auto"
          onClick={onAsk}
          aria-label={`या बातमीबद्दल विचारा — ${article.title}`}
        >
          <IconMessage size={13} /> विचारा
        </button>
      </div>
    </article>
  )
}

/**
 * The .docx download.
 *
 * It owns its own state because it is the only action on the card that can
 * fail, and a failed download is otherwise completely silent — the button
 * would just do nothing. Success is marked too: the file lands in a folder the
 * reader is not looking at, so the tick is the only confirmation they get.
 */
export function DocxButton({
  article,
  className = 'btn-quiet btn-sm',
  label = '.docx',
}: {
  article: FeatureArticle
  className?: string
  /** What the button says at rest. The article page has room for a sentence;
   *  a card in a three-across grid does not. */
  label?: string
}) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')

  async function run() {
    setState('busy')
    try {
      await downloadArticleDocx(article)
      setState('done')
      setTimeout(() => setState('idle'), 2200)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 3200)
    }
  }

  const text =
    state === 'busy' ? 'तयार होत आहे…'
      : state === 'done' ? 'डाउनलोड झाले'
        : state === 'error' ? 'पुन्हा प्रयत्न करा'
          : label

  const Glyph = state === 'done' ? IconCheck : state === 'error' ? IconAlert : IconDownload

  return (
    <button
      type="button"
      className={className}
      onClick={run}
      disabled={state === 'busy'}
      aria-label={`वर्ड फाइल उतरवा — ${article.title}`}
      style={state === 'error' ? { color: 'var(--warn)' } : undefined}
    >
      <Glyph size={13} /> {text}
    </button>
  )
}
