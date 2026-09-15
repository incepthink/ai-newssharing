import { Document, Packer, Paragraph } from 'docx'
import type { Article } from '../types'
import { datelineEn, datelineMr, foldDateLineMr, foldWeekdayLineMr } from '../marathi'
import {
  PAGE, blank, bodyLine, centreLine, metaLine, paragraphsOf, run, separator,
} from './common'

/**
 * Render one article as the sequence of paragraphs the fold expects.
 * Shared by the fold generator and the per-article DOCX, so an article
 * downloaded on its own is identical to its page inside the fold.
 *
 * See FOLD-FORMAT.md §4.
 *
 * `isFirst` matters: in the source document the date and weekday lines appear
 * only around the FIRST article's release number — they head the document, not
 * every article. Later articles carry just वृत्त क्र. and the office line.
 */
export function articleParagraphs(a: Article, opts: { isFirst?: boolean } = {}): Paragraph[] {
  const lang = a.language
  const isFirst = opts.isFirst ?? true
  const out: Paragraph[] = []

  if (isFirst) out.push(metaLine(lang, foldDateLineMr(a.fold_date)))
  if (a.release_no) out.push(metaLine(lang, `वृत्त क्र. ${a.release_no}`))
  if (a.office) out.push(metaLine(lang, a.office))
  if (isFirst) out.push(metaLine(lang, foldWeekdayLineMr(a.fold_date)))
  out.push(blank())

  if (a.department) out.push(metaLine(lang, wrapDept(a.department)))

  // Headline: centred, bold, body size. The source has one 14pt headline among
  // six — the dominant pattern is 12pt, and a generated fold should be consistent.
  out.push(centreLine(lang, a.title, { bold: true }))

  if (a.attribution) out.push(metaLine(lang, a.attribution))

  // Sub-heads carry NO bullet character in the document — they are plain
  // centred bold lines. The "•" is a WhatsApp convention only.
  for (const b of a.bullets) out.push(centreLine(lang, b, { bold: true }))

  out.push(blank())

  // The dateline opens the first body paragraph inline — never its own line.
  const paras = paragraphsOf(a.body)
  const dl = a.dateline
    ? lang === 'en'
      ? datelineEn(a.dateline, a.fold_date)
      : datelineMr(a.dateline, a.fold_date)
    : null

  paras.forEach((p, i) => {
    if (i === 0 && dl) {
      out.push(bodyLine(lang, [run(lang, `${dl}  `), run(lang, p)]))
    } else {
      out.push(bodyLine(lang, [run(lang, p)]))
    }
  })

  out.push(separator(lang))

  // Writer credit, e.g. "अश्विनी पुजारी/विसंअ" — sits after the separator.
  if (a.byline) out.push(centreLine(lang, a.byline))

  return out
}

function wrapDept(dept: string): string {
  const t = dept.trim()
  return t.startsWith('(') ? t : `(${t})`
}


/** A single article as its own document — the file a WhatsApp link points at. */
export async function buildArticleDocx(a: Article): Promise<Buffer> {
  const doc = new Document({
    // Standing alone, it carries the full date header.
    sections: [{ properties: { page: PAGE }, children: articleParagraphs(a, { isFirst: true }) }],
  })
  return Packer.toBuffer(doc)
}
