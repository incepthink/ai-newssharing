import type { SpecialCoverage } from '@/data/news-editorial'
import type { NewsItem } from '@/lib/news/public'
import { ReadLink } from './triggers'

/**
 * A scheme's headline figures on its dark band, with the releases they were
 * taken from — on the home page's band and the scheme's own page. Nothing when the scheme has no figures yet.
 */
export function SchemeFigures({
  figures,
  sources,
}: {
  figures: SpecialCoverage['figures']
  sources: Array<{ no: string; item: NewsItem | null }>
}) {
  if (!figures.length) return null
  return (
    <div>
      <dl className="m-0 grid grid-cols-3 gap-2 lg:gap-3">
        {figures.map((f) => (
          <div key={f.label} className="flex flex-col-reverse rounded-[18px] bg-white/[0.08] px-2.5 py-3 lg:p-[18px]">
            <dt className="mt-0.5 text-[0.78rem] leading-[1.45] text-white/90 lg:mt-1 lg:text-sm lg:leading-[1.55]">{f.label}</dt>
            <dd
              className="nr-h m-0 ![text-wrap:nowrap] !whitespace-nowrap text-[clamp(1.125rem,5.6vw,1.625rem)] font-extrabold leading-[1.3] text-nr-accent lg:text-[2.25rem]"
            >
              <FigureValue value={f.value} />
            </dd>
          </div>
        ))}
      </dl>
      <p className="m-0 mt-2 text-xs text-white/70">
        आकडे:{' '}
        {sources.map((s, k) => (
          <span key={s.no}>
            {k > 0 && ', '}
            {s.item ? (
              <ReadLink item={s.item} className="text-white/90 underline underline-offset-2">
                वृत्त क्र. {s.no}
              </ReadLink>
            ) : (
              <>वृत्त क्र. {s.no}</>
            )}
          </span>
        ))}
      </p>
    </div>
  )
}

/** A figure on one line: the number full size, a trailing unit word
 *  (लाख, कोटी) smaller beside it so the pair fits a third of the band. */
function FigureValue({ value }: { value: string }) {
  const m = value.match(/^(.*[\d०-९])\s+([^\d०-९]+)$/)
  if (!m) return <>{value}</>
  return (
    <>
      {m[1]}
      <span className="ml-1 text-[0.6em]">{m[2]}</span>
    </>
  )
}
