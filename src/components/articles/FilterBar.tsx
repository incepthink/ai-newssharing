'use client'

import { DIVISIONS, divisionDistricts } from '@/lib/divisions'
import { toDevanagariDigits } from '@/lib/marathi'
import {
  DEPARTMENTS,
  MINISTERS,
  SORTS,
  STATEWIDE,
  STATEWIDE_LABEL,
  departmentLabel,
  districtLabel,
  isFiltered,
  ministerLabel,
  type Filters,
} from '@/lib/articles/feature'
import { IconClose, IconSliders, SearchField } from '@/components/ui'

/**
 * Search, four facets, and a plain statement of what is currently on.
 *
 * The district select is where the map used to be. A flat list of 36 names is
 * a worse instrument than a map, so the options are grouped under their
 * revenue division — a reader looks for कोकण and finds सिंधुदुर्ग inside it,
 * which is the one thing the map was genuinely good at. राज्यव्यापी sits above
 * the groups because statewide news belongs to no division.
 *
 * The chip row below is not decoration. Four dropdowns can silently hide most
 * of the corpus, and "why is there only one article" is a question the page
 * should answer without being asked.
 */
export function FilterBar({
  value,
  onChange,
  onReset,
  shown,
  total,
}: {
  value: Filters
  onChange: (patch: Partial<Filters>) => void
  onReset: () => void
  shown: number
  total: number
}) {
  const filtered = isFiltered(value)

  const chips = [
    value.q.trim() && {
      key: 'q',
      label: `“${value.q.trim()}”`,
      clear: () => onChange({ q: '' }),
    },
    value.minister !== 'all' && {
      key: 'minister',
      label: ministerLabel(value.minister),
      clear: () => onChange({ minister: 'all' }),
    },
    value.department !== 'all' && {
      key: 'department',
      label: departmentLabel(value.department),
      clear: () => onChange({ department: 'all' }),
    },
    value.district !== '' && {
      key: 'district',
      label: districtLabel(value.district),
      clear: () => onChange({ district: '' }),
    },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[]

  return (
    <div
      className="sticky top-14 z-30 -mx-4 border-b px-4 py-3 sm:-mx-6 sm:px-6"
      style={{
        borderColor: 'var(--edge)',
        background: 'rgb(246 245 242 / 0.88)',
        backdropFilter: 'saturate(180%) blur(10px)',
        WebkitBackdropFilter: 'saturate(180%) blur(10px)',
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full min-w-[14rem] sm:w-auto sm:grow sm:max-w-md">
          <SearchField
            value={value.q}
            onChange={(q) => onChange({ q })}
            placeholder="शीर्षक, सारांश किंवा विषय शोधा…"
          />
        </div>

        <select
          className="field w-auto max-w-[11rem]"
          value={value.minister}
          onChange={(e) => onChange({ minister: e.target.value as Filters['minister'] })}
          aria-label="मंत्र्यानुसार"
        >
          {MINISTERS.map((m) => (
            <option key={m.key} value={m.key}>{m.mr}</option>
          ))}
        </select>

        <select
          className="field w-auto max-w-[11rem]"
          value={value.department}
          onChange={(e) => onChange({ department: e.target.value as Filters['department'] })}
          aria-label="विभाग"
        >
          {DEPARTMENTS.map((d) => (
            <option key={d.key} value={d.key}>{d.mr}</option>
          ))}
        </select>

        <select
          className="field w-auto max-w-[11rem]"
          value={value.district}
          onChange={(e) => onChange({ district: e.target.value })}
          aria-label="जिल्हा किंवा महसूल विभाग"
        >
          <option value="">सर्व जिल्हे</option>
          <option value={STATEWIDE}>{STATEWIDE_LABEL}</option>
          {DIVISIONS.map((div) => (
            <optgroup key={div.key} label={div.mr}>
              {divisionDistricts(div).map((d) => (
                <option key={d.key} value={d.key}>{d.mr}</option>
              ))}
            </optgroup>
          ))}
        </select>

        <select
          className="field w-auto max-w-[11rem]"
          value={value.sort}
          onChange={(e) => onChange({ sort: e.target.value as Filters['sort'] })}
          aria-label="क्रम"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>{s.mr}</option>
          ))}
        </select>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span
          className="badge"
          aria-live="polite"
          style={{ background: 'var(--surface)', fontWeight: 600 }}
        >
          <IconSliders size={11} />
          {filtered
            ? `${toDevanagariDigits(shown)} / ${toDevanagariDigits(total)} लेख`
            : `${toDevanagariDigits(total)} लेख`}
        </span>

        {chips.map((c) => (
          <span key={c.key} className="chip-filter">
            {c.label}
            <button type="button" onClick={c.clear} aria-label={`${c.label} फिल्टर काढा`}>
              <IconClose size={10} />
            </button>
          </span>
        ))}

        {filtered && (
          <button type="button" className="btn-quiet btn-sm" onClick={onReset}>
            सर्व फिल्टर्स काढा
          </button>
        )}
      </div>
    </div>
  )
}
