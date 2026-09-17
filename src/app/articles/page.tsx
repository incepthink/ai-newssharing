import { permanentRedirect } from 'next/navigation'
import { articleHref } from '@/lib/articles/feature'

/**
 * The section moved to `/news`. This is what keeps the links that were already
 * shared from breaking.
 *
 * `/articles?a=<id>` used to open the list with one article in a modal over
 * it; the same link now lands on that article's own page, which is what the
 * sender meant by it. A bare `/articles` goes to the list.
 *
 * `permanentRedirect` rather than `redirect`, so caches and search engines are
 * told this is the new address and not a temporary detour.
 */
export default async function ArticlesRedirect({
  searchParams,
}: {
  searchParams: Promise<{ a?: string | string[] }>
}) {
  const { a } = await searchParams
  const id = Array.isArray(a) ? a[0] : a

  permanentRedirect(id ? articleHref(id) : '/news')
}
