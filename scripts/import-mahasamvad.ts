/**
 * Import real recent articles with actual photos from Mahasamvad WordPress REST API
 * into PostgreSQL articles table.
 *
 * Two passes:
 *   1. Every post from today and the `--days` before it (default 7), in full.
 *   2. A backfill over the `--backfill-days` before that (default 60) for the
 *      page's thin bands only: कर्जमुक्ती releases and the जय महाराष्ट्र /
 *      दिलखुलास interview announcements, so those bands have past episodes.
 *
 * Idempotent: a post already imported (same source_url) is refreshed, not
 * duplicated, so it can be re-run through the day as Mahasamvad publishes.
 *
 * Usage:
 *   npm run import:mahasamvad
 *   npm run import:mahasamvad -- --days 7 --backfill-days 60
 */
import { loadEnvConfig } from '@next/env'
import { createArticle, ensureSchema, getArticleBySourceUrl, pool, updateArticle } from '../src/lib/db'
import { DISTRICTS, resolveDistrict } from '../src/lib/districts'
import type { Category } from '../src/lib/types'

// Load environment variables without logging credentials
loadEnvConfig(process.cwd())

const MAHASAMVAD_API = 'https://mahasamvad.in/wp-json/wp/v2/posts'
const PAGE_SIZE = 50

/** Titles the backfill pass keeps: the scheme, and the programmes' episode
 *  announcements (which always say मुलाखत — a story that merely quotes the
 *  slogan "जय महाराष्ट्र" is not an episode). */
const BACKFILL_TITLES = [/कर्जमुक्ती/, /(जय महाराष्ट्र|दिलखुलास)[\s\S]*मुलाखत/]

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`)
  const n = i === -1 ? NaN : Number(process.argv[i + 1])
  return Number.isInteger(n) && n >= 0 ? n : fallback
}

/** `YYYY-MM-DD`, `n` days before today in India time — the site's own clock,
 *  which is what the API's `after`/`before` and a post's `date` are in. */
function istDaysAgo(n: number): string {
  const ist = new Date(Date.now() + 5.5 * 3_600_000 - n * 86_400_000)
  return ist.toISOString().slice(0, 10)
}

async function getJson<T>(url: string): Promise<T> {
  let last: unknown
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
      })
      // Past the last page WordPress answers 400 rest_post_invalid_page_number.
      if (response.status === 400) return [] as T
      if (!response.ok) throw new Error(`Mahasamvad API returned HTTP ${response.status}: ${response.statusText}`)
      return (await response.json()) as T
    } catch (err) {
      last = err
      await new Promise((r) => setTimeout(r, attempt * 3000))
    }
  }
  throw last
}

/** Every post in a window, newest first, paged until the API runs out. */
async function fetchWindow(params: Record<string, string>): Promise<WpPost[]> {
  const out: WpPost[] = []
  for (let page = 1; ; page++) {
    const qs = new URLSearchParams({ ...params, per_page: String(PAGE_SIZE), page: String(page) })
    const batch = await getJson<WpPost[]>(`${MAHASAMVAD_API}?${qs}`)
    out.push(...batch)
    if (batch.length < PAGE_SIZE) return out
  }
}

async function fetchPosts(days: number, backfillDays: number): Promise<WpPost[]> {
  const since = istDaysAgo(days)
  console.log(`Fetching every post since ${since}...`)
  const recent = await fetchWindow({ after: `${since}T00:00:00`, _embed: '1' })
  console.log(`  ${recent.length} posts.`)

  if (!backfillDays) return recent
  const from = istDaysAgo(days + backfillDays)
  console.log(`Backfilling कर्जमुक्ती / जय महाराष्ट्र / दिलखुलास from ${from}...`)
  const titles = await fetchWindow({ after: `${from}T00:00:00`, before: `${since}T00:00:00`, _fields: 'id,title' })
  const ids = titles
    .filter((p) => BACKFILL_TITLES.some((re) => re.test(decodeHtmlEntities(p.title?.rendered ?? ''))))
    .map((p) => p.id)
  const older = ids.length ? await fetchWindow({ include: ids.join(','), _embed: '1' }) : []
  console.log(`  ${older.length} of ${titles.length} older posts.`)

  return [...recent, ...older]
}

function decodeHtmlEntities(str: string): string {
  if (!str) return ''
  return str
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&hellip;/g, '…')
}

function htmlToText(html: string): string {
  if (!html) return ''
  return decodeHtmlEntities(
    html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractBullets(html: string): string[] {
  if (!html) return []
  const matches = html.match(/<li\b[^>]*>(.*?)<\/li>/gi)
  if (!matches) return []
  return matches
    .map((li) => decodeHtmlEntities(li.replace(/<[^>]+>/g, '')).trim())
    .filter((b) => b.length > 5 && b.length < 200)
    .slice(0, 5)
}

interface WpPost {
  id: number
  date: string
  date_gmt?: string
  link: string
  title?: { rendered: string }
  content?: { rendered: string }
  excerpt?: { rendered: string }
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url?: string
      media_details?: {
        sizes?: Record<string, { source_url?: string }>
      }
    }>
    'wp:term'?: Array<Array<{
      id: number
      name: string
      slug: string
      taxonomy: string
    }>>
  }
}

export interface ImportSummary {
  totalFetched: number
  importedCount: number
  updatedCount: number
  skippedDuplicates: number
  withPhotos: number
  withoutPhotos: number
  districtMapped: number
  sampleArticles: Array<{
    title: string
    date: string
    district: string | null
    hasPhoto: boolean
    url: string
  }>
}

export async function importMahasamvad(): Promise<ImportSummary> {
  await ensureSchema()

  const posts = await fetchPosts(arg('days', 7), arg('backfill-days', 60))
  console.log(`Fetched ${posts.length} posts from Mahasamvad API.`)

  let importedCount = 0
  let updatedCount = 0
  let skippedDuplicates = 0
  let withPhotos = 0
  let withoutPhotos = 0
  let districtMapped = 0
  const sampleArticles: ImportSummary['sampleArticles'] = []

  for (const post of posts) {
    const rawTitle = post.title?.rendered ?? ''
    const title = decodeHtmlEntities(rawTitle).trim()
    const rawContent = post.content?.rendered ?? post.excerpt?.rendered ?? ''
    const body = htmlToText(rawContent)
    const bullets = extractBullets(rawContent)
    const canonicalUrl = post.link?.trim() ?? ''
    const foldDate = post.date ? post.date.slice(0, 10) : new Date().toISOString().slice(0, 10)
    /* `date` is India time with no offset; `date_gmt` is the same instant in
       UTC. Parsing `date` bare would read it in this machine's zone. */
    const publishedAt = post.date_gmt
      ? new Date(`${post.date_gmt}Z`).toISOString()
      : post.date
        ? new Date(`${post.date}+05:30`).toISOString()
        : new Date().toISOString()

    // Extract actual featured photo
    let posterUrl: string | null = null
    const featuredMedia = post._embedded?.['wp:featuredmedia']?.[0]
    if (featuredMedia?.source_url) {
      posterUrl = featuredMedia.source_url
    } else if (featuredMedia?.media_details?.sizes?.large?.source_url) {
      posterUrl = featuredMedia.media_details.sizes.large.source_url
    } else if (featuredMedia?.media_details?.sizes?.full?.source_url) {
      posterUrl = featuredMedia.media_details.sizes.full.source_url
    }

    if (posterUrl) {
      withPhotos++
    } else {
      withoutPhotos++
    }

    // Resolve district canonically using resolveDistrict()
    let resolvedDistrict: string | null = null
    const terms = (post._embedded?.['wp:term'] || []).flat()
    for (const term of terms) {
      const match = resolveDistrict(term.name) || resolveDistrict(term.slug)
      if (match) {
        resolvedDistrict = match
        break
      }
    }

    // If terms didn't map a district, check title and dateline mentions strictly against canonical DISTRICTS
    if (!resolvedDistrict) {
      for (const d of DISTRICTS) {
        // Match exact word boundaries for district Marathi names
        const mrRegex = new RegExp(`\\b${d.mr}\\b`, 'u')
        if (mrRegex.test(title) || (d.mr.length >= 3 && title.includes(d.mr))) {
          resolvedDistrict = resolveDistrict(d.key)
          break
        }
        if (d.aliases) {
          const aliasMatch = d.aliases.find((alias) => alias.length >= 3 && title.includes(alias))
          if (aliasMatch) {
            resolvedDistrict = resolveDistrict(aliasMatch)
            break
          }
        }
      }
    }

    if (resolvedDistrict) {
      districtMapped++
    }

    // Infer department/attribution from the headline: nearly every release
    // mentions a मुख्यमंत्री scheme somewhere in its body.
    const isCm = /मुख्यमंत्री|मंत्रिमंडळ/.test(title)
    const category: Category = isCm ? 'cm' : 'general'

    // Dateline
    let dateline: string | null = null
    const datelineMatch = body.match(/^([^,]+),\s*(?:दि\s*\.?|ता\s*\.?)/)
    if (datelineMatch && datelineMatch[1] && datelineMatch[1].length < 25) {
      dateline = datelineMatch[1].trim()
    }

    // Check for existing article by source_url or release_no to prevent duplicates
    const existing = canonicalUrl ? await getArticleBySourceUrl(canonicalUrl) : null

    if (existing) {
      // Update with fresh photo and data if needed, maintaining idempotency
      await updateArticle(existing.id, {
        poster_url: posterUrl ?? existing.poster_url,
        district: resolvedDistrict ?? existing.district,
        title: title || existing.title,
        body: body || existing.body,
        category,
        bullets: bullets.length > 0 ? bullets : existing.bullets,
        dateline: dateline ?? existing.dateline,
        // Setting status re-stamps approved_at with now; leave an approved
        // row's publish time alone.
        ...(existing.status === 'approved' ? {} : { status: 'approved' as const }),
      })
      updatedCount++
      skippedDuplicates++
    } else {
      await createArticle({
        category,
        raw_text: body,
        title,
        body,
        district: resolvedDistrict,
        language: 'mr',
        release_no: String(post.id),
        office: 'माहिती व जनसंपर्क महासंचालनालय (महासंवाद)',
        department: isCm ? 'मुख्यमंत्री सचिवालय' : 'माहिती व जनसंपर्क',
        attribution: isCm ? '– मुख्यमंत्री कार्यालय' : null,
        bullets,
        dateline,
        byline: 'महासंवाद वृत्त',
        status: 'approved',
        submitted_by: 'mahasamvad',
        submitted_at: publishedAt,
        approved_at: publishedAt,
        fold_date: foldDate,
        poster_url: posterUrl,
        source_url: canonicalUrl,
      })
      importedCount++
    }

    if (sampleArticles.length < 10) {
      sampleArticles.push({
        title,
        date: foldDate,
        district: resolvedDistrict,
        hasPhoto: Boolean(posterUrl),
        url: canonicalUrl,
      })
    }
  }

  return {
    totalFetched: posts.length,
    importedCount,
    updatedCount,
    skippedDuplicates,
    withPhotos,
    withoutPhotos,
    districtMapped,
    sampleArticles,
  }
}

async function runScript() {
  try {
    const summary = await importMahasamvad()
    console.log('\n================ IMPORT SUMMARY ================')
    console.log(`Total posts fetched from Mahasamvad: ${summary.totalFetched}`)
    console.log(`New articles imported: ${summary.importedCount}`)
    console.log(`Existing articles updated: ${summary.updatedCount}`)
    console.log(`Duplicates skipped/upserted: ${summary.skippedDuplicates}`)
    console.log(`Articles with actual photos: ${summary.withPhotos}`)
    console.log(`Articles without photos: ${summary.withoutPhotos}`)
    console.log(`Articles mapped to districts: ${summary.districtMapped}`)
    console.log('================================================\n')
    await pool().end()
  } catch (err) {
    console.error('Import failed:', err)
    await pool().end()
    process.exit(1)
  }
}

// Only run automatically if executed directly from CLI
if (process.argv[1]?.includes('import-mahasamvad')) {
  runScript()
}

