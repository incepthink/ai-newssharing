import { NewsBrowser } from '@/components/articles/NewsBrowser'
import { SAMPLE_ARTICLES } from '@/lib/articles/sample'
import { STATEWIDE } from '@/lib/articles/feature'
import { toFeatureArticle } from '@/lib/articles/from-db'
import { listArticles } from '@/lib/db'
import { resolveDistrict } from '@/lib/districts'

/**
 * News — the public listing.
 *
 * This is the citizen's side of the product. The desk screens are built around
 * a queue and its status; this one is built around finding one story among
 * many, which is a different job and gets a different shape: an editorial
 * grid, four facets across the top, and a card that opens its own page.
 *
 * Data source: Reads approved rows out of Postgres (`articles` table), sharing
 * the exact same dataset with `/map`. If the database is empty or unavailable,
 * it gracefully falls back to `SAMPLE_ARTICLES`.
 */
export const metadata = {
  title: 'बातम्या',
  description:
    'राज्य शासनाच्या योजना, निर्णय आणि उपक्रमांवरील बातम्या — मंत्री, विभाग किंवा जिल्ह्यानुसार.',
}

type NewsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const query = await searchParams
  const asked = Array.isArray(query.district) ? query.district[0] : query.district

  /* Believed only after it resolves. The parameter is written by this app —
     the district panel's footer builds it from a canonical key — but it also
     arrives in forwarded links and hand-edited address bars, and a district
     the corpus has never heard of would silently filter the whole list away
     and look like an outage. `statewide` is not one of the 36 and is let
     through by name, because it is a real option in the select. */
  const district =
    asked === STATEWIDE ? STATEWIDE : (resolveDistrict(asked) ?? '')

  let articles = SAMPLE_ARTICLES
  try {
    const dbArticles = await listArticles({ status: 'approved' })
    if (dbArticles && dbArticles.length > 0) {
      articles = dbArticles.map(toFeatureArticle)
    }
  } catch (err) {
    console.error('Failed to load articles from database, falling back to sample:', err)
  }

  return <NewsBrowser articles={articles} initialDistrict={district} />
}
