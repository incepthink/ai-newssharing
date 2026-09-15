/** Devanagari numerals and date formatting, as DGIPR writes them. */

const DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९']

export function toDevanagariDigits(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => DIGITS[Number(d)])
}

export const MONTHS_MR = [
  'जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून',
  'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर',
]

export const WEEKDAYS_MR = [
  'रविवार', 'सोमवार', 'मंगळवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार',
]

function parse(date: string): Date {
  // Treat YYYY-MM-DD as a local calendar date, not a UTC instant.
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** "२ सप्टेंबर २०२६" — the WhatsApp header date. */
export function foldDateMr(date: string): string {
  const dt = parse(date)
  return `${toDevanagariDigits(dt.getDate())} ${MONTHS_MR[dt.getMonth()]} ${toDevanagariDigits(dt.getFullYear())}`
}

/** "दि. १ सप्टेंबर, २०२६" — the fold's top-right date line. */
export function foldDateLineMr(date: string): string {
  const dt = parse(date)
  return `दि. ${toDevanagariDigits(dt.getDate())} ${MONTHS_MR[dt.getMonth()]}, ${toDevanagariDigits(dt.getFullYear())}`
}

/** "मंगळवार, दि. १ सप्टेंबर, २०२६." — the fold's weekday line. */
export function foldWeekdayLineMr(date: string): string {
  const dt = parse(date)
  return `${WEEKDAYS_MR[dt.getDay()]}, ${foldDateLineMr(date)}.`
}

/** "मुंबई, दि. २ :" — the inline dateline that opens a body. */
export function datelineMr(place: string, date: string): string {
  const dt = parse(date)
  return `${place}, दि. ${toDevanagariDigits(dt.getDate())} :`
}

/** English equivalent, for `en` articles: "Mumbai, 2 September :" */
export function datelineEn(place: string, date: string): string {
  const dt = parse(date)
  const month = dt.toLocaleString('en-GB', { month: 'long' })
  return `${place}, ${dt.getDate()} ${month} :`
}

export function todayIso(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
