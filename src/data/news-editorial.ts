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
  /** The releases in it are the ones this topic rule picks out. */
  topic: TopicId
  /** Headline figures, each with the वृत्त क्र. it was taken from. */
  figures: Array<{ value: string; label: string; source: string }>
  /** Key decisions; each opens a search of the approved corpus. */
  decisions: Array<{ label: string; query: string }>
  allLabel: string
}

/** दुष्काळ २०२६ — figures from releases 217495 and 217547. */
export const SPECIAL_COVERAGE: SpecialCoverage = {
  anchor: 'drought',
  kicker: 'विशेष वृत्तांकन',
  title: 'दुष्काळ २०२६ : शासन काय करत आहे',
  topic: 'drought',
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
  allLabel: 'दुष्काळ २०२६ — सर्व बातम्या',
}

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

/** The masthead's pill navigation. `query` items open the release list
 *  searched; the rest are anchors on the page. */
export const MAIN_NAV: Array<{ label: string; href: string; highlight?: boolean; phone?: boolean }> = [
  { label: 'मुख्यपृष्ठ', href: '#top', phone: true },
  { label: 'वृत्त विशेष', href: '#releases', phone: true },
  { label: 'जिल्हा वार्ता', href: '#districts', phone: true },
  { label: 'दुष्काळ २०२६', href: '#drought', highlight: true, phone: true },
  { label: 'कर्जमुक्ती २०२६', href: `/news?q=${encodeURIComponent('कर्जमुक्ती')}#releases` },
  { label: 'विशेष लेख', href: '#features', phone: true },
  { label: 'जय महाराष्ट्र', href: '#media' },
  { label: 'लोकराज्य', href: '#media' },
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
