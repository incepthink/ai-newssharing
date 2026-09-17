/**
 * The six revenue divisions, and which districts sit under each.
 *
 * The public articles page replaces the staff map with a district dropdown, and
 * a flat list of 36 names in a select is a worse instrument than the map it
 * replaces. Grouped under their division it becomes scannable again: a reader
 * in Sindhudurg finds कोकण before they find their own district.
 *
 * Division keys are English for the same reason district keys are — they are
 * identifiers, not labels.
 */
import { DISTRICTS, type District } from './districts'

export interface Division {
  key: string
  mr: string
  /** Canonical district keys, in the order the division lists them. */
  districts: string[]
}

export const DIVISIONS: Division[] = [
  {
    key: 'konkan',
    mr: 'कोकण विभाग',
    districts: [
      'mumbai-city', 'mumbai-suburban', 'thane', 'palghar',
      'raigad', 'ratnagiri', 'sindhudurg',
    ],
  },
  {
    key: 'pune',
    mr: 'पुणे विभाग',
    districts: ['pune', 'satara', 'sangli', 'solapur', 'kolhapur'],
  },
  {
    key: 'nashik',
    mr: 'नाशिक विभाग',
    districts: ['nashik', 'dhule', 'nandurbar', 'jalgaon', 'ahilyanagar'],
  },
  {
    key: 'chhatrapati-sambhajinagar',
    mr: 'छत्रपती संभाजीनगर विभाग',
    districts: [
      'chhatrapati-sambhajinagar', 'jalna', 'beed', 'dharashiv',
      'nanded', 'latur', 'parbhani', 'hingoli',
    ],
  },
  {
    key: 'amravati',
    mr: 'अमरावती विभाग',
    districts: ['amravati', 'akola', 'buldhana', 'washim', 'yavatmal'],
  },
  {
    key: 'nagpur',
    mr: 'नागपूर विभाग',
    districts: ['nagpur', 'wardha', 'bhandara', 'gondia', 'chandrapur', 'gadchiroli'],
  },
]

const BY_KEY = new Map(DISTRICTS.map((d) => [d.key, d]))

/** The districts of one division, as full records, skipping any unknown key. */
export function divisionDistricts(division: Division): District[] {
  return division.districts
    .map((k) => BY_KEY.get(k))
    .filter((d): d is District => Boolean(d))
}

const DIVISION_OF = new Map<string, Division>()
for (const div of DIVISIONS) {
  for (const key of div.districts) DIVISION_OF.set(key, div)
}

/** The division a district belongs to, or null for a statewide item. */
export function divisionOf(districtKey: string | null): Division | null {
  if (!districtKey) return null
  return DIVISION_OF.get(districtKey) ?? null
}
