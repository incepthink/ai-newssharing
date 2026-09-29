import { districtName } from '@/lib/districts'
import type { Article, Language } from '@/lib/types'

/**
 * One row of the public fold dialog: an approved article reduced to what the
 * row prints. Built on the server for today's fold and in the browser for any
 * other day the reader steps to, so both go through this one mapping.
 */
export type FoldItem = {
  id: number
  title: string
  releaseNo: string | null
  cm: boolean
  language: Language
  /** Marathi district name, or null for a statewide release. */
  district: string | null
  href: string
}

export function toFoldItem(a: Article): FoldItem {
  return {
    id: a.id,
    title: a.title,
    releaseNo: a.release_no,
    cm: a.category === 'cm',
    language: a.language,
    district: a.district ? districtName(a.district) : null,
    href: `/news/${a.id}`,
  }
}
