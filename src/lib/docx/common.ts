import { AlignmentType, LineRuleType, Paragraph, TextRun, convertInchesToTwip } from 'docx'
import type { Language } from '../types'

/**
 * Page setup and typography, taken from the DGIPR fold.
 * See FOLD-FORMAT.md — every value here is measured from the real document.
 */
export const PAGE = {
  size: { width: convertInchesToTwip(8.27), height: convertInchesToTwip(11.69) }, // A4
  margin: {
    left: convertInchesToTwip(1.0),
    right: convertInchesToTwip(1.0),
    top: convertInchesToTwip(0.59),
    bottom: convertInchesToTwip(0.39),
  },
}

/** Body first-line indent: 0.5". */
export const BODY_INDENT = convertInchesToTwip(0.5)

/** docx sizes are half-points. */
export const SIZE_BODY = 24 // 12pt
export const SIZE_HEADLINE = 28 // 14pt

/**
 * Font per language. DVOT-Surekh is DGIPR's Marathi face and must be installed
 * on the machine that opens the document, or Word substitutes and the fold
 * looks wrong.
 */
const FONTS: Record<Language, { ascii: string; hAnsi: string; cs: string }> = {
  mr: { ascii: 'DVOT-Surekh', hAnsi: 'DVOT-Surekh', cs: 'DVOT-Surekh' },
  hi: { ascii: 'Arial', hAnsi: 'Arial', cs: 'Mangal' },
  en: { ascii: 'Times New Roman', hAnsi: 'Times New Roman', cs: 'Times New Roman' },
}

interface RunOpts {
  bold?: boolean
  italics?: boolean
  size?: number
}

export function run(lang: Language, text: string, opts: RunOpts = {}): TextRun {
  return new TextRun({
    text,
    font: FONTS[lang],
    size: SIZE_BODY,
    ...opts,
  })
}

interface LineOpts {
  bold?: boolean
  size?: number
  spaceAfter?: number
}

/** Right-aligned meta line — date, release number, office, department. */
export function metaLine(lang: Language, text: string, o: LineOpts = {}): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { after: o.spaceAfter ?? 0, line: 240, lineRule: LineRuleType.AUTO },
    children: [run(lang, text, { bold: o.bold ?? true, size: o.size ?? SIZE_BODY })],
  })
}

/** Centred line — headline, cabinet header, separator. */
export function centreLine(lang: Language, text: string, o: LineOpts = {}): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: o.spaceAfter ?? 0, line: 240, lineRule: LineRuleType.AUTO },
    children: [run(lang, text, { bold: o.bold ?? false, size: o.size ?? SIZE_BODY })],
  })
}

/** Justified body paragraph with a 0.5" first-line indent. */
export function bodyLine(lang: Language, children: TextRun[]): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: BODY_INDENT },
    spacing: { after: 0, line: 240, lineRule: LineRuleType.AUTO },
    children,
  })
}

export function blank(): Paragraph {
  return new Paragraph({ children: [] })
}

/**
 * End-of-article separator. The source document uses four different marks
 * inconsistently (0000, ००००, --००--, --०--). We standardise on one.
 */
export const SEPARATOR = '0000'

export function separator(lang: Language): Paragraph {
  return centreLine(lang, SEPARATOR)
}

/**
 * Split edited body text into paragraphs. The editor stores plain text with
 * blank-line or newline separation; empty lines are dropped.
 */
export function paragraphsOf(body: string): string[] {
  return body
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
}
