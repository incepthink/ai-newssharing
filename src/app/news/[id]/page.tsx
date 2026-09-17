import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { datelineMr, foldDateMr } from '@/lib/marathi'
import { getArticle } from '@/lib/db'
import { districtName } from '@/lib/districts'
import { DGIPR_MR } from '@/lib/dgipr/marathi'
import { releaseDocxHref } from '@/lib/dgipr/from-db'
import { releaseBodyLines, summary60 } from '@/lib/dgipr/summary'
import { NEWS_MR } from '@/lib/news/marathi'
import { toDevanagariDigits } from '@/lib/marathi'
import {
  articleHref,
  categoryLabel,
  departmentLabel,
  districtLabel,
  ministerLabel,
  NEWS_LABEL,
  readingLabel,
  relatedArticles,
  type FeatureArticle,
} from '@/lib/articles/feature'
import { SAMPLE_ARTICLES } from '@/lib/articles/sample'
import type { Article } from '@/lib/types'
import { ArticleActions } from '@/components/articles/ArticleActions'
import { ArticleBody } from '@/components/articles/ArticleBody'
import { ArticleHero } from '@/components/articles/ArticleHero'
import { Breadcrumbs } from '@/components/articles/Breadcrumbs'
import { RelatedArticles } from '@/components/articles/RelatedArticles'
import { SummaryCard } from '@/components/articles/SummaryCard'
import { IconDownload, IconMap } from '@/components/ui'

/**
 * One news story, on its own page.
 *
 * Laid out the way महासंवाद lays out a release, because a citizen who has read
 * one should recognise the next: trail, category, headline, deck, byline, then
 * the picture, then the story opening on its dateline. The sixty-word summary
 * is the one departure — it is the thing a reader who will not read five
 * paragraphs still leaves with, so it sits above the story on a phone and
 * beside it on a desk.
 *
 * ---------------------------------------------------------------------------
 * THIS ROUTE SERVES TWO KINDS OF THING, AND IT SHOULD.
 *
 * A **feature** is a `FeatureArticle` from `@/lib/articles/sample` — the
 * portal's own editorial shape, with a minister, a department, a category and
 * a reading time, keyed by slug.
 *
 * A **release** is a row in `articles` with `status = 'approved'` — what a DLO
 * filed and the desk cleared, keyed by its integer id. Every card on `/map`
 * links here, so this route had to learn to answer for them or every action
 * link the district panel offers would 404.
 *
 * They are rendered by two different functions rather than one, and that is
 * the point rather than a shortcut. The obvious move is to bend an `Article`
 * into a `FeatureArticle` and reuse the layout below — and it cannot be done
 * honestly. `FeatureArticle.minister` is a portfolio slug from a closed list
 * and the desk stores a free-text `attribution`; `department` is the same
 * again; `category` is an editorial taxonomy the `articles` table has never
 * had. Filling those in would mean this page printing "कृषी मंत्री" over a
 * release nobody attributed to anyone, which on a government notice is not a
 * cosmetic liberty.
 *
 * So a release is printed as what it is: its own provenance, its own text, and
 * its वृत्त क्र. Nothing is invented, and the fields the desk left empty are
 * simply absent.
 * ---------------------------------------------------------------------------
 */

/** A DGIPR dateline opening a paragraph, in either script — `पुणे, दि. ३० :`
 *  or `Mumbai, September 2 :`. The same shape `lib/dgipr/summary.ts` lifts off
 *  the front of a summary, kept here rather than exported from there because
 *  this asks a different question of it: not "where does the prose start" but
 *  "has the department already said this". */
const HAS_DATELINE = /^.{0,60}?,\s*(?:दि\s*\.?\s*[०-९\d]|[A-Z][a-z]+\s+\d)/

function findFeature(id: string): FeatureArticle | undefined {
  return SAMPLE_ARTICLES.find((a) => a.id === id)
}

/**
 * The desk's own row, when the id is one of its integers.
 *
 * Only `approved` rows are served. A pending release is a draft sitting in a
 * queue, and this is the citizen's side of the product — a URL guessed one
 * integer past a real one must not be a way to read copy the desk has not
 * cleared.
 */
async function findRelease(id: string): Promise<Article | null> {
  if (!/^\d+$/.test(id)) return null

  const article = await getArticle(Number(id))

  return article?.status === 'approved' ? article : null
}

/** Only the features are prerendered. The desk's rows are served on demand —
 *  `dynamicParams` is on by default, and a release approved this morning must
 *  not wait for a rebuild to become readable. */
export function generateStaticParams() {
  return SAMPLE_ARTICLES.map((a) => ({ id: a.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const key = decodeURIComponent(id)
  const article = findFeature(key)

  if (article) {
    return {
      title: article.title,
      description: article.subtitle,
      openGraph: {
        type: 'article',
        title: article.title,
        description: article.subtitle,
        publishedTime: article.publishedAt,
        url: articleHref(article.id),
      },
    }
  }

  const release = await findRelease(key)
  if (!release) return { title: 'बातमी सापडली नाही' }

  /* The sixty-word cut as the description. It is the release's own opening
     words — see `lib/dgipr/summary.ts` — which is exactly what a link preview
     in WhatsApp should carry, and it is the same text the card on the map
     showed the reader who forwarded it. */
  const summary = summary60(release.body || release.raw_text, {
    titleMr: release.title,
    attributionMr: release.attribution,
  })

  return {
    title: release.title,
    description: summary,
    openGraph: {
      type: 'article',
      title: release.title,
      description: summary,
      publishedTime: release.approved_at ?? release.fold_date,
      url: articleHref(String(release.id)),
    },
  }
}

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const key = decodeURIComponent(id)

  const article = findFeature(key)
  if (article) return <FeatureReader article={article} />

  const release = await findRelease(key)
  if (!release) notFound()

  return <ReleaseReader release={release} />
}

/* ------------------------------------------------------------- the release */

/**
 * One approved release, printed as the document it is.
 *
 * The order is DGIPR's own and the reason for it is the same one `DgiprPanel`
 * gives: for an official notice *who said it* is half the content, so the
 * issuing office, the attribution and the number come before the text rather
 * than under it as a footer.
 *
 * Entirely server-rendered. There is nothing here with state — the share
 * machinery lives on the map, where a reader is assembling a bulletin out of a
 * district's stack, and a second share control on a page reached from that one
 * would be a third way to do a thing that already has two.
 */
function ReleaseReader({ release }: { release: Article }) {
  const body = release.body || release.raw_text
  const parts = { titleMr: release.title, attributionMr: release.attribution }
  const summary = summary60(body, parts)

  /* The prose, without the headline and the attribution the page has already
     set above it, and without the WordPress byline a pasted mahasamvad post
     brings with it. `releaseBodyLines` splits on single newlines as well as
     blank ones, because that is how the desk stores a release. */
  const paragraphs = releaseBodyLines(body, parts)

  const dateIso = (release.approved_at ?? release.fold_date).slice(0, 10)

  /* Whether the filed text carries a dateline of its own.

     The desk's rows are inconsistent about it: some bodies are pasted straight
     off a release and open `पुणे, दि. ३० :`, some are typed under a `dateline`
     column with the body starting at the first sentence. The page synthesises
     one only for the second kind.

     Scanned across the opening paragraphs rather than only the first, because a
     release that leads with a standfirst carries its dateline on the paragraph
     *after* it — and testing only `[0]` there would have the page print its own
     dateline above a paragraph, and the release's real one two lines below it.
     Worse, the two would disagree: this one is built from `approved_at` and the
     department's is the day it was issued. Two different dates on one notice is
     not a cosmetic duplicate. */
  const opensWithDateline = paragraphs
    .slice(0, 3)
    .some((para) => HAS_DATELINE.test(para))

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Breadcrumbs
        trail={[
          { label: 'मुख्य पृष्ठ', href: '/' },
          { label: NEWS_LABEL, href: '/news' },
          { label: release.title },
        ]}
      />

      <article className="mt-5">
        <header>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="badge badge-accent">{DGIPR_MR.tag}</span>

            {release.department ? (
              <span className="badge">{release.department}</span>
            ) : release.office ? (
              <span className="badge">{release.office}</span>
            ) : null}

            <span className="badge">
              {release.district ? districtName(release.district) : DGIPR_MR.statewide}
            </span>

            {release.category === 'cm' ? (
              <span className="badge">{NEWS_MR.tierCm}</span>
            ) : null}
          </div>

          <h1 className="article-title mt-3">{release.title}</h1>

          {/* The minister the department attributed it to, where there is one.
              Set as the deck because that is where DGIPR sets it on the
              release — directly under the headline, before the dateline. */}
          {release.attribution ? (
            <h2 className="article-subtitle mt-3 max-w-3xl">{release.attribution}</h2>
          ) : null}

          <div
            className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t pt-3 text-xs"
            style={{ borderColor: 'var(--edge)', color: 'var(--faint)' }}
          >
            {release.dateline ? (
              <>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {release.dateline}
                </span>
                <span aria-hidden>•</span>
              </>
            ) : null}

            <time dateTime={dateIso}>{foldDateMr(dateIso)}</time>

            {release.release_no ? (
              <>
                <span aria-hidden>•</span>
                <span>
                  {DGIPR_MR.releaseNo} {toDevanagariDigits(release.release_no)}
                </span>
              </>
            ) : null}

            {release.byline ? (
              <>
                <span aria-hidden>•</span>
                <span>{release.byline}</span>
              </>
            ) : null}
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-8">
          {/* The rail is first in the source so that on a phone — where the grid
              collapses to one column — the summary and the actions come before
              the release rather than after it. */}
          <aside className="space-y-4 lg:order-2">
            {summary ? <SummaryCard summary={summary} /> : null}

            <div className="card space-y-2 p-3 lg:sticky lg:top-20">
              <a className="btn-ghost w-full" href={releaseDocxHref(release.id)} download>
                <IconDownload size={15} /> {DGIPR_MR.downloadDocx}
              </a>

              {/* Back to where most readers of this page came from, carrying
                  the district so the map opens on it rather than on the state. */}
              <Link
                className="btn-ghost w-full"
                href={release.district ? `/map?district=${release.district}` : '/map'}
              >
                <IconMap size={15} /> {NEWS_MR.viewOnMap}
              </Link>
            </div>

            {release.bullets.length > 0 ? (
              <div className="card p-3">
                <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                  {DGIPR_MR.tags}
                </p>
                <ul className="mt-2 space-y-1.5 text-sm leading-relaxed">
                  {release.bullets.map((bullet, index) => (
                    <li key={index}>{bullet}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>

          <div className="min-w-0 lg:order-1">
            {/* The release in full, in the paragraphs it was filed in. This is
                the department's own public information, issued to be carried —
                the argument `DgiprPanel` makes at length for printing a whole
                document rather than a standfirst and a link. */}
            <div className="prose-mr prose-article">
              {paragraphs.map((para, index) => (
                <p key={index}>
                  {/* The dateline opens the first paragraph inline — "मुंबई, दि.
                      १७ :" and then the sentence — exactly as the fold prints
                      it and never on a line of its own. `ArticleBody` makes the
                      same point: setting it as a heading is the single most
                      common way a reprint stops looking like a DGIPR release.

                      Only where the desk stored a dateline *and* the body does
                      not already open with one. Rows arrive both ways, and two
                      datelines on one paragraph is worse than none. */}
                  {index === 0 && release.dateline && !opensWithDateline ? (
                    <strong style={{ color: 'var(--ink)' }}>
                      {datelineMr(release.dateline, dateIso)}{' '}
                    </strong>
                  ) : null}
                  {para}
                </p>
              ))}
            </div>

            <div
              className="mt-8 border-t pt-4 text-xs leading-relaxed"
              style={{ borderColor: 'var(--edge)', color: 'var(--faint)' }}
            >
              {release.office ? (
                <>
                  {release.office}
                  <br />
                </>
              ) : null}
              {DGIPR_MR.issuer}
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}

/* ------------------------------------------------------------- the feature */

/** The portal's own editorial article, unchanged. */
function FeatureReader({ article }: { article: FeatureArticle }) {
  const related = relatedArticles(article, SAMPLE_ARTICLES, 3)

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Breadcrumbs
        trail={[
          { label: 'मुख्य पृष्ठ', href: '/' },
          { label: NEWS_LABEL, href: '/news' },
          { label: article.title },
        ]}
      />

      <article className="mt-5">
        <header>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="badge badge-accent">{categoryLabel(article.category)}</span>
            <span className="badge">{departmentLabel(article.department)}</span>
            <span className="badge">{districtLabel(article.district)}</span>
          </div>

          <h1 className="article-title mt-3">{article.title}</h1>

          <h2 className="article-subtitle mt-3 max-w-3xl">{article.subtitle}</h2>

          <div
            className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t pt-3 text-xs"
            style={{ borderColor: 'var(--edge)', color: 'var(--faint)' }}
          >
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
              {article.byline}
            </span>
            <span aria-hidden>•</span>
            <time dateTime={article.publishedAt}>{foldDateMr(article.publishedAt)}</time>
            <span aria-hidden>•</span>
            <span>{readingLabel(article)}</span>
            <span aria-hidden>•</span>
            <span>{ministerLabel(article.minister)}</span>
          </div>
        </header>

        <div className="mt-5">
          <ArticleHero article={article} />
        </div>

        {/* The rail is first in the source so that on a phone — where the grid
            collapses to one column — the summary and the actions come before
            the story rather than after it. `order` puts it back on the right
            once there is room for two columns. */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-8">
          <aside className="space-y-4 lg:order-2">
            <SummaryCard summary={article.summary60} />
            <div className="lg:sticky lg:top-20">
              <ArticleActions article={article} />
            </div>
          </aside>

          <div className="min-w-0 lg:order-1">
            <ArticleBody article={article} />

            <div
              className="mt-8 border-t pt-4 text-xs leading-relaxed"
              style={{ borderColor: 'var(--edge)', color: 'var(--faint)' }}
            >
              {article.byline} · माहिती व जनसंपर्क महासंचालनालय, महाराष्ट्र शासन
              <br />
              ही बातमी मांडणी दाखविण्यासाठीचा प्रातिनिधिक नमुना मजकूर आहे.
            </div>
          </div>
        </div>
      </article>

      <RelatedArticles articles={related} />
    </div>
  )
}
