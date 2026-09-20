import type { Article } from '@/lib/types'
import {
  type FeatureArticle,
  type CategoryKey,
  type MinisterKey,
  type DepartmentKey,
  STATEWIDE,
} from './feature'
import { resolveDistrict, districtName } from '@/lib/districts'
import { releaseBodyLines, summary60 } from '@/lib/dgipr/summary'

function inferCategory(article: Article): CategoryKey {
  if (article.category === 'cm') return 'cabinet'
  const text = `${article.title} ${article.body} ${article.raw_text}`
  if (/मंत्रिमंडळ|कॅबिनेट|निर्णय/.test(text)) return 'cabinet'
  if (/योजना|अनुदान|लाभ|सबसिडी|पेन्शन|विमा/.test(text)) return 'scheme'
  if (/विकास|प्रकल्प|उद्घाटन|भूमिपूजन|पायाभूत|रस्ता|पूल/.test(text)) return 'development'
  if (/कल्याण|मदत|आरोग्य|तपासणी|सहाय्य/.test(text)) return 'welfare'
  return 'administration'
}

function inferMinister(article: Article): Exclude<MinisterKey, 'all'> {
  const text = `${article.attribution ?? ''} ${article.office ?? ''} ${article.title}`
  if (/उपमुख्यमंत्री/.test(text)) return 'dcm'
  if (/मुख्यमंत्री/.test(text) || article.category === 'cm') return 'cm'
  if (/कृषी/.test(text)) return 'agriculture'
  if (/उद्योग/.test(text)) return 'industries'
  if (/महसूल/.test(text)) return 'revenue'
  if (/शिक्षण/.test(text)) return 'school-education'
  if (/आरोग्य/.test(text)) return 'health'
  if (/महिला|बालविकास/.test(text)) return 'wcd'
  if (/नगरविकास/.test(text)) return 'urban'
  if (/ग्रामविकास/.test(text)) return 'rural'
  return 'general'
}

function inferDepartment(article: Article): Exclude<DepartmentKey, 'all'> {
  const text = `${article.department ?? ''} ${article.office ?? ''} ${article.title} ${article.body}`
  if (/कृषी|शेतकरी/.test(text)) return 'agriculture'
  if (/उद्योग|एमआयडीसी/.test(text)) return 'industries'
  if (/आरोग्य|रुग्णालय|वैद्यकीय/.test(text)) return 'health'
  if (/शालेय शिक्षण|महाविद्यालय|विद्यार्थी|शिक्षण/.test(text)) return 'school-education'
  if (/महिला|बालविकास|लाडकी बहीण/.test(text)) return 'wcd'
  if (/महसूल|जमीन|नोंदणी/.test(text)) return 'revenue'
  if (/नगरविकास|महानगरपालिका|पालिका/.test(text)) return 'urban'
  if (/ग्रामविकास|पंचायत|गाव/.test(text)) return 'rural'
  if (/जलसंपदा|धरण|सिंचन|पाणीपुरवठा/.test(text)) return 'water'
  return 'general'
}

export function toFeatureArticle(article: Article): FeatureArticle {
  const title = article.title || article.raw_text.split(/\n/)[0]?.trim() || 'शासकीय वृत्त'
  const bodyText = article.body || article.raw_text
  const lines = releaseBodyLines(bodyText)
  const body = lines.length > 0 ? lines : [bodyText]
  const sum60 = summary60(bodyText, {
    titleMr: article.title,
    attributionMr: article.attribution,
  }) || body[0] || ''

  const resolvedDist = article.district ? resolveDistrict(article.district) : null
  const dist = resolvedDist ?? STATEWIDE

  return {
    id: String(article.id),
    title,
    subtitle: article.attribution || article.department || article.office || '',
    excerpt: sum60,
    summary60: sum60,
    body,
    highlights: article.bullets && article.bullets.length > 0 ? article.bullets : [],
    category: inferCategory(article),
    minister: inferMinister(article),
    department: inferDepartment(article),
    district: dist,
    publishedAt: article.fold_date || article.submitted_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    keywords: [
      ...(article.bullets || []),
      ...(resolvedDist ? [districtName(resolvedDist)] : []),
      ...(article.department ? [article.department] : []),
    ],
    dateline: article.dateline || (resolvedDist ? districtName(resolvedDist) : 'मुंबई'),
    byline: article.byline || article.office || 'माहिती व जनसंपर्क महासंचालनालय',
    heroImage: article.poster_url || undefined,
  }
}

