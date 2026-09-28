/**
 * Import real recent articles with actual photos from Mahasamvad WordPress REST API
 * into PostgreSQL articles table.
 *
 * Usage:
 *   npm exec tsx scripts/import-mahasamvad.ts
 */
import { loadEnvConfig } from '@next/env'
import { createArticle, ensureSchema, getArticleBySourceUrl, pool, updateArticle } from '../src/lib/db'
import { DISTRICTS, resolveDistrict } from '../src/lib/districts'
import type { Category } from '../src/lib/types'

// Load environment variables without logging credentials
loadEnvConfig(process.cwd())

const MAHASAMVAD_API_URL = 'https://mahasamvad.in/wp-json/wp/v2/posts?per_page=50&_embed=1'

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

  console.log(`Fetching articles from ${MAHASAMVAD_API_URL}...`)
  const response = await fetch(MAHASAMVAD_API_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Mahasamvad API returned HTTP ${response.status}: ${response.statusText}`)
  }

  const posts = (await response.json()) as WpPost[]
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

    // Infer department/attribution
    const isCm = /मुख्यमंत्री|मंत्रिमंडळ/.test(`${title} ${body}`)
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
        status: 'approved',
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
        submitted_at: post.date ? new Date(post.date).toISOString() : new Date().toISOString(),
        approved_at: post.date ? new Date(post.date).toISOString() : new Date().toISOString(),
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

