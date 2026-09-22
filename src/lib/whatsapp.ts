import type { Article, Language } from './types'
import { datelineEn, datelineMr, foldDateMr } from './marathi'

/**
 * WhatsApp message builder. Format taken from dgipr-whatsapp-2026-09-02.txt —
 * see WHATSAPP-FORMAT.md. Do not redesign this; the desk recognises it.
 */

const HEADER_RULE = '-----------'
const ARTICLE_RULE = '──────────────'

/**
 * WhatsApp's hard technical message payload limit is 65,536 characters.
 * We enforce this protocol ceiling (with a safety margin for framing)
 * so the day's fold stays as ONE continuous message under all normal conditions.
 * We split strictly at article boundaries and never mid-article only if
 * this technical ceiling is exceeded.
 */
const WHATSAPP_MAX_CHARS = 65000

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

/** The name of an article's Word copy: `ms-216059.docx`, `ms-216059-en.docx`. */
export function docxFilename(a: Pick<Article, 'id' | 'release_no' | 'language'>): string {
  const suffix = a.language === 'mr' ? '' : `-${a.language}`
  const id = a.release_no ?? String(a.id)
  return `ms-${id}${suffix}.docx`
}

/**
 * The inverse of docxFilename — how /dgipr/docs/[file] finds the article again.
 * `key` is a release_no, or an id for the articles that have no release_no.
 * Returns null for anything this builder would never have produced.
 */
export function parseDocxFilename(file: string): { key: string; language: Language } | null {
  const m = /^ms-(.+?)(?:-(mr|hi|en))?\.docx$/i.exec(file)
  if (!m) return null
  return { key: m[1], language: (m[2]?.toLowerCase() as Language) ?? 'mr' }
}

function docxUrl(a: Article, baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, '')}/dgipr/docs/${docxFilename(a)}`
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
    if (current.length + b.length > WHATSAPP_MAX_CHARS && current !== head + '\n') {
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
