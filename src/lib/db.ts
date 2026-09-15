import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { Article, Category, Fold, Language, Status } from './types'

const DB_PATH = process.env.DATABASE_PATH ?? './.data/newsroom.db'

let _db: Database.Database | null = null

export function db(): Database.Database {
  if (_db) return _db
  mkdirSync(dirname(DB_PATH), { recursive: true })
  const d = new Database(DB_PATH)
  d.pragma('journal_mode = WAL')
  d.exec(TABLES)
  // Must run before the indexes: an index over a column that migrate() has not
  // added yet fails outright, and that failure takes every DB route with it.
  migrate(d)
  d.exec(INDEXES)
  _db = d
  return d
}

/**
 * CREATE TABLE IF NOT EXISTS never adds a column to a table that already exists,
 * so columns introduced after someone's database was created need this.
 */
function migrate(d: Database.Database) {
  const cols = new Set(
    (d.prepare('PRAGMA table_info(articles)').all() as { name: string }[]).map((c) => c.name),
  )
  const wanted: Record<string, string> = {
    byline: 'TEXT',
    category: "TEXT NOT NULL DEFAULT 'general'",
  }
  for (const [name, type] of Object.entries(wanted)) {
    if (!cols.has(name)) d.exec(`ALTER TABLE articles ADD COLUMN ${name} ${type}`)
  }
}

const TABLES = `
CREATE TABLE IF NOT EXISTS articles (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  category      TEXT NOT NULL DEFAULT 'general',
  raw_text      TEXT NOT NULL,
  title         TEXT NOT NULL DEFAULT '',
  body          TEXT NOT NULL DEFAULT '',
  district      TEXT,
  language      TEXT NOT NULL DEFAULT 'mr',
  release_no    TEXT,
  office        TEXT,
  department    TEXT,
  attribution   TEXT,
  bullets       TEXT NOT NULL DEFAULT '[]',
  dateline      TEXT,
  byline        TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',
  submitted_by  TEXT NOT NULL DEFAULT 'dlo',
  submitted_at  TEXT NOT NULL,
  approved_at   TEXT,
  fold_date     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS folds (
  date          TEXT PRIMARY KEY,
  article_order TEXT NOT NULL DEFAULT '[]',
  finalized_at  TEXT
);
`

const INDEXES = `
CREATE INDEX IF NOT EXISTS idx_articles_fold  ON articles(fold_date, status);
CREATE INDEX IF NOT EXISTS idx_articles_dist  ON articles(district, status);
CREATE INDEX IF NOT EXISTS idx_articles_cat   ON articles(category, fold_date);
`

/* ---------------------------------------------------------------- mapping */

type Row = Record<string, unknown>

function toArticle(r: Row): Article {
  return {
    id: r.id as number,
    category: (r.category as Category) ?? 'general',
    raw_text: r.raw_text as string,
    title: r.title as string,
    body: r.body as string,
    district: (r.district as string) ?? null,
    language: r.language as Language,
    release_no: (r.release_no as string) ?? null,
    office: (r.office as string) ?? null,
    department: (r.department as string) ?? null,
    attribution: (r.attribution as string) ?? null,
    bullets: JSON.parse((r.bullets as string) || '[]'),
    dateline: (r.dateline as string) ?? null,
    byline: (r.byline as string) ?? null,
    status: r.status as Status,
    submitted_by: r.submitted_by as string,
    submitted_at: r.submitted_at as string,
    approved_at: (r.approved_at as string) ?? null,
    fold_date: r.fold_date as string,
  }
}

/* --------------------------------------------------------------- articles */

export interface CreateArticleInput {
  category?: Category
  raw_text: string
  title?: string
  body?: string
  district?: string | null
  language?: Language
  release_no?: string | null
  office?: string | null
  department?: string | null
  attribution?: string | null
  bullets?: string[]
  dateline?: string | null
  byline?: string | null
  status?: Status
  submitted_by?: string
  fold_date: string
}

export function createArticle(input: CreateArticleInput): Article {
  const stmt = db().prepare(`
    INSERT INTO articles
      (category, raw_text, title, body, district, language, release_no, office, department,
       attribution, bullets, dateline, byline, status, submitted_by, submitted_at, fold_date)
    VALUES
      (@category, @raw_text, @title, @body, @district, @language, @release_no, @office, @department,
       @attribution, @bullets, @dateline, @byline, @status, @submitted_by, @submitted_at, @fold_date)
  `)
  const info = stmt.run({
    category: input.category ?? 'general',
    raw_text: input.raw_text,
    title: input.title ?? '',
    body: input.body ?? input.raw_text,
    district: input.district ?? null,
    language: input.language ?? 'mr',
    release_no: input.release_no ?? null,
    office: input.office ?? null,
    department: input.department ?? null,
    attribution: input.attribution ?? null,
    bullets: JSON.stringify(input.bullets ?? []),
    dateline: input.dateline ?? null,
    byline: input.byline ?? null,
    status: input.status ?? 'pending',
    submitted_by: input.submitted_by ?? 'dlo',
    submitted_at: new Date().toISOString(),
    fold_date: input.fold_date,
  })
  return getArticle(Number(info.lastInsertRowid))!
}

export function getArticle(id: number): Article | null {
  const r = db().prepare('SELECT * FROM articles WHERE id = ?').get(id) as Row | undefined
  return r ? toArticle(r) : null
}

export interface ListFilter {
  fold_date?: string
  status?: Status
  category?: Category
  district?: string
  language?: Language
  from?: string
  to?: string
}

export function listArticles(f: ListFilter = {}): Article[] {
  const where: string[] = []
  const params: Record<string, unknown> = {}
  if (f.fold_date) { where.push('fold_date = @fold_date'); params.fold_date = f.fold_date }
  if (f.status) { where.push('status = @status'); params.status = f.status }
  if (f.category) { where.push('category = @category'); params.category = f.category }
  if (f.district) { where.push('district = @district'); params.district = f.district }
  if (f.language) { where.push('language = @language'); params.language = f.language }
  if (f.from) { where.push('fold_date >= @from'); params.from = f.from }
  if (f.to) { where.push('fold_date <= @to'); params.to = f.to }
  const sql =
    'SELECT * FROM articles' +
    (where.length ? ` WHERE ${where.join(' AND ')}` : '') +
    ' ORDER BY id DESC'
  return (db().prepare(sql).all(params) as Row[]).map(toArticle)
}

const UPDATABLE = [
  'title', 'body', 'district', 'language', 'release_no', 'office', 'department',
  'attribution', 'dateline', 'byline', 'status', 'category',
] as const

export function updateArticle(id: number, patch: Partial<Article>): Article | null {
  const sets: string[] = []
  const params: Record<string, unknown> = { id }

  for (const k of UPDATABLE) {
    if (k in patch) { sets.push(`${k} = @${k}`); params[k] = (patch as Record<string, unknown>)[k] ?? null }
  }
  if ('bullets' in patch) { sets.push('bullets = @bullets'); params.bullets = JSON.stringify(patch.bullets ?? []) }
  if (patch.status === 'approved') { sets.push('approved_at = @approved_at'); params.approved_at = new Date().toISOString() }
  if (!sets.length) return getArticle(id)

  db().prepare(`UPDATE articles SET ${sets.join(', ')} WHERE id = @id`).run(params)
  return getArticle(id)
}

export function deleteArticle(id: number): void {
  db().prepare('DELETE FROM articles WHERE id = ?').run(id)
}

/**
 * Suggest the next वृत्त क्र. The desk can always override — DGIPR's counter
 * advances outside this system too, so this is a convenience, not a source of truth.
 */
export function suggestReleaseNo(): string {
  const r = db()
    .prepare(`SELECT release_no FROM articles WHERE release_no GLOB '[0-9]*' ORDER BY CAST(release_no AS INTEGER) DESC LIMIT 1`)
    .get() as Row | undefined
  const last = r ? Number(r.release_no) : 0
  return String(last + 1)
}

/* ------------------------------------------------------------------ folds */

export function getFold(date: string): Fold {
  const r = db().prepare('SELECT * FROM folds WHERE date = ?').get(date) as Row | undefined
  const approved = listArticles({ fold_date: date, status: 'approved' })
  const stored: number[] = r ? JSON.parse(r.article_order as string) : []
  const live = new Set(approved.map((a) => a.id))

  // Keep the desk's hand-ordering, drop anything no longer approved, and
  // append newly approved articles at the end. There is no cutoff, so this
  // has to stay correct when an article is approved late.
  const order = stored.filter((id) => live.has(id))
  for (const a of approved) if (!order.includes(a.id)) order.push(a.id)

  return { date, article_order: order, finalized_at: (r?.finalized_at as string) ?? null }
}

export function setFoldOrder(date: string, order: number[]): Fold {
  db().prepare(`
    INSERT INTO folds (date, article_order) VALUES (@date, @order)
    ON CONFLICT(date) DO UPDATE SET article_order = @order
  `).run({ date, order: JSON.stringify(order) })
  return getFold(date)
}

/** Approved articles for a date, in the desk's chosen order. */
export function foldArticles(date: string): Article[] {
  const fold = getFold(date)
  const byId = new Map(listArticles({ fold_date: date, status: 'approved' }).map((a) => [a.id, a]))
  return fold.article_order.map((id) => byId.get(id)).filter((a): a is Article => !!a)
}

/* ------------------------------------------------------------------ stats */

export interface DistrictCount { district: string; count: number }

export function districtCounts(from: string, to: string): DistrictCount[] {
  const rows = db().prepare(`
    SELECT district, COUNT(*) AS count
    FROM articles
    WHERE status = 'approved' AND district IS NOT NULL
      AND fold_date >= @from AND fold_date <= @to
    GROUP BY district
  `).all({ from, to }) as Row[]
  return rows.map((r) => ({ district: r.district as string, count: r.count as number }))
}

/** Daily totals across the range — drives the time slider. */
export function dailyCounts(from: string, to: string): { date: string; count: number }[] {
  const rows = db().prepare(`
    SELECT fold_date AS date, COUNT(*) AS count
    FROM articles
    WHERE status = 'approved' AND fold_date >= @from AND fold_date <= @to
    GROUP BY fold_date ORDER BY fold_date
  `).all({ from, to }) as Row[]
  return rows.map((r) => ({ date: r.date as string, count: r.count as number }))
}
