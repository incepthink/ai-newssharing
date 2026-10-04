/**
 * The public news page's view of a release, and the reading it does over them.
 *
 * Pure: no database, no Node. The server builds `NewsItem`s from the approved
 * corpus (`./items.ts`) and the browser receives them as plain JSON, so search,
 * the fact check and the assistant's fallback answer run the same code on both
 * sides of the wire.
 *
 * TOPICS ARE READ, NOT STORED. The `articles` table has no subject column, and
 * the redesign's topic chips (दुष्काळ २०२६, शेती, …) need one. Until the desk
 * tags releases, a topic is a keyword rule over the headline — and then the
 * summary — of an approved release. It never invents a release, only sorts the
 * ones there are, and a release that matches no rule is simply in no topic.
 */

export type NewsItem = {
  id: string
  /** `/news/<id>` — every surface links to the same page. */
  href: string
  docx: string | null
  title: string
  /** The sixty-word cut, or null when the release has no prose. */
  summary: string | null
  /** Marathi district name, or राज्यव्यापी. */
  place: string
  districtId: string | null
  topic: TopicId | null
  /** The topic's label, else the department, else प्रसिद्धीपत्रक. */
  topicLabel: string
  dept: string | null
  /** `YYYY-MM-DD`, the fold date. */
  date: string
  /** `३ ऑक्टो.` */
  dateLabel: string
  /** `१९:२२` where the desk recorded an approval time, else null — never an
   *  invented hour. */
  time: string | null
  /** `शनिवार, ३ ऑक्टोबर २०२६, १९:२२` */
  dateFull: string
  /** वृत्त क्र. in Devanagari digits, or null. */
  no: string | null
  img: string | null
  credit: string | null
  video: string | null
  cm: boolean
  language: 'mr' | 'hi' | 'en'
  /** A long-form piece (विशेष लेख) rather than a datelined release. */
  feature: boolean
}

/* ------------------------------------------------------------------ topics */

export type TopicId =
  | 'drought'
  | 'farming'
  | 'industry'
  | 'health-education'
  | 'culture'
  | 'safety'
  | 'cities'
  | 'environment'

/** In the order the chips print, and the order a tie is broken in: a drought
 *  inspection that mentions crops is drought coverage first. */
/* Words are matched as substrings, so each must not hide inside another
   word: `चारा` is not here because it is inside `प्रचारा`, nor `चाऱ्या`,
   which is inside `कर्मचाऱ्यां`. */
export const TOPICS: Array<{ id: TopicId; label: string; words: string[] }> = [
  { id: 'drought', label: 'दुष्काळ २०२६', words: ['दुष्काळ', 'पाणीटंचाई', 'टंचाई', 'जलसंधारण', 'पावसाअभावी', 'पावसाचा खंड', 'चारा छावणी', 'चाराटंचाई', 'वैरण', 'बंधारा', 'पाणीपुरवठ'] },
  { id: 'farming', label: 'शेती', words: ['शेतकरी', 'शेतकऱ्यां', 'शेती', 'पीक', 'पिकांच', 'पिकस्थिती', 'शेतपिक', 'कर्जमुक्ती', 'कृषी', 'आंबा', 'काजू', 'फळपिक'] },
  { id: 'industry', label: 'उद्योग', words: ['गुंतवणूक', 'उद्योग', 'समिट', 'इन्व्हेस्ट', 'सामंजस्य करार'] },
  { id: 'health-education', label: 'आरोग्य व शिक्षण', words: ['आरोग्य', 'रुग्णालय', 'शाळा', 'शिक्षण', 'बालक', 'बाल विकास', 'विद्यार्थी', 'विद्यापीठ', 'अंगणवाडी'] },
  { id: 'culture', label: 'संस्कृती', words: ['मराठी भाषा', 'मराठी', 'गांधी', 'फुले', 'जयंती', 'संस्कृती', 'साहित्य'] },
  { id: 'safety', label: 'आपत्ती व सुरक्षा', words: ['भूकंप', 'सायबर', 'आपत्ती', 'पूरस्थिती', 'पूरग्रस्त', 'अतिवृष्टी', 'सुरक्षा'] },
  { id: 'cities', label: 'शहरे व सुविधा', words: ['धारावी', 'एसटी', 'वीज', 'कुंभ', 'प्रवास', 'मेट्रो', 'रस्ते', 'गृहनिर्माण'] },
  { id: 'environment', label: 'पर्यावरण', words: ['वनसंपद', 'वन विभाग', 'वनविभाग', 'जैवविविधता', 'पर्यावरण', 'वन्यजीव', 'वृक्ष'] },
]

const TOPIC_BY_ID = new Map(TOPICS.map((t) => [t.id, t]))

export function topicLabel(id: TopicId): string {
  return TOPIC_BY_ID.get(id)?.label ?? id
}

export function isTopic(id: string): id is TopicId {
  return TOPIC_BY_ID.has(id as TopicId)
}

/**
 * The headline decides — the first topic, in chip order, with a word in it.
 * The summary only breaks a silence, and only when one topic has at least two
 * of its words there: a passing "आरोग्य" in a programme report is not a
 * health story.
 */
export function topicOf(title: string, summary: string | null): TopicId | null {
  const lead = TOPICS.find((t) => t.words.some((w) => title.includes(w)))
  if (lead) return lead.id
  if (!summary) return null
  let best: { id: TopicId; n: number } | null = null
  for (const t of TOPICS) {
    const n = t.words.filter((w) => summary.includes(w)).length
    if (n >= 2 && (!best || n > best.n)) best = { id: t.id, n }
  }
  return best?.id ?? null
}

/* ---------------------------------------------------------------- numerals */

const DEVA = '०१२३४५६७८९'

export function mrDigits(v: number | string): string {
  return String(v).replace(/[0-9]/g, (d) => DEVA[Number(d)])
}

/** Words of three letters or more, digits normalised to Devanagari — the unit
 *  every comparison below works in. */
function words(text: string): string[] {
  return mrDigits(text)
    .split(/[\s,.!?“”‘’'"()–—\-:;।*#|/]+/)
    .filter((w) => w.length >= 3)
}

/* ------------------------------------------------------------------ search */

/**
 * Title, place, department, topic and वृत्त क्र., every word required. Latin
 * digits are read as Devanagari, so `217711` finds `२१७७११`.
 */
export function searchItems(items: NewsItem[], query: string): NewsItem[] {
  const terms = mrDigits(query.trim()).toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return []
  return items.filter((r) => {
    const hay = [r.title, r.place, r.dept ?? '', r.topicLabel, r.no ?? '', r.summary ?? ''].join(' ').toLowerCase()
    return terms.every((t) => hay.includes(t))
  })
}

/* -------------------------------------------------------------- fact check */

export type Verdict =
  | { kind: 'match'; ids: string[]; by: 'no' | 'text' }
  | { kind: 'partial'; ids: string[] }
  | { kind: 'none'; no?: string }

/**
 * A forwarded message against the approved record.
 *
 * A six-digit number is read as a वृत्त क्र. and either is one or is not.
 * Otherwise the share of a release's headline words the message contains:
 * most of them is a match, a third is "partly — compare the figures", and less
 * is not found. It says what the record holds, never whether a claim is true.
 */
export function verifyMessage(items: NewsItem[], text: string): Verdict | null {
  const t = mrDigits((text || '').trim())
  if (!t) return null

  const num = t.match(/[०-९]{6}/)
  if (num) {
    const r = items.find((x) => x.no === num[0])
    return r ? { kind: 'match', ids: [r.id], by: 'no' } : { kind: 'none', no: num[0] }
  }

  if (!words(t).length) return { kind: 'none' }

  const scored = items
    .map((r) => {
      const rw = words(r.title)
      const hit = rw.filter((w) => t.includes(w)).length
      return { id: r.id, score: rw.length ? hit / rw.length : 0 }
    })
    .sort((a, b) => b.score - a.score)

  if (scored[0] && scored[0].score >= 0.6) return { kind: 'match', ids: [scored[0].id], by: 'text' }
  const near = scored.filter((x) => x.score >= 0.3).slice(0, 2).map((x) => x.id)
  if (near.length) return { kind: 'partial', ids: near }
  return { kind: 'none' }
}

/* --------------------------------------------------------------- retrieval */

/** Question words that say nothing about which release is meant. */
const STOP = new Set([
  'काय', 'कधी', 'कसे', 'कशी', 'कोण', 'कोणी', 'किती', 'कुठे', 'आहे', 'आहेत', 'होते', 'होणार', 'मिळेल', 'मिळणार',
  'बद्दल', 'साठी', 'करत', 'करणार', 'केले', 'झाले', 'बातम्या', 'बातमी', 'माहिती', 'शासन', 'शासनाने', 'सांगा',
  'what', 'when', 'how', 'the', 'about',
])

/** Marathi case endings and postpositions, longest first. */
const ENDINGS = ['मध्ये', 'साठी', 'बाबत', 'विषयी', 'कडून', 'कडे', 'तील', 'च्या', 'ांना', 'हून', 'चा', 'ची', 'चे', 'ला', 'ना', 'ने', 'नी', 'त']
/** Trailing vowel signs, virama and anusvara. */
const TRAILING_MARKS = /[ा-्ंः]+$/

/**
 * A light stem: the ending off, then the trailing vowel sign, so
 * `चंद्रपूरमध्ये` finds `चंद्रपूर` and `दुष्काळासाठी` finds `दुष्काळ`. Never
 * shorter than three letters.
 */
function stem(w: string): string {
  let s = w
  const end = ENDINGS.find((e) => s.endsWith(e) && s.length - e.length >= 3)
  if (end) s = s.slice(0, -end.length)
  const bare = s.replace(TRAILING_MARKS, '')
  return bare.length >= 3 ? bare : s
}

/**
 * The releases a question is most about, best first. A question of three or
 * more content words must share two of them with a release — one common word
 * in common is not a source.
 */
export function retrieve(items: NewsItem[], question: string, k = 6): NewsItem[] {
  const qw = words(question).filter((w) => !STOP.has(w.toLowerCase()))
  if (!qw.length) return []
  const stems = qw.map(stem)
  const need = qw.length >= 3 ? 2 : 1
  return items
    .map((r) => {
      const hay = `${r.title} ${r.summary ?? ''} ${r.place} ${r.topicLabel}`
      return { r, n: stems.filter((w) => hay.includes(w)).length }
    })
    .filter((x) => x.n >= need)
    .sort((a, b) => b.n - a.n)
    .slice(0, k)
    .map((x) => x.r)
}

export type Answer = { text: string; cites: string[]; fc?: boolean }

const FACT_WORDS = /खरा|खरी|खरे|फेक|खोट|अफवा|पडताळ|सत्य/

export function asksFactCheck(question: string): boolean {
  return FACT_WORDS.test(question)
}

/**
 * The assistant without a model: rules over the approved releases, always
 * citing them, and saying so when nothing is found. This is what answers when
 * no API key is configured or the model fails — never a guess.
 */
export function ruleAnswer(items: NewsItem[], question: string, today: string): Answer {
  const t = mrDigits(question.trim())
  const short = (r: NewsItem) => `“${r.title}” (${r.place})`

  if (asksFactCheck(t)) {
    const v = verifyMessage(items, t.replace(/हा|मेसेज|संदेश|खरा|खरी|खरे|आहे|का\?|का/g, ' '))
    if (v && v.kind === 'match') return { text: 'हो — हा मजकूर मंजूर प्रसिद्धीपत्रकाशी जुळतो. मूळ प्रत खाली आहे.', cites: v.ids }
    return {
      text: 'संदेश खरा आहे का ते तपासण्यासाठी तो “फॅक्ट चेक” मध्ये पेस्ट करा — तो मंजूर प्रसिद्धीपत्रकांशी जुळवून दाखवला जाईल.',
      cites: [],
      fc: true,
    }
  }

  const num = t.match(/[०-९]{6}/)
  if (num) {
    const r = items.find((x) => x.no === num[0])
    if (r) return { text: `वृत्त क्र. ${num[0]} हे ${short(r)} आहे.`, cites: [r.id] }
    return { text: `वृत्त क्र. ${num[0]} मंजूर नोंदीत सापडला नाही. क्रमांक पुन्हा तपासा.`, cites: [] }
  }

  if (/आज|ताज/.test(t)) {
    const todays = items.filter((r) => r.date === today)
    if (todays.length) {
      const lead = todays[0]
      return {
        text: `आज ${mrDigits(todays.length)} प्रसिद्धीपत्रके मंजूर झाली. सर्वात ताजे: ${short(lead)}${lead.time ? `, ${lead.time} वाजता` : ''}.`,
        cites: todays.slice(0, 3).map((r) => r.id),
      }
    }
    const latest = items.slice(0, 3)
    if (latest.length) {
      return { text: `आज अद्याप प्रसिद्धीपत्रक मंजूर झालेले नाही. सर्वात अलीकडील: ${short(latest[0])}, ${latest[0].dateLabel}.`, cites: latest.map((r) => r.id) }
    }
  }

  const place = [...new Set(items.filter((r) => r.districtId).map((r) => r.place))].find(
    (p) => t.includes(p) || t.includes(p.split(' ')[0]),
  )
  const placeAnswer = (p: string): Answer => {
    const list = items.filter((r) => r.place === p)
    return {
      text: `${p} जिल्ह्यातील ${mrDigits(list.length)} अलीकडील प्रसिद्धीपत्रके. सर्वात ताजे: ${short(list[0])}.`,
      cites: list.slice(0, 3).map((r) => r.id),
    }
  }
  /* "सिंधुदुर्गच्या बातम्या" asks for a district; a longer question that
     names one is asking something about it, and the release that answers it
     is a better reply than the district's newest. */
  const content = words(t).filter((w) => !STOP.has(w.toLowerCase()))
  if (place && content.length <= 1) return placeAnswer(place)

  const best = retrieve(items, t, 3)
  if (best.length) {
    const lead = best[0]
    return {
      text: `${lead.summary ? `${lead.summary} — ` : ''}स्रोत: ${short(lead)}, ${lead.dateLabel}.`,
      cites: best.map((r) => r.id),
    }
  }
  if (place) return placeAnswer(place)

  const topic = TOPICS.find((x) => x.words.some((w) => t.includes(w)))
  if (topic) {
    const ranked = retrieve(items.filter((r) => r.topic === topic.id), t, 50)
    const list = ranked.length ? ranked : items.filter((r) => r.topic === topic.id)
    if (list.length) {
      const lead = list.find((r) => r.summary) ?? list[0]
      return {
        text: `“${topic.label}” विषयावर ${mrDigits(list.length)} अलीकडील प्रसिद्धीपत्रके आहेत. ${lead.summary ? `${lead.summary} — ` : ''}स्रोत: ${short(lead)}.`,
        cites: list.slice(0, 3).map((r) => r.id),
      }
    }
  }

  return { text: NOTHING_FOUND, cites: [] }
}

export const NOTHING_FOUND =
  'याबद्दल मंजूर प्रसिद्धीपत्रकांमध्ये माहिती सापडली नाही. मी फक्त महासंचालनालयाने मंजूर केलेल्या बातम्यांवरून उत्तर देतो — अंदाज करत नाही. जिल्हा, योजना किंवा वृत्त क्रमांक लिहून पाहा.'

/** The issuing line every copy and every assistant citation carries. */
export const AUTHORITY_MR = 'माहिती व जनसंपर्क महासंचालनालय, महाराष्ट्र शासन'

export function copyText(r: Pick<NewsItem, 'title' | 'summary' | 'no'>): string {
  return `${r.title}\n\n${r.summary ?? ''}${r.no ? `\n\nवृत्त क्र. ${r.no}` : ''}\n— ${AUTHORITY_MR}`
}
