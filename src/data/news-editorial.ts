import type { TopicId } from '@/lib/news/public'

/**
 * The editorial inputs the public news page needs and the `articles` table
 * does not hold.
 *
 * Each of these is a decision someone at the directorate makes — which story
 * is the special coverage this week, which figures it leads with, what readers
 * are searching for — so it lives here as one edit, not scattered through the
 * page. Every figure names the release it was taken from, and every link
 * resolves against the approved corpus: a decision here can choose and frame
 * releases, never stand in for one.
 */

export type SpecialCoverage = {
  /** Section id and the masthead pill's anchor. */
  anchor: string
  kicker: string
  title: string
  /** The releases in it: the ones a topic rule picks out, or — for a story
   *  no topic covers — the ones a search of the approved corpus finds. */
  select: { topic: TopicId } | { query: string }
  /** Mahasamvad's own category for the story, where it files one. Its posts
   *  are in the scheme whatever their headline says; `select` still adds the
   *  desk's own releases, which carry no category. */
  category?: string
  /** Whether `/news` gives it a band of its own. Every scheme is in the
   *  masthead's menu and on `/yojana` either way. */
  onHome?: boolean
  /** Headline figures, each with the वृत्त क्र. it was taken from. Empty
   *  until an approved release states them. */
  figures: Array<{ value: string; label: string; source: string }>
  /** Key decisions; each opens a search of the approved corpus. */
  decisions: Array<{ label: string; query: string }>
}

/** The special coverage bands, in page order. */
export const SPECIAL_COVERAGE: SpecialCoverage[] = [
  /* दुष्काळ २०२६ — figures from releases 217495 and 217547. */
  {
    anchor: 'drought',
    kicker: 'विशेष वृत्तांकन',
    title: 'दुष्काळ २०२६ : शासन काय करत आहे',
    select: { topic: 'drought' },
    category: 'दुष्काळ २०२६',
    onHome: true,
    figures: [
      { value: '२६५', label: 'दुष्काळसदृश तालुके', source: '२१७४९५' },
      { value: '१२', label: 'उपाययोजना सुरू', source: '२१७४९५' },
      { value: '१९', label: 'तालुक्यांत सर्वेक्षण', source: '२१७५४७' },
    ],
    decisions: [
      { label: 'पीक कर्जाचे मध्यम मुदतीच्या कर्जात पुनर्गठन; वसुलीला स्थगिती', query: 'पुनर्गठन' },
      { label: 'विद्यार्थ्यांच्या परीक्षा शुल्क माफीसह इतर मदत', query: 'परीक्षा शुल्क' },
      { label: 'वैरण विकास कार्यक्रम — चारा सुरक्षा', query: 'वैरण' },
    ],
  },
  /* कर्जमुक्ती २०२६ — no topic rule covers it (शेती holds the word), so its
     releases are the ones a search for it finds. Figures from release 217559
     (१ ऑक्टोबर): the third phase, and the running total of all three. */
  {
    anchor: 'karjmukti',
    kicker: 'विशेष वृत्तांकन',
    title: 'कर्जमुक्ती २०२६ : शेतकऱ्यांसाठी शासन काय करत आहे',
    select: { query: 'कर्जमुक्ती' },
    category: 'कर्जमुक्ती २०२६',
    onHome: true,
    figures: [
      { value: '१५.८५ लाख', label: 'शेतकऱ्यांना लाभ (तीन टप्पे)', source: '२१७५५९' },
      { value: '१३,२७५', label: 'कोटी रुपये वितरित', source: '२१७५५९' },
      { value: '३.२७ लाख', label: 'तिसऱ्या टप्प्यातील शेतकरी', source: '२१७५५९' },
    ],
    decisions: [
      { label: 'पुण्यश्लोक अहिल्यादेवी होळकर शेतकरी कर्जमुक्ती योजना', query: 'अहिल्यादेवी होळकर' },
      { label: 'तिसऱ्या टप्प्यात ३,१६० कोटी रुपयांचे वितरण', query: 'तिसऱ्या टप्प्यात' },
      { label: 'पात्र शेतकऱ्यांसाठी आधार प्रमाणीकरण', query: 'आधार प्रमाणीकरण' },
      { label: 'सावकारीविरोधात जनजागृती — महाराष्ट्र सावकारी (नियमन) अधिनियम, २०१४', query: 'सावकारी' },
    ],
  },
  /* The rest follow Mahasamvad's own special-coverage categories. Figures
     only where a release's headline states one: कुंभमेळा from release
     210039 (७ ऑगस्ट), दावोस from 188467 (२२ जानेवारी). */
  {
    anchor: 'lokasamvad',
    kicker: 'जनसंपर्क अभियान',
    title: 'लोकसंवाद २०२६ : शासनाच्या योजना जनतेपर्यंत',
    select: { query: 'लोकसंवाद' },
    category: 'लोकसंवाद २०२६',
    figures: [],
    decisions: [
      { label: 'सेवा संकल्प अभियान', query: 'सेवा संकल्प' },
      { label: 'गणेशोत्सव मंडळांतून योजनांचा जागर', query: 'गणेशोत्सव' },
      { label: 'रोजगार मेळावे', query: 'रोजगार मेळाव' },
    ],
  },
  {
    anchor: 'kumbhmela',
    kicker: 'विशेष वृत्तांकन',
    title: 'कुंभमेळा २०२७-२८ : नाशिक-त्र्यंबकेश्वर सिंहस्थाची तयारी',
    select: { query: 'कुंभमेळ' },
    category: 'कुंभमेळा २०२७-२८',
    figures: [{ value: '३४,७३२ कोटी', label: 'रुपयांचा विकास आराखडा', source: '२१००३९' }],
    decisions: [
      { label: 'सिंहस्थ विकास आराखडा', query: 'आराखड' },
      { label: 'गर्दी, वाहतूक व स्वच्छतेचे नियोजन', query: 'गर्दी व्यवस्थापन' },
      { label: 'पर्यावरणपूरक कुंभमेळा — घनकचरा व्यवस्थापन', query: 'घनकचऱ्' },
    ],
  },
  {
    anchor: 'adhiveshan',
    kicker: 'विधिमंडळ',
    title: 'पावसाळी अधिवेशन २०२६ : विधिमंडळाचे कामकाज',
    select: { query: 'पावसाळी अधिवेशन' },
    category: 'पावसाळी अधिवेशन २०२६',
    figures: [],
    decisions: [
      { label: 'विधानसभा प्रश्नोत्तरे', query: 'विधानसभा प्रश्नोत्तरे' },
      { label: 'विधानपरिषद प्रश्नोत्तरे', query: 'विधानपरिषद प्रश्नोत्तरे' },
      { label: 'लक्षवेधी सूचना', query: 'लक्षवेधी' },
    ],
  },
  {
    anchor: 'davos',
    kicker: 'गुंतवणूक',
    title: 'दावोस परिषद २०२६ : महाराष्ट्रात गुंतवणूक',
    select: { query: 'दावोस' },
    category: 'दावोस परिषद २०२६',
    figures: [{ value: '३० लाख कोटी', label: 'रुपयांचे सामंजस्य करार', source: '१८८४६७' }],
    decisions: [{ label: 'सामंजस्य करार', query: 'सामंजस्य करार' }],
  },
]

/** सध्या चर्चेत — label and the search it opens. A chip whose search finds
 *  nothing in the approved corpus is not shown. */
export const TRENDING: Array<{ label: string; query: string }> = [
  { label: 'दुष्काळ २०२६', query: 'दुष्काळ' },
  { label: 'कर्जमुक्ती २०२६', query: 'कर्जमुक्ती' },
  { label: 'अभिजात मराठी भाषा सप्ताह', query: 'मराठी' },
  { label: 'गांधी जयंती', query: 'गांधी' },
  { label: 'इन्व्हेस्ट महाराष्ट्र', query: 'इन्व्हेस्ट' },
  { label: 'भूकंप — नांदेड', query: 'भूकंप' },
  { label: 'कुंभमेळा २०२७', query: 'कुंभमेळा' },
  { label: 'पीक नुकसान', query: 'पीक' },
  { label: 'लोकसंवाद २०२६', query: 'लोकसंवाद' },
  { label: 'सेवा संकल्प अभियान', query: 'सेवा संकल्प' },
  { label: 'गणेशोत्सव', query: 'गणेशोत्सव' },
  { label: 'यलो अलर्ट', query: 'यलो अलर्ट' },
  { label: 'भरती परीक्षा सुधारणा', query: 'भरती परीक्षा' },
]

/** A video programme: its episodes are the releases announcing its
 *  interviews (`programmeEpisodes` in `lib/news/hubs.ts`). */
export type VideoProgramme = {
  /** `/video/<slug>`, and the band's anchor on `/news`. */
  slug: string
  name: string
}

/** The programmes on `/video`, in page order. */
export const VIDEO_PROGRAMMES: VideoProgramme[] = [
  { slug: 'jai-maharashtra', name: 'जय महाराष्ट्र' },
  { slug: 'dilkhulas', name: 'दिलखुलास' },
]

/** The masthead's pill navigation. Every href is a section of `/news`;
 *  योजना and व्हिडिओ land on their bands there, which lead on to the
 *  `/yojana` and `/video` pages. */
export const MAIN_NAV: Array<{ label: string; href: string; phone?: boolean }> = [
  { label: 'मुख्यपृष्ठ', href: '#top', phone: true },
  { label: 'वृत्त विशेष', href: '#releases', phone: true },
  { label: 'योजना', href: '#yojana', phone: true },
  { label: 'व्हिडिओ', href: '#video', phone: true },
  { label: 'फॅक्ट चेक', href: '#factcheck', phone: true },
]

/** बातम्या थेट तुमच्याकडे. Only Telegram is live; the others say what they
 *  are waiting on rather than linking somewhere unverified. */
export const SUBSCRIBE: Array<{ name: string; blurb: string; url?: string; status?: string }> = [
  { name: 'Telegram', blurb: 'प्रत्येक प्रसिद्धीपत्रक, मंजूर होताच', url: 'https://t.me/MahaDGIPR' },
  { name: 'WhatsApp चॅनेल', blurb: 'दिवसाचा सारांश', status: 'पडताळणी प्रलंबित' },
  { name: 'ईमेल व RSS', blurb: 'जिल्हा किंवा विषयानुसार', status: 'लवकरच' },
]

/**
 * The फॅक्ट चेक tool matches a message against approved releases, which is
 * safe to run today. Sending a message on to a fact-check team, and publishing
 * that team's verdicts, waits on DGIPR confirming an official fact-check
 * function — per the brief. Flip this when it exists.
 */
export const FACT_CHECK_TEAM_LIVE = false
