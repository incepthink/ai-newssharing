import { Document, Packer, Paragraph, PageBreak } from 'docx'
import type { Article } from '../types'
import { PAGE } from './common'
import { articleParagraphs } from './article'

/**
 * The day's fold: one document for the whole day, each article on its own page,
 * in the order the news desk arranged them.
 *
 * There is no cutoff — regenerating this later picks up anything approved since.
 */
export async function buildFoldDocx(date: string, articles: Article[]): Promise<Buffer> {
  const children: Paragraph[] = []

  articles.forEach((a, i) => {
    if (i > 0) children.push(new Paragraph({ children: [new PageBreak()] }))
    children.push(...articleParagraphs(a, { isFirst: i === 0 }))
  })

  if (!children.length) {
    children.push(new Paragraph({ children: [] }))
  }

  const doc = new Document({
    sections: [{ properties: { page: PAGE }, children }],
  })
  return Packer.toBuffer(doc)
}

export function foldFileName(date: string): string {
  return `Dgipr-News-Fold-${date}.docx`
}
