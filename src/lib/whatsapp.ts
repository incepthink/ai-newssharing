import type { Article } from './types'
import { datelineEn, datelineMr, foldDateMr } from './marathi'

/**
 * WhatsApp message builder. Format taken from dgipr-whatsapp-2026-09-02.txt —
 * see WHATSAPP-FORMAT.md. Do not redesign this; the desk recognises it.
 */

const HEADER_RULE = '-----------'
const ARTICLE_RULE = '──────────────'

/**
 * WhatsApp's hard ceiling is 65,536 characters, but clients get unhappy well
 * before that. We split at article boundaries and never mid-article.
 */
const MAX_CHARS = 3500

export interface ArticleMessage {
  article: Article
  summary: string
}

function header(date: string): string {
  return [
    '*माहिती व जनसंपर्क महासंचालनालय*',
    '',
    '*महत्वाच्या बातम्यांचा सारांश*',
    '',
    `*${foldDateMr(date)}*`,
    HEADER_RULE,
  ].join('\n')
}

function docxUrl(a: Article, baseUrl: string): string {
  const suffix = a.language === 'mr' ? '' : `-${a.language}`
  const id = a.release_no ?? String(a.id)
  return `${baseUrl.replace(/\/$/, '')}/dgipr/docs/ms-${id}${suffix}.docx`
}

function block({ article: a, summary }: ArticleMessage, baseUrl: string): string {
  const lines: string[] = []

  lines.push(`*${a.title}*`)
  if (a.attribution) lines.push(a.attribution.replace(/^[–—-]\s*/, '-'))
  for (const b of a.bullets) lines.push(`• ${b}`)
  lines.push('')

  const dl = a.dateline
    ? a.language === 'en'
      ? datelineEn(a.dateline, a.fold_date)
      : datelineMr(a.dateline, a.fold_date)
    : null
  lines.push(dl ? `${dl} ${summary}` : summary)
  lines.push('')

  lines.push('संपादनयोग्य प्रत (DOCX):')
  lines.push(docxUrl(a, baseUrl))
  // The rule follows the link immediately, then one blank line before the
  // next article. Two empty entries, because join() only adds one newline.
  lines.push(ARTICLE_RULE)
  lines.push('')
  lines.push('')

  return lines.join('\n')
}

/**
 * Build the message(s). One message if it fits; otherwise split at article
 * boundaries with the header repeated. No part numbering, no "continued"
 * labels — each chunk is simply a valid message in the same format.
 */
export function buildMessages(
  date: string,
  items: ArticleMessage[],
  baseUrl: string,
): string[] {
  const head = header(date)
  const blocks = items.map((it) => block(it, baseUrl))

  const messages: string[] = []
  let current = head + '\n'

  for (const b of blocks) {
    if (current.length + b.length > MAX_CHARS && current !== head + '\n') {
      messages.push(current.trimEnd())
      current = head + '\n'
    }
    current += b
  }
  if (current.trim() !== head.trim()) messages.push(current.trimEnd())

  return messages.length ? messages : [head]
}

/** wa.me link for a single message chunk. */
export function shareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}
