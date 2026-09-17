import Image from 'next/image'
import {
  categoryLabel,
  departmentLabel,
  districtLabel,
  type FeatureArticle,
} from '@/lib/articles/feature'
import { IconEmblem } from '@/components/ui'

/**
 * The featured image at the top of an article.
 *
 * When there is a photograph it runs full width in a rounded frame. When there
 * is not — which is every article in the sample set — it falls back to a
 * typographic plate rather than to a stock photograph or a grey box. A stock
 * photograph on a government release implies a scene that did not happen, and
 * a grey box looks like the page failed to load; a plate carrying the
 * department and the place says what the story is about and is obviously not a
 * picture of it.
 *
 * Both states occupy the same 16:9 frame, so swapping a real image in later
 * changes no layout.
 */
export function ArticleHero({ article }: { article: FeatureArticle }) {
  return (
    <figure className="hero-frame">
      {article.heroImage ? (
        <Image
          src={article.heroImage}
          alt={article.title}
          fill
          priority
          sizes="(min-width: 1024px) 60rem, 100vw"
          className="object-cover"
        />
      ) : (
        <div className="hero-plate">
          <IconEmblem size={30} style={{ opacity: 0.75 }} />
          <div className="mt-3 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] opacity-75">
            {categoryLabel(article.category)}
          </div>
          <div className="display mt-1.5 text-lg leading-snug sm:text-2xl">
            {departmentLabel(article.department)}
          </div>
          <div className="mt-1 text-xs opacity-80 sm:text-sm">
            {districtLabel(article.district)} · महाराष्ट्र शासन
          </div>
        </div>
      )}

      {/* The caption is a statement about the prototype, not a caption for a
          photograph, so it only appears when there is no photograph. */}
      {!article.heroImage && (
        <figcaption className="sr-only">
          या नमुना लेखासोबत छायाचित्र उपलब्ध नाही.
        </figcaption>
      )}
    </figure>
  )
}
