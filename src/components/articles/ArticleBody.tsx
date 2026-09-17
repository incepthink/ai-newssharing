import { Fragment } from 'react'
import { datelineMr } from '@/lib/marathi'
import type { FeatureArticle } from '@/lib/articles/feature'

/**
 * The story itself.
 *
 * Two things here are load-bearing and easy to get wrong. The dateline opens
 * the first paragraph *inline* — "मुंबई, दि. १७ :" followed by the sentence —
 * exactly as the fold prints it, and never on a line of its own; setting it as
 * a heading is the single most common way a reprint stops looking like a DGIPR
 * release. And the pull quote is inserted *between* paragraphs rather than
 * floated beside them, so it never orphans a line on a narrow screen.
 *
 * The quote lands after the second paragraph, which is where the news has been
 * stated and the detail has not yet begun. In a story too short to have a
 * third paragraph it goes at the end, where it reads as a closing line rather
 * than as an interruption.
 */
export function ArticleBody({ article }: { article: FeatureArticle }) {
  const quoteAfter = article.body.length > 3 ? 1 : article.body.length - 1

  return (
    <div className="prose-mr prose-article">
      {article.body.map((para, i) => (
        <Fragment key={i}>
          <p>
            {i === 0 && (
              <strong style={{ color: 'var(--ink)' }}>
                {datelineMr(article.dateline, article.publishedAt)}{' '}
              </strong>
            )}
            {para}
          </p>

          {article.pullQuote && i === quoteAfter && (
            <blockquote className="pull-quote">
              <p>{article.pullQuote.text}</p>
              {article.pullQuote.attribution && (
                <footer>— {article.pullQuote.attribution}</footer>
              )}
            </blockquote>
          )}
        </Fragment>
      ))}
    </div>
  )
}
