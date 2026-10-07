import { deptLabel } from './items'
import { searchItems, type NewsItem } from './public'
import { PAGE_SIZE, STATEWIDE, type Filters, type ReleasePage } from './release-filters'

/** The list's filters. The words go through `searchItems`, the same matching
 *  the search palette uses, so the palette and the list cannot disagree. */
export function filterItems(items: NewsItem[], f: Filters): NewsItem[] {
  const dept = deptLabel(f.dept)
  const base = items.filter((i) => {
    if (f.district === STATEWIDE && i.districtId) return false
    if (f.district && f.district !== STATEWIDE && i.districtId !== f.district) return false
    if (f.minister && !i.ministers.includes(f.minister)) return false
    if (dept && i.dept !== dept) return false
    if (f.lang && i.language !== f.lang) return false
    if (f.cm && !i.cm) return false
    if (f.topic && i.topic !== f.topic) return false
    if (f.from && i.date < f.from) return false
    if (f.to && i.date > f.to) return false
    return true
  })
  return f.q ? searchItems(base, f.q) : base
}

export function releasePage(items: NewsItem[], f: Filters): ReleasePage {
  const filtered = filterItems(items, f)
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(f.page, pages)
  return {
    shown: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    matched: filtered.length,
    total: items.length,
    page,
    pages,
    deptName: f.dept ? (deptLabel(f.dept) ?? f.dept) : null,
  }
}
