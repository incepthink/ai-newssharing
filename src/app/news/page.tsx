import { NewsBrowser } from '@/components/articles/NewsBrowser'
import { SAMPLE_ARTICLES } from '@/lib/articles/sample'
import { STATEWIDE } from '@/lib/articles/feature'
import { resolveDistrict } from '@/lib/districts'

/**
 * News — the public listing.
 *
 * This is the citizen's side of the product. The desk screens are built around
 * a queue and its status; this one is built around finding one story among
 * many, which is a different job and gets a different shape: an editorial
 * grid, four facets across the top, and a card that opens its own page.
 *
 * There is deliberately no map *on* this page. The grouped district select is
 * a better instrument on a phone — where most of this audience is — than a GIS
 * canvas that costs a few hundred kilobytes to answer the same question worse.
 * What there is instead is a door: `NewsBrowser` carries "नकाशावर पहा" in its
 * header, and `/map` carries "सर्व बातम्यांची यादी" back. Two readings of one
 * corpus, each naming the other.
 *
 * Reading happens at `/news/[id]`, a real page, which is what a forwarded link,
 * a bookmark, a browser's back button and a search engine all expect. What
 * stays floating in the browser is only what is genuinely a detour — the share
 * sheet and the assistant.
 *
 * The page is a server component for one reason: `?district=`. A reader
 * arriving from a district panel on the map has already chosen, and that choice
 * has to be in the first render rather than applied by an effect afterwards —
 * see `NewsBrowser`.
 *
 * NOTE ON THE DATA. The grid below is still `@/lib/articles/sample`, and the
 * map beside it is not: `/map` reads approved rows out of Postgres. The two can
 * be told apart by their ids — a release from the desk is `/news/123` and a
 * sample feature is `/news/<slug>` — and `/news/[id]` serves both, so every
 * link the map hands out resolves. What this listing cannot do yet is *list*
 * the desk's rows, because its four facets are a taxonomy the `articles` table
 * does not carry: `minister` and `department` here are portfolio slugs from
 * `feature.ts`, and the desk stores an `attribution` string and an `office`
 * line. Making them agree is a schema decision rather than a page change, so it
 * is left named here rather than papered over with a guessed mapping.
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

  return <NewsBrowser articles={SAMPLE_ARTICLES} initialDistrict={district} />
}
