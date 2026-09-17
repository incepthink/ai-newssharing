import Link from 'next/link'
import { foldDateMr } from '@/lib/marathi'
import {
  articleHref,
  categoryLabel,
  departmentLabel,
  readingLabel,
  type FeatureArticle,
} from '@/lib/articles/feature'

/**
 * संबंधित बातम्या — where to go next.
 *
 * A quieter card than the grid on `/news`: no toolbar, no excerpt clamp at
 * three lines, nothing to press but the story itself. The row at the foot of
 * an article competes with the article, and a reader who has reached it has
 * already decided they are finished — what they need is a headline and a
 * reason to believe it is related, which is the badge.
 *
 * Renders nothing when there is nothing to show, rather than an empty heading.
 */
export function RelatedArticles({ articles }: { articles: FeatureArticle[] }) {
  if (articles.length === 0) return null

  return (
    <section aria-labelledby="related-heading" className="mt-12">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="related-heading" className="display text-lg">
          संबंधित बातम्या
        </h2>
        <Link
          href="/news"
          className="text-xs font-medium hover:underline"
          style={{ color: 'var(--accent)', textUnderlineOffset: '3px' }}
        >
          सर्व बातम्या
        </Link>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <Link key={a.id} href={articleHref(a.id)} className="card-link p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="badge badge-accent">{categoryLabel(a.category)}</span>
              <span className="badge">{departmentLabel(a.department)}</span>
            </div>

            <h3 className="display mt-2.5 text-[0.9375rem] leading-snug">{a.title}</h3>

            <p
              className="mt-2 line-clamp-2 text-[0.8125rem] leading-relaxed"
              style={{ color: 'var(--muted)' }}
            >
              {a.excerpt}
            </p>

            <div className="mt-3 text-[0.6875rem]" style={{ color: 'var(--faint)' }}>
              {foldDateMr(a.publishedAt)} • {readingLabel(a)}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
