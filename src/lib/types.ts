export type Language = 'mr' | 'hi' | 'en'
export type Status = 'pending' | 'approved' | 'parked'

/**
 * The desk's one editorial decision: is this a Chief Minister / cabinet item,
 * or an ordinary release? Nobody writes articles here — DLOs write all of them.
 * The desk sorts them.
 */
export type Category = 'cm' | 'general'

export interface Article {
  id: number
  /** AI-suggested, desk-confirmed. The segregation the news desk exists for. */
  category: Category
  raw_text: string
  title: string
  body: string
  /** Canonical English district key, or null when unresolved. */
  district: string | null
  language: Language
  /** वृत्त क्र. — assigned by the news desk at proofreading, never by a DLO. */
  release_no: string | null
  /** Right-aligned office line, e.g. मुख्यमंत्री सचिवालय (जनसंपर्क कक्ष) */
  office: string | null
  /** Right-aligned department line, e.g. (गृह विभाग) */
  department: string | null
  /** Attribution under the headline, e.g. – मुख्यमंत्री देवेंद्र फडणवीस */
  attribution: string | null
  /** Bold sub-bullets under the headline. */
  bullets: string[]
  /** Dateline prefix, e.g. मुंबई */
  dateline: string | null
  /** Writer credit after the separator, e.g. अश्विनी पुजारी/विसंअ */
  byline: string | null
  status: Status
  submitted_by: string
  submitted_at: string
  approved_at: string | null
  /** ISO date (YYYY-MM-DD) of the fold this belongs to. */
  fold_date: string
}

export interface Fold {
  date: string
  article_order: number[]
  finalized_at: string | null
}

export interface Extraction {
  language: Language
  title: string
  district: string | null
  dateline: string | null
  category: Category
}
