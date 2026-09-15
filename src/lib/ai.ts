import OpenAI from 'openai'
import { DISTRICTS, resolveDistrict } from './districts'
import type { Article, Category, Extraction, Language } from './types'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

let _client: OpenAI | null = null
function client(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set')
    _client = new OpenAI({ apiKey })
  }
  return _client
}

const DISTRICT_LIST = DISTRICTS.map((d) => `${d.key} = ${d.mr} / ${d.en}`).join('\n')

const EXTRACT_PROMPT = `You are processing a press release for the Maharashtra Directorate General of Information and Public Relations (DGIPR).

A district information officer has pasted raw article text with no structure — no separate title, no metadata. Extract the following and return JSON only.

1. "language": the language the article is written in. Exactly one of "mr" (Marathi), "hi" (Hindi), "en" (English).

2. "title": a headline for the article, WRITTEN IN THE SAME LANGUAGE AS THE ARTICLE. If the text already opens with something that reads as a headline, use it verbatim. Otherwise write one from the content. Do not translate.

3. "district": the Maharashtra district the news is actually about — the place where the thing happened, not the office that filed it. Return the exact key from this list, or null if the article is statewide, national, or the district is genuinely unclear:

${DISTRICT_LIST}

Return null rather than guessing. A wrong district is worse than a missing one.

4. "dateline": the place name that opens the article's dateline if there is one (e.g. "मुंबई", "Mumbai", "पुणे"), otherwise null.

5. "category": "cm" or "general". Return "cm" when the release is Chief Minister or cabinet business — it comes from the Chief Minister's secretariat (मुख्यमंत्री सचिवालय), reports a cabinet decision (मंत्रिमंडळ निर्णय), or its substance is what the Chief Minister announced, decided, directed, said or attended. Return "general" for everything else, including releases that merely mention the Chief Minister in passing — a minister's or collector's announcement is not CM business. This is a suggestion; the news desk confirms it.

Return only a JSON object with keys: language, title, district, dateline, category.`

/**
 * One call at submission. Everything else the system needs is derivable later,
 * so this stays deliberately small.
 */
export async function extractArticle(rawText: string): Promise<Extraction> {
  const res = await client().chat.completions.create({
    model: MODEL,
    response_format: { type: 'json_object' },
    // No temperature: the newer models accept only the default and reject the
    // call outright otherwise. The JSON response format carries the determinism
    // that mattered here.
    messages: [
      { role: 'system', content: EXTRACT_PROMPT },
      { role: 'user', content: rawText.slice(0, 20000) },
    ],
  })

  const parsed = JSON.parse(res.choices[0]?.message?.content ?? '{}')
  const language: Language = ['mr', 'hi', 'en'].includes(parsed.language) ? parsed.language : 'mr'

  const category: Category = parsed.category === 'cm' ? 'cm' : 'general'

  return {
    language,
    category,
    title: typeof parsed.title === 'string' ? parsed.title.trim() : '',
    // Never trust the model's district directly — resolve it against the
    // canonical list so an invented or misspelled name becomes null.
    district: resolveDistrict(parsed.district),
    dateline: typeof parsed.dateline === 'string' ? parsed.dateline.trim() : null,
  }
}

const SUMMARY_LANG: Record<Language, string> = {
  mr: 'Marathi (मराठी)',
  hi: 'Hindi (हिन्दी)',
  en: 'English',
}

/**
 * The 60-word summary for WhatsApp. Generated on demand against the approved
 * text, in the article's own language — never translated.
 */
export async function summarise(article: Pick<Article, 'title' | 'body' | 'language'>): Promise<string> {
  const lang = SUMMARY_LANG[article.language]
  const res = await client().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `Summarise this government press release in approximately 60 words, written in ${lang}. This is the same language as the source — do not translate it.

Rules:
- Lead with the substance: who decided or announced what, and what changes.
- Keep official designations and scheme names exactly as written in the source.
- One paragraph. No headline, no bullet points, no preamble, no quotation marks.
- Do not open with the dateline; it is added separately.

Return only the summary text.`,
      },
      { role: 'user', content: `${article.title}\n\n${article.body}`.slice(0, 20000) },
    ],
  })
  return (res.choices[0]?.message?.content ?? '').trim()
}
