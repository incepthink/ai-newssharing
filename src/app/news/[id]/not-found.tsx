import Link from 'next/link'
import { EmptyState, IconSearch } from '@/components/ui'

/** A missing article is an ordinary event — an old link, a mistyped id — so it
 *  gets the same empty state the list uses and a way back, not an error page. */
export default function NewsArticleNotFound() {
  return (
    <div className="card mx-auto max-w-xl">
      <EmptyState
        icon={<IconSearch size={18} />}
        title="ही बातमी सापडली नाही"
        description="हा दुवा कालबाह्य झालेला असू शकतो, किंवा बातमी काढून घेतली असावी."
        action={
          <Link href="/news" className="btn-secondary btn-sm">
            सर्व बातम्या पहा
          </Link>
        }
      />
    </div>
  )
}
