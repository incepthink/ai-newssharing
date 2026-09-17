import { DISTRICTS } from "@/data/districts";
import { DIVISIONS } from "@/data/divisions";
import { MINISTERS } from "@/data/ministers";
import { quantileScale } from "@/lib/news/scale";
import { toDevanagari } from "@/lib/signals/marathi";
import { windowById, windowsFrom } from "@/lib/news/window";
import type { DgiprMap, DgiprRelease } from "@/types/dgipr";
import type {
  DistrictNews,
  MinisterBoard,
  MinisterFilter,
  MinisterTier,
  NewsArticle,
  NewsMap,
  NewsStories,
  Prominence,
  Story,
  StoryStep,
  WindowId,
} from "@/types/news";

/**
 * A stand-in corpus for the news map, generated rather than collected.
 *
 * The real map reads a SQLite store the collector fills every half hour; this
 * page has no collector behind it yet, and a map with nothing on it teaches a
 * reader nothing about what the map is for. So the same shapes the reader
 * would have got — `NewsMap`, `NewsStories`, `DgiprMap` — are assembled here
 * from a seeded generator instead, and every layer above this file is the one
 * that will read the real store when there is one.
 *
 * Three properties are deliberate and load-bearing:
 *
 * - **Deterministic.** The generator is seeded, so the same anchor always
 *   produces the same corpus. This component tree is server-rendered and then
 *   hydrated, and a corpus that rolled fresh dice in the browser would paint
 *   one map on the server and a different one a frame later.
 * - **Anchored, not live.** Every timestamp is measured back from an anchor
 *   the page passes in — see `sampleCorpus`. `new Date()` read inside this
 *   module would be a different instant on the server and in the browser, and
 *   the two halves of one render would disagree about what "२ तासांपूर्वी"
 *   means.
 * - **Skewed the way the real corpus is.** Mumbai files two orders of
 *   magnitude more than Gadchiroli. A flat distribution would make the
 *   choropleth's quantile ramp look like a decorative choice rather than the
 *   only scale that survives this data — see `scale.ts`.
 */

/** Distinct district ids, in the order the boundary file carries them. */
const DISTRICT_IDS = Object.keys(DISTRICTS);

/**
 * Roughly how much press each district generates, as a relative weight.
 *
 * Taken from the shape of the real corpus rather than invented flat: the two
 * Mumbais and Pune carry the metropolitan desks, the divisional headquarters
 * sit in the middle, and the tribal and coastal districts file a handful a
 * week. The absolute numbers mean nothing; the ratios are the point.
 */
const DISTRICT_WEIGHT: Record<string, number> = {
  "mumbai-city": 100,
  "mumbai-suburban": 72,
  pune: 84,
  thane: 58,
  nagpur: 63,
  nashik: 49,
  "chhatrapati-sambhajinagar": 44,
  kolhapur: 33,
  solapur: 29,
  amravati: 27,
  nanded: 25,
  jalgaon: 24,
  ahilyanagar: 23,
  satara: 22,
  sangli: 21,
  raigad: 20,
  latur: 19,
  chandrapur: 18,
  beed: 18,
  palghar: 17,
  akola: 15,
  yavatmal: 15,
  dhule: 13,
  jalna: 13,
  parbhani: 12,
  wardha: 11,
  buldhana: 11,
  ratnagiri: 11,
  dharashiv: 10,
  gondia: 9,
  bhandara: 8,
  nandurbar: 8,
  hingoli: 7,
  washim: 7,
  sindhudurg: 6,
  gadchiroli: 5,
};

/** The mastheads the sample is attributed to, with their web domains. */
const PUBLISHERS = [
  { nameMr: "लोकसत्ता", host: "loksatta.com" },
  { nameMr: "महाराष्ट्र टाइम्स", host: "maharashtratimes.com" },
  { nameMr: "सकाळ", host: "esakal.com" },
  { nameMr: "लोकमत", host: "lokmat.com" },
  { nameMr: "पुढारी", host: "pudhari.news" },
  { nameMr: "दिव्य मराठी", host: "divyamarathi.bhaskar.com" },
  { nameMr: "एबीपी माझा", host: "marathi.abplive.com" },
];

/** Bylines, so a card has a name on it rather than an empty slot. */
const AUTHORS = [
  "प्रतिनिधी",
  "विशेष प्रतिनिधी",
  "वृत्तसंस्था",
  "अमोल देशपांडे",
  "सुनीता कुलकर्णी",
  "राहुल जाधव",
  "मनीषा पाटील",
  "संदीप गायकवाड",
  null,
];

/**
 * The subjects a district desk actually files on, as headline skeletons.
 *
 * `{place}` is the district's Marathi name and `{n}` a figure the generator
 * fills in. Written as sentences a Marathi desk would print rather than as
 * translations of English ones — a map whose headlines read as machine output
 * tells the reader the data is fake before they have looked at the map.
 */
const HEADLINES: Array<{ text: string; topic: string }> = [
  { text: "{place}मध्ये {n} कोटींच्या रस्ते कामांना मंजुरी", topic: "पायाभूत सुविधा" },
  { text: "{place} जिल्ह्यात जलजीवन मिशनची {n} कामे पूर्ण", topic: "पाणीपुरवठा" },
  { text: "{place}त शेतकऱ्यांना पीकविम्याचे {n} कोटी वितरित", topic: "शेती" },
  { text: "{place} महापालिकेचा {n} कोटींचा अर्थसंकल्प सादर", topic: "नागरी प्रशासन" },
  { text: "{place}मध्ये नव्या औद्योगिक वसाहतीला गती", topic: "उद्योग" },
  { text: "{place} जिल्ह्यातील {n} शाळांना डिजिटल वर्गखोल्या", topic: "शिक्षण" },
  { text: "{place}त जिल्हा रुग्णालयात नवे अतिदक्षता कक्ष सुरू", topic: "आरोग्य" },
  { text: "{place}मधील सिंचन प्रकल्पाचे काम अंतिम टप्प्यात", topic: "जलसंपदा" },
  { text: "{place} जिल्ह्यात अतिवृष्टीमुळे {n} हेक्टरवरील पिकांचे नुकसान", topic: "आपत्ती" },
  { text: "{place}त रोजगार मेळाव्यात {n} तरुणांची निवड", topic: "रोजगार" },
  { text: "{place}मध्ये घरकुल योजनेची {n} घरे पूर्ण", topic: "गृहनिर्माण" },
  { text: "{place} जिल्ह्यात वीजजोडणीच्या {n} प्रलंबित अर्जांचा निपटारा", topic: "ऊर्जा" },
  { text: "{place}त एसटी महामंडळाच्या नव्या बसफेऱ्या सुरू", topic: "वाहतूक" },
  { text: "{place}मधील बाजार समितीत कांद्याला विक्रमी दर", topic: "बाजारपेठ" },
  { text: "{place} जिल्ह्यात वनहक्क दाव्यांना मंजुरी", topic: "वने" },
  { text: "{place}त पर्यटन विकास आराखड्याला मान्यता", topic: "पर्यटन" },
  { text: "{place}मध्ये महिला बचतगटांना {n} लाखांचे कर्जवाटप", topic: "महिला व बालविकास" },
  { text: "{place} जिल्ह्यात अंगणवाड्यांचे बांधकाम मार्गी", topic: "महिला व बालविकास" },
  { text: "{place}त पोलीस भरतीची मैदानी चाचणी पूर्ण", topic: "गृह" },
  { text: "{place}मधील सांडपाणी प्रक्रिया प्रकल्पाचे लोकार्पण", topic: "पर्यावरण" },
  { text: "{place} जिल्हा परिषदेच्या {n} पदांना मान्यता", topic: "प्रशासन" },
  { text: "{place}त मुख्यमंत्र्यांच्या हस्ते विकासकामांचे भूमिपूजन", topic: "शासन" },
  { text: "{place}मध्ये दुग्ध उत्पादकांना अनुदानाची प्रतीक्षा", topic: "पशुसंवर्धन" },
  { text: "{place} जिल्ह्यात मनरेगाची {n} कामे सुरू", topic: "ग्रामविकास" },
  { text: "{place}त क्रीडा संकुलाच्या कामाला निधी मंजूर", topic: "क्रीडा" },
  { text: "{place}मधील ऐतिहासिक वास्तूंच्या संवर्धनाला निधी", topic: "सांस्कृतिक" },
];

/** The statewide file — pieces about Maharashtra rather than a place in it. */
const STATEWIDE_HEADLINES = [
  "राज्य मंत्रिमंडळाच्या बैठकीत सहा महत्त्वाचे निर्णय",
  "राज्यात मान्सूनची सरासरीपेक्षा अधिक नोंद",
  "महाराष्ट्राचा पुरवणी मागण्यांचा अर्थसंकल्प विधिमंडळात सादर",
  "राज्यातील सर्व जिल्ह्यांत आपत्ती व्यवस्थापन कक्ष सज्ज",
  "राज्य सरकारकडून नव्या औद्योगिक धोरणाची घोषणा",
  "महाराष्ट्रात शालेय पोषण आहार योजनेत बदल",
  "राज्यभरातील एसटी कर्मचाऱ्यांच्या मागण्यांवर चर्चा",
  "राज्याच्या कृषी विभागाकडून खरीप हंगामाचा आढावा",
  "महाराष्ट्रात वीजदरवाढीच्या प्रस्तावावर जनसुनावणी",
  "राज्यातील पाणीसाठा गेल्या वर्षीच्या तुलनेत अधिक",
  "राज्य सरकारचा महिला सुरक्षेसाठी नवा कृती आराखडा",
  "महाराष्ट्रात डिजिटल सातबारा सेवेचा विस्तार",
];

/** The standfirst under a headline — the publisher's own one-liner. */
const DESCRIPTIONS = [
  "जिल्हा प्रशासनाने दिलेल्या माहितीनुसार पुढील टप्प्यातील कामे लवकरच सुरू होणार आहेत.",
  "संबंधित विभागाने सादर केलेल्या अहवालावर बैठकीत सविस्तर चर्चा झाली.",
  "या निर्णयाचा थेट लाभ जिल्ह्यातील हजारो कुटुंबांना मिळणार असल्याचे सांगण्यात आले.",
  "निधी उपलब्ध झाल्यानंतर कामाला गती मिळेल, असे अधिकाऱ्यांनी स्पष्ट केले.",
  "स्थानिक लोकप्रतिनिधींनी या मागणीचा वारंवार पाठपुरावा केला होता.",
  "पुढील आढावा बैठक महिनाअखेरीस घेण्यात येणार आहे.",
  "प्रस्ताव शासनाकडे मान्यतेसाठी पाठवण्यात आला असल्याचे समजते.",
  null,
];

/* ---------------------------------------------------------------------------
   The generator
   ------------------------------------------------------------------------ */

/**
 * A seeded 32-bit generator — mulberry32.
 *
 * Small, fast and, crucially, *reproducible*: the corpus below is rolled on
 * both sides of hydration and has to come out identical both times.
 */
function rng(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(random: () => number, list: readonly T[]): T {
  return list[Math.floor(random() * list.length)];
}

/** A whole number in `[min, max]`. */
function between(random: () => number, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

/** ISO for `hours` before the anchor. */
function backFrom(anchor: number, hours: number): string {
  return new Date(anchor - hours * 3600_000).toISOString();
}

/**
 * A soft thumbnail, drawn rather than fetched.
 *
 * The panel renders `imageUrl` into a plain `<img>`, so a card without one is
 * a card with a hole in it — but pointing forty cards at forty publishers'
 * CDNs from a sample corpus would put real network requests behind fake data.
 * An inline SVG is the honest middle: it fills the frame, it is different for
 * every article, and it never leaves the page.
 */
function thumbnail(hue: number): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="hsl(${hue} 52% 72%)"/>` +
    `<stop offset="100%" stop-color="hsl(${(hue + 38) % 360} 44% 50%)"/>` +
    `</linearGradient></defs>` +
    `<rect width="160" height="120" fill="url(#g)"/>` +
    `<circle cx="${40 + (hue % 70)}" cy="46" r="26" fill="#fff" opacity="0.22"/>` +
    `<rect x="0" y="86" width="160" height="34" fill="#0b0b18" opacity="0.18"/>` +
    `</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * How prominently the press played a piece.
 *
 * Skewed hard toward the bottom on purpose: a corpus where every article
 * reached the front of its section is a corpus with no lead in it, and the
 * lead is what the readout offers as the reason to click a district.
 */
function prominenceOf(random: () => number): Prominence | null {
  if (random() < 0.45) return null;

  const reach = Math.round(random() ** 2.2 * 100) / 100;
  const bestPosition = between(random, 1, 24);
  const sweeps = between(random, 1, 40);
  const score = Math.round((reach * 0.65 + (1 - bestPosition / 25) * 0.35) * 100) / 100;

  return { reach, bestPosition, sweeps, score };
}

/** The whole generated corpus for one anchor, before any window is applied. */
type Corpus = {
  anchor: number;
  articles: NewsArticle[];
  statewide: NewsArticle[];
  /** Article url to the minister ids it names. The filter's whole index. */
  named: Map<string, string[]>;
  stories: Story[];
  releases: DgiprRelease[];
};

/**
 * One article, with the fields the panel and the readout actually print.
 *
 * `districtId` is null for the statewide file — that is the discriminant the
 * map reads, not a missing value.
 */
function makeArticle(
  random: () => number,
  districtId: string | null,
  publishedAt: string,
  anchor: number,
  index: number,
): NewsArticle {
  const publisher = pick(random, PUBLISHERS);
  const meta = districtId ? DISTRICTS[districtId] : undefined;
  const place = meta?.nameMr ?? "महाराष्ट्र";

  const template = districtId ? pick(random, HEADLINES) : null;
  const headline = template
    ? template.text
        .replace("{place}", place)
        // Devanagari, like every other figure the product prints. A Marathi
        // headline carrying Latin numerals is the single fastest way to tell a
        // reader the copy did not come from a Marathi desk.
        .replace("{n}", toDevanagari(between(random, 3, 480)))
    : pick(random, STATEWIDE_HEADLINES);

  const revisions = random() < 0.18 ? between(random, 1, 6) : 0;
  // A rewritten piece was rewritten *after* it was filed and *before* now, so
  // the stamp is drawn from that interval rather than pinned to either end.
  const modifiedAt = revisions
    ? new Date(
        Date.parse(publishedAt) + random() * (anchor - Date.parse(publishedAt)),
      ).toISOString()
    : null;

  return {
    url: `https://${publisher.host}/maharashtra/${districtId ?? "state"}/${index}-${Math.floor(random() * 1e6)}`,
    districtId,
    section: meta
      ? `${meta.nameMr} / ${DIVISIONS[meta.division].nameMr}`
      : "महाराष्ट्र",
    headline,
    description: pick(random, DESCRIPTIONS),
    imageUrl: random() < 0.62 ? thumbnail(between(random, 0, 359)) : null,
    author: pick(random, AUTHORS),
    publishedAt,
    modifiedAt,
    wordCount: between(random, 180, 900),
    revisions,
    prominence: prominenceOf(random),
  };
}

/* The running stories the pin layer draws. Written by hand rather than
   generated: a story is a claim about a sequence of events in a named place,
   and a generator that assembles one out of parts produces exactly the kind of
   plausible nonsense that makes a demo worse than an empty state. Each one
   below is a shape the real pipeline produces — a taluka-tier story with a
   coordinate, or a district-tier one with only the desk. */
const STORY_SEEDS: Array<{
  id: string;
  titleMr: string;
  actors: string | null;
  issue: string | null;
  placeTier: "taluka" | "district";
  talukaNameMr: string | null;
  districtId: string;
  point: [number, number] | null;
  placeEvidence: string | null;
  deskDistricts: string[];
  /** Hours before the anchor the thread opened. */
  openedHoursAgo: number;
  steps: string[];
}> = [
  {
    id: "story-samruddhi",
    titleMr: "समृद्धी महामार्गाचा शेवटचा टप्पा",
    actors: "एमएसआरडीसी, सार्वजनिक बांधकाम विभाग",
    issue: "पायाभूत सुविधा",
    placeTier: "taluka",
    talukaNameMr: "इगतपुरी",
    districtId: "nashik",
    point: [73.5622, 19.6967],
    placeEvidence: "इगतपुरी ते आमणे या टप्प्यातील बोगद्याचे काम",
    deskDistricts: ["nashik", "thane", "chhatrapati-sambhajinagar", "nagpur"],
    openedHoursAgo: 96,
    steps: [
      "समृद्धी महामार्गाच्या शेवटच्या टप्प्याची पाहणी",
      "इगतपुरी बोगद्यातील काँक्रिटीकरण पूर्ण",
      "सुरक्षा लेखापरीक्षणानंतरच वाहतूक खुली होणार",
      "शेवटचा टप्पा महिनाअखेरीस खुला होण्याची शक्यता",
    ],
  },
  {
    id: "story-onion",
    titleMr: "कांदा दरावरून बाजार समितीत तणाव",
    actors: "कांदा उत्पादक शेतकरी, पणन विभाग",
    issue: "बाजारपेठ",
    placeTier: "taluka",
    talukaNameMr: "लासलगाव",
    districtId: "nashik",
    point: [74.1436, 20.1467],
    placeEvidence: "लासलगाव बाजार समितीच्या आवारात लिलाव बंद",
    deskDistricts: ["nashik", "ahilyanagar", "pune"],
    openedHoursAgo: 52,
    steps: [
      "लासलगावी कांद्याच्या लिलावाला शेतकऱ्यांचा विरोध",
      "लिलाव दुसऱ्या दिवशीही बंद",
      "पणनमंत्र्यांच्या उपस्थितीत बैठक",
      "हमीभावाच्या मागणीवर तोडगा नाही",
      "लिलाव पूर्ववत, शेतकऱ्यांचा इशारा कायम",
    ],
  },
  {
    id: "story-metro3",
    titleMr: "मुंबई मेट्रो ३ चा उर्वरित टप्पा",
    actors: "एमएमआरसी",
    issue: "वाहतूक",
    placeTier: "taluka",
    talukaNameMr: "कुलाबा",
    districtId: "mumbai-city",
    point: [72.8147, 18.9067],
    placeEvidence: "कफ परेड ते वरळी स्थानकांची चाचणी",
    deskDistricts: ["mumbai-city", "mumbai-suburban", "thane"],
    openedHoursAgo: 70,
    steps: [
      "मेट्रो ३ च्या दुसऱ्या टप्प्याची चाचणी सुरू",
      "स्थानकांवरील प्रवासी सुविधा तपासणी",
      "सुरक्षा आयुक्तांच्या परवानगीची प्रतीक्षा",
      "टप्पा पुढील महिन्यात प्रवाशांसाठी खुला",
    ],
  },
  {
    id: "story-flood",
    titleMr: "पंचगंगेच्या पुराचा फटका",
    actors: "जिल्हा आपत्ती व्यवस्थापन कक्ष",
    issue: "आपत्ती",
    placeTier: "district",
    talukaNameMr: null,
    districtId: "kolhapur",
    point: null,
    placeEvidence: null,
    deskDistricts: ["kolhapur", "sangli"],
    openedHoursAgo: 40,
    steps: [
      "पंचगंगा इशारा पातळीवर, ३२ बंधारे पाण्याखाली",
      "नदीकाठच्या गावांतून स्थलांतर सुरू",
      "पाणी ओसरण्यास सुरुवात, पंचनामे सुरू",
    ],
  },
  {
    id: "story-vidarbha-cotton",
    titleMr: "कापूस खरेदी केंद्रांवरील रांगा",
    actors: "सीसीआय, कापूस उत्पादक",
    issue: "शेती",
    placeTier: "taluka",
    talukaNameMr: "पांढरकवडा",
    districtId: "yavatmal",
    point: [78.1833, 20.0167],
    placeEvidence: "पांढरकवडा खरेदी केंद्रावर तीन दिवस प्रतीक्षा",
    deskDistricts: ["yavatmal", "wardha", "akola", "amravati"],
    openedHoursAgo: 64,
    steps: [
      "कापूस खरेदी केंद्रांवर शेतकऱ्यांच्या लांब रांगा",
      "ग्रेडिंगवरून वाद, खरेदी थांबली",
      "अतिरिक्त केंद्रे सुरू करण्याचे आदेश",
      "खरेदीला गती, चुकाऱ्यांची प्रतीक्षा कायम",
    ],
  },
  {
    id: "story-tiger",
    titleMr: "ताडोबालगतच्या गावांत वाघाचा वावर",
    actors: "वनविभाग",
    issue: "वने",
    placeTier: "taluka",
    talukaNameMr: "मूल",
    districtId: "chandrapur",
    point: [79.6667, 20.0667],
    placeEvidence: "मूल तालुक्यातील तीन गावांत रात्रीची गस्त",
    deskDistricts: ["chandrapur", "gadchiroli"],
    openedHoursAgo: 30,
    steps: [
      "मूल तालुक्यात वाघाच्या वावराने भीती",
      "वनविभागाकडून पिंजरे आणि कॅमेरा ट्रॅप",
      "गावकऱ्यांची नुकसानभरपाईची मागणी",
    ],
  },
  {
    id: "story-water-marathwada",
    titleMr: "मराठवाड्यातील टँकरची संख्या वाढली",
    actors: "पाणीपुरवठा विभाग",
    issue: "पाणीपुरवठा",
    placeTier: "district",
    talukaNameMr: null,
    districtId: "beed",
    point: null,
    placeEvidence: null,
    deskDistricts: ["beed", "latur", "dharashiv", "jalna"],
    openedHoursAgo: 58,
    steps: [
      "बीड जिल्ह्यात टँकरची संख्या दुपटीने वाढली",
      "जलस्रोतांचे अधिग्रहण सुरू",
      "आढावा बैठकीत अतिरिक्त निधीची मागणी",
    ],
  },
  {
    id: "story-pune-metro-line",
    titleMr: "पुणे मेट्रोचा हिंजवडी मार्ग",
    actors: "पीएमआरडीए",
    issue: "वाहतूक",
    placeTier: "taluka",
    talukaNameMr: "हिंजवडी",
    districtId: "pune",
    point: [73.7389, 18.5913],
    placeEvidence: "हिंजवडी ते शिवाजीनगर मार्गिकेवरील गर्डर उभारणी",
    deskDistricts: ["pune"],
    openedHoursAgo: 22,
    steps: [
      "हिंजवडी मार्गिकेवरील गर्डर उभारणी पूर्ण",
      "स्थानकांच्या कामाला गती",
      "मार्ग पुढील वर्षी सुरू होणार",
    ],
  },
  {
    id: "story-solar",
    titleMr: "सौर कृषिपंप जोडणीचा वेग",
    actors: "महावितरण",
    issue: "ऊर्जा",
    placeTier: "district",
    talukaNameMr: null,
    districtId: "solapur",
    point: null,
    placeEvidence: null,
    deskDistricts: ["solapur", "satara", "sangli"],
    openedHoursAgo: 34,
    steps: [
      "सोलापूर जिल्ह्यात सौर कृषिपंपांची विक्रमी जोडणी",
      "प्रलंबित अर्जांचा निपटारा महिनाअखेरीस",
    ],
  },
  {
    id: "story-konkan-fisheries",
    titleMr: "मासेमारी बंदीनंतरचा हंगाम",
    actors: "मत्स्यव्यवसाय विभाग, मच्छीमार संघटना",
    issue: "मत्स्यव्यवसाय",
    placeTier: "taluka",
    talukaNameMr: "मालवण",
    districtId: "sindhudurg",
    point: [73.4667, 16.0667],
    placeEvidence: "मालवण बंदरातून नौका समुद्रात",
    deskDistricts: ["sindhudurg", "ratnagiri", "raigad"],
    openedHoursAgo: 46,
    steps: [
      "मालवणातून मासेमारी नौका समुद्रात",
      "डिझेल परताव्याच्या मागणीसाठी निवेदन",
      "पहिल्या फेरीत समाधानकारक मासळी",
    ],
  },
  {
    id: "story-nagpur-aiims",
    titleMr: "नागपूर एम्समधील नव्या सुविधा",
    actors: "एम्स नागपूर",
    issue: "आरोग्य",
    placeTier: "district",
    talukaNameMr: null,
    districtId: "nagpur",
    point: null,
    placeEvidence: null,
    deskDistricts: ["nagpur", "wardha", "bhandara"],
    openedHoursAgo: 26,
    steps: [
      "एम्समध्ये अवयव प्रत्यारोपण केंद्राला मान्यता",
      "रुग्णसेवेसाठी अतिरिक्त खाटा उपलब्ध",
    ],
  },
  {
    id: "story-palghar-port",
    titleMr: "वाढवण बंदराच्या भूसंपादनाला विरोध",
    actors: "स्थानिक ग्रामस्थ, जेएनपीए",
    issue: "पायाभूत सुविधा",
    placeTier: "taluka",
    talukaNameMr: "डहाणू",
    districtId: "palghar",
    point: [72.7333, 19.9667],
    placeEvidence: "डहाणू तालुक्यातील गावांत ग्रामसभा",
    deskDistricts: ["palghar", "thane", "mumbai-city"],
    openedHoursAgo: 78,
    steps: [
      "वाढवण बंदराविरोधात ग्रामसभांचे ठराव",
      "भूसंपादन प्रक्रियेला स्थगितीची मागणी",
      "प्रशासनाकडून पुनर्वसन आराखडा सादर",
      "आंदोलन सुरूच ठेवण्याचा निर्धार",
    ],
  },
];

/** The government layer — releases as the directorate issues them. */
const RELEASE_SEEDS: Array<{
  titleMr: string;
  summaryMr: string;
  districtId: string | null;
  datelineMr: string | null;
  categoryMr: string;
  authorMr: string;
  tags: string[];
  daysAgo: number;
  featured?: boolean;
}> = [
  {
    titleMr: "राज्यातील सिंचन प्रकल्पांसाठी १२०० कोटींचा निधी मंजूर",
    summaryMr:
      "राज्यातील प्रलंबित सिंचन प्रकल्प मार्गी लावण्यासाठी शासनाने १२०० कोटी रुपयांचा निधी मंजूर केला आहे. यातून अपूर्ण असलेल्या ३४ प्रकल्पांची कामे पूर्ण करण्यात येणार असून, त्याचा लाभ सुमारे दोन लाख हेक्टर क्षेत्राला होणार आहे. निधी वितरणाचे टप्पे आणि कामांची कालमर्यादा जलसंपदा विभागाकडून निश्चित करण्यात आली आहे.",
    districtId: "mumbai-city",
    datelineMr: "मुंबई",
    categoryMr: "जलसंपदा",
    authorMr: "माहिती व जनसंपर्क महासंचालनालय",
    tags: ["सिंचन", "निधी", "जलसंपदा"],
    daysAgo: 0,
    featured: true,
  },
  {
    titleMr: "मुख्यमंत्र्यांच्या हस्ते नागपुरात उड्डाणपुलाचे लोकार्पण",
    summaryMr:
      "नागपूर शहरातील वाहतूक कोंडी कमी करण्यासाठी उभारण्यात आलेल्या उड्डाणपुलाचे लोकार्पण मुख्यमंत्र्यांच्या हस्ते करण्यात आले. या पुलामुळे दररोज सुमारे ऐंशी हजार वाहनांचा प्रवास सुकर होणार आहे. याप्रसंगी बोलताना मुख्यमंत्र्यांनी शहरातील उर्वरित प्रकल्पही निर्धारित वेळेत पूर्ण करण्याचे निर्देश दिले.",
    districtId: "nagpur",
    datelineMr: "नागपूर",
    categoryMr: "पायाभूत सुविधा",
    authorMr: "जिल्हा माहिती कार्यालय, नागपूर",
    tags: ["लोकार्पण", "वाहतूक"],
    daysAgo: 0,
  },
  {
    titleMr: "खरीप हंगामासाठी बियाणे व खतांचा पुरेसा साठा",
    summaryMr:
      "आगामी खरीप हंगामासाठी राज्यात बियाणे आणि रासायनिक खतांचा पुरेसा साठा उपलब्ध असल्याची माहिती कृषी विभागाने दिली आहे. जिल्हानिहाय मागणीनुसार वितरणाचे नियोजन पूर्ण झाले असून, दरवाढ अथवा साठेबाजी आढळल्यास कठोर कारवाई करण्यात येईल, असा इशारा देण्यात आला आहे.",
    districtId: "mumbai-city",
    datelineMr: "मुंबई",
    categoryMr: "कृषी",
    authorMr: "माहिती व जनसंपर्क महासंचालनालय",
    tags: ["खरीप", "बियाणे", "खते"],
    daysAgo: 1,
  },
  {
    titleMr: "पुणे जिल्ह्यात ‘शासन आपल्या दारी’ उपक्रमाचा समारोप",
    summaryMr:
      "पुणे जिल्ह्यात राबवण्यात आलेल्या ‘शासन आपल्या दारी’ उपक्रमाचा समारोप झाला. या उपक्रमातून एक लाखाहून अधिक नागरिकांना विविध योजनांचा थेट लाभ देण्यात आला. दाखले, अनुदान आणि प्रमाणपत्रे एकाच ठिकाणी उपलब्ध करून देण्यात आल्याने नागरिकांचा वेळ वाचल्याचे प्रशासनाने नमूद केले.",
    districtId: "pune",
    datelineMr: "पुणे",
    categoryMr: "सर्वसामान्य प्रशासन",
    authorMr: "जिल्हा माहिती कार्यालय, पुणे",
    tags: ["शासन आपल्या दारी", "योजना"],
    daysAgo: 1,
  },
  {
    titleMr: "छत्रपती संभाजीनगरात वस्त्रोद्योग उद्यानाचे भूमिपूजन",
    summaryMr:
      "छत्रपती संभाजीनगर येथे उभारण्यात येणाऱ्या एकात्मिक वस्त्रोद्योग उद्यानाचे भूमिपूजन करण्यात आले. या प्रकल्पातून प्रत्यक्ष व अप्रत्यक्ष मिळून सुमारे बारा हजार रोजगार निर्माण होणार असून, मराठवाड्यातील कापूस उत्पादकांना स्थानिक बाजारपेठ उपलब्ध होणार आहे.",
    districtId: "chhatrapati-sambhajinagar",
    datelineMr: "छत्रपती संभाजीनगर",
    categoryMr: "उद्योग",
    authorMr: "जिल्हा माहिती कार्यालय, छत्रपती संभाजीनगर",
    tags: ["उद्योग", "रोजगार", "वस्त्रोद्योग"],
    daysAgo: 2,
  },
  {
    titleMr: "कोकणातील पर्यटन विकासासाठी स्वतंत्र आराखडा",
    summaryMr:
      "कोकण विभागातील किनारी पर्यटनाच्या विकासासाठी स्वतंत्र आराखडा तयार करण्यात येत आहे. सागरी किल्ले, समुद्रकिनारे आणि निवास व्यवस्थेच्या दर्जावाढीवर या आराखड्यात भर देण्यात आला आहे. स्थानिक रोजगाराला प्राधान्य देण्याचे निर्देश देण्यात आले आहेत.",
    districtId: "ratnagiri",
    datelineMr: "रत्नागिरी",
    categoryMr: "पर्यटन",
    authorMr: "जिल्हा माहिती कार्यालय, रत्नागिरी",
    tags: ["पर्यटन", "कोकण"],
    daysAgo: 3,
  },
  {
    titleMr: "नाशिक विभागात जलजीवन मिशनची कामे अंतिम टप्प्यात",
    summaryMr:
      "नाशिक विभागातील जलजीवन मिशन अंतर्गत हाती घेण्यात आलेली कामे अंतिम टप्प्यात आली असून, विभागातील ९२ टक्के कुटुंबांना नळजोडणी देण्यात आली आहे. उर्वरित कामे पावसाळ्यापूर्वी पूर्ण करण्याचे निर्देश विभागीय आयुक्तांनी दिले.",
    districtId: "nashik",
    datelineMr: "नाशिक",
    categoryMr: "पाणीपुरवठा",
    authorMr: "विभागीय माहिती कार्यालय, नाशिक",
    tags: ["जलजीवन", "पाणीपुरवठा"],
    daysAgo: 3,
  },
  {
    titleMr: "अमरावती विभागात शेतकरी उत्पादक कंपन्यांना बळ",
    summaryMr:
      "अमरावती विभागातील शेतकरी उत्पादक कंपन्यांना गोदाम व प्रतवारी केंद्रांसाठी अर्थसाहाय्य देण्यात येणार आहे. यामुळे शेतमालाची साठवणूक क्षमता वाढून विक्रीच्या वेळेची निवड शेतकऱ्यांच्या हातात राहील, असे कृषी विभागाने स्पष्ट केले.",
    districtId: "amravati",
    datelineMr: "अमरावती",
    categoryMr: "कृषी",
    authorMr: "विभागीय माहिती कार्यालय, अमरावती",
    tags: ["शेतकरी उत्पादक कंपनी", "गोदाम"],
    daysAgo: 4,
  },
  {
    titleMr: "राज्यातील शासकीय रुग्णालयांत मोफत औषधांचा पुरवठा",
    summaryMr:
      "राज्यातील सर्व शासकीय रुग्णालयांत अत्यावश्यक औषधांचा मोफत पुरवठा सुरळीत ठेवण्यासाठी नवी पुरवठा साखळी कार्यान्वित करण्यात आली आहे. औषधांचा तुटवडा जाणवल्यास जिल्हास्तरावरच खरेदीचे अधिकार देण्यात आले आहेत.",
    districtId: "mumbai-city",
    datelineMr: "मुंबई",
    categoryMr: "आरोग्य",
    authorMr: "माहिती व जनसंपर्क महासंचालनालय",
    tags: ["आरोग्य", "औषधे"],
    daysAgo: 5,
  },
  {
    titleMr: "गडचिरोलीत कौशल्य विकास केंद्राचे उद्घाटन",
    summaryMr:
      "गडचिरोली येथे आदिवासी तरुणांसाठी कौशल्य विकास केंद्राचे उद्घाटन करण्यात आले. वाहन दुरुस्ती, विद्युत तंत्र आणि संगणक परिचालन या अभ्यासक्रमांचा पहिला टप्पा सुरू झाला असून, प्रशिक्षणानंतर रोजगार मेळाव्याचे आयोजन करण्यात येणार आहे.",
    districtId: "gadchiroli",
    datelineMr: "गडचिरोली",
    categoryMr: "कौशल्य विकास",
    authorMr: "जिल्हा माहिती कार्यालय, गडचिरोली",
    tags: ["कौशल्य विकास", "रोजगार"],
    daysAgo: 6,
  },
  {
    titleMr: "विधिमंडळाच्या पावसाळी अधिवेशनाची तयारी पूर्ण",
    summaryMr:
      "विधिमंडळाच्या आगामी पावसाळी अधिवेशनाची प्रशासकीय तयारी पूर्ण झाली आहे. अधिवेशन काळातील सुरक्षा, आरोग्य आणि प्रसारमाध्यम व्यवस्थेचा आढावा घेण्यात आला.",
    districtId: null,
    datelineMr: null,
    categoryMr: "विधिमंडळ",
    authorMr: "माहिती व जनसंपर्क महासंचालनालय",
    tags: ["अधिवेशन"],
    daysAgo: 2,
  },
  {
    titleMr: "राज्य पुरस्कारांसाठी अर्ज मागवले",
    summaryMr:
      "सामाजिक क्षेत्रातील उल्लेखनीय कार्यासाठी दिल्या जाणाऱ्या राज्य पुरस्कारांकरिता अर्ज मागवण्यात आले आहेत. अर्ज सादर करण्याची अंतिम मुदत महिनाअखेर असून, जिल्हा कार्यालयांमार्फत अर्ज स्वीकारले जातील.",
    districtId: null,
    datelineMr: null,
    categoryMr: "सांस्कृतिक कार्य",
    authorMr: "माहिती व जनसंपर्क महासंचालनालय",
    tags: ["पुरस्कार"],
    daysAgo: 7,
  },
];

/* ---------------------------------------------------------------------------
   Assembly
   ------------------------------------------------------------------------ */

/**
 * The corpus for one anchor, built once and then handed out.
 *
 * Memoised on the anchor rather than rebuilt per call: the shell asks for a
 * map, a story layer and a government layer on every filter change, and
 * regenerating seven hundred articles three times per click is work nobody
 * asked for.
 */
let cached: Corpus | null = null;

export function sampleCorpus(anchorIso: string): Corpus {
  const anchor = Date.parse(anchorIso);

  if (cached && cached.anchor === anchor) return cached;

  cached = buildCorpus(anchor);

  return cached;
}

function buildCorpus(anchor: number): Corpus {
  const random = rng(0x5eed_1234);
  const articles: NewsArticle[] = [];
  const statewide: NewsArticle[] = [];
  const named = new Map<string, string[]>();

  /* Every article is stamped with an age drawn from a curve rather than from a
     flat range: a newsroom files most of what it files today, and a corpus
     spread evenly over a month makes every window from a day to a week look
     identically thin. The exponent is what puts roughly a third of each
     district's file inside the first 24 hours. */
  const ageHours = (): number => Math.round(random() ** 2.6 * 30 * 24 * 100) / 100;

  let index = 0;

  for (const districtId of DISTRICT_IDS) {
    const weight = DISTRICT_WEIGHT[districtId] ?? 6;
    // A month's worth, with enough jitter that two districts on the same
    // weight do not land on the same count and flatten the quantile ramp.
    const count = Math.max(1, Math.round(weight * (0.55 + random() * 0.5)));

    for (let n = 0; n < count; n += 1) {
      articles.push(
        makeArticle(random, districtId, backFrom(anchor, ageHours()), anchor, (index += 1)),
      );
    }
  }

  for (let n = 0; n < 34; n += 1) {
    statewide.push(
      makeArticle(random, null, backFrom(anchor, ageHours()), anchor, (index += 1)),
    );
  }

  /* Who each article names.
     About one piece in six names a minister at all, which is what the real
     corpus measures — and the distribution inside that sixth is steeply
     top-heavy, because the Chief Minister is quoted in a great deal of what
     every desk files and a Minister of State in very little. */
  const ladder = MINISTERS.map((minister, position) => ({
    id: minister.id,
    tier: minister.tier,
    // Rank in the Gazette order is a good enough proxy for coverage.
    weight: minister.tier === "cm" ? 26 : minister.tier === "dcm" ? 11 : Math.max(1, 7 - position / 7),
  }));
  const ladderTotal = ladder.reduce((sum, one) => sum + one.weight, 0);

  for (const article of [...articles, ...statewide]) {
    if (random() > 0.17) continue;

    const ids = new Set<string>();
    const mentions = random() < 0.22 ? 2 : 1;

    for (let n = 0; n < mentions; n += 1) {
      let ticket = random() * ladderTotal;

      for (const one of ladder) {
        ticket -= one.weight;

        if (ticket <= 0) {
          ids.add(one.id);
          break;
        }
      }
    }

    named.set(article.url, [...ids]);
  }

  const stories: Story[] = STORY_SEEDS.map((seed) => {
    const opened = anchor - seed.openedHoursAgo * 3600_000;
    // The thread's last beat lands somewhere short of now rather than exactly
    // on it. Twelve running stories all last updated this minute is the tell
    // that gives a generated corpus away — and it also empties the meaning out
    // of the window chips, since every story would be inside every window.
    const quiet = between(random, 0, 14) * 3600_000;
    const span = Math.max(3600_000, seed.openedHoursAgo * 3600_000 - quiet);

    const steps: StoryStep[] = seed.steps.map((headline, position) => ({
      url: `https://esakal.com/maharashtra/${seed.id}/${position + 1}`,
      step: position + 1,
      headline,
      publishedAt: new Date(
        opened + (span * position) / Math.max(1, seed.steps.length - 1),
      ).toISOString(),
      placeTier: position === 0 ? seed.placeTier : position % 2 === 0 ? seed.placeTier : null,
      talukaNameMr: position % 2 === 0 ? seed.talukaNameMr : null,
      districtId: seed.districtId,
    }));

    return {
      id: seed.id,
      titleMr: seed.titleMr,
      actors: seed.actors,
      issue: seed.issue,
      placeTier: seed.placeTier,
      talukaNameMr: seed.talukaNameMr,
      districtId: seed.districtId,
      point: seed.point,
      placeEvidence: seed.placeEvidence,
      articles: seed.steps.length + between(random, 0, 9),
      firstAt: steps[0].publishedAt,
      lastAt: steps[steps.length - 1].publishedAt,
      deskDistricts: seed.deskDistricts,
      steps,
    };
  });

  const releases: DgiprRelease[] = RELEASE_SEEDS.map((seed, position) => {
    const date = new Date(anchor - seed.daysAgo * 86_400_000);
    const day = date.toISOString().slice(0, 10);

    return {
      id: `${day}-${String(position + 1).padStart(2, "0")}`,
      slug: `${day}-${seed.categoryMr.replace(/\s+/g, "-")}-${position + 1}`,
      titleMr: seed.titleMr,
      date: day,
      summaryMr: seed.summaryMr,
      districtId: seed.districtId,
      datelineMr: seed.datelineMr,
      categoryMr: seed.categoryMr,
      sourceMr: "महासंवाद",
      authorMr: seed.authorMr,
      tags: seed.tags,
      featured: seed.featured ?? false,
      posterUrl: null,
      pdfUrl: null,
      docxUrl: null,
      url: null,
    };
  });

  return { anchor, articles, statewide, named, stories, releases };
}

/* ---------------------------------------------------------------------------
   Readers — the same signatures the server-backed readers have
   ------------------------------------------------------------------------ */

/** Whether an article's named ministers satisfy the reader's filter. */
function satisfies(
  ids: string[] | undefined,
  filter: MinisterFilter | null,
  tierOf: Map<string, MinisterTier>,
): boolean {
  if (!filter) return true;
  if (!ids || !ids.length) return false;

  return filter.kind === "one"
    ? ids.includes(filter.id)
    : ids.some((id) => tierOf.get(id) === filter.tier);
}

const TIER_OF = new Map(MINISTERS.map((minister) => [minister.id, minister.tier]));

/**
 * The map for one window, narrowed to one minister or to nobody.
 *
 * The widening walk is the real reader's and is kept: a window with nothing in
 * it steps outward to the next one rather than painting an empty state, and
 * `widened` says so on the plate. It cannot trigger on the unfiltered corpus,
 * which has something in every window — it triggers constantly under a
 * minister filter, which is exactly the case it was written for.
 */
export function buildNewsMap(
  anchorIso: string,
  windowId: WindowId,
  filter: MinisterFilter | null,
): NewsMap {
  const corpus = sampleCorpus(anchorIso);
  const options = windowsFrom(windowId);

  for (const [step, option] of options.entries()) {
    const cutoff = option.hours === null ? 0 : corpus.anchor - option.hours * 3600_000;

    const inWindow = (article: NewsArticle) => Date.parse(article.publishedAt) >= cutoff;
    const forReader = (article: NewsArticle) =>
      inWindow(article) && satisfies(corpus.named.get(article.url), filter, TIER_OF);

    const rows = corpus.articles.filter(forReader);
    const state = corpus.statewide.filter(forReader);

    // Nothing at all in this window: step outward rather than paint a blank
    // sheet. `all` closes the list, so the walk always terminates.
    if (!rows.length && !state.length && step < options.length - 1) continue;

    const buckets = new Map<string, NewsArticle[]>();

    for (const article of rows) {
      const key = article.districtId as string;
      const bucket = buckets.get(key);

      if (bucket) bucket.push(article);
      else buckets.set(key, [article]);
    }

    const scale = quantileScale([...buckets.values()].map((list) => list.length));
    const districts: Record<string, DistrictNews> = {};

    for (const [districtId, list] of buckets) {
      // Most prominent first, and within equal prominence the newest —
      // the order the panel reads and the order `lead` is taken from.
      const sorted = [...list].sort(
        (a, b) =>
          (b.prominence?.score ?? 0) - (a.prominence?.score ?? 0) ||
          b.publishedAt.localeCompare(a.publishedAt),
      );

      districts[districtId] = {
        districtId,
        articles: sorted,
        count: sorted.length,
        level: scale.levelOf(sorted.length),
        lead: sorted[0] ?? null,
        latestAt: sorted.reduce<string | null>(
          (latest, article) =>
            !latest || article.publishedAt > latest ? article.publishedAt : latest,
          null,
        ),
      };
    }

    return {
      districts,
      statewide: [...state].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
      window: option,
      widened: step > 0,
      totals: {
        articles: rows.length + state.length,
        districts: buckets.size,
        statewide: state.length,
      },
      ceiling: Math.max(0, ...[...buckets.values()].map((list) => list.length)),
      ministers: ministerBoard(corpus, cutoff),
      minister: filter,
      collectedAt: new Date(corpus.anchor - 11 * 60_000).toISOString(),
      sweptAt: new Date(corpus.anchor - 26 * 60_000).toISOString(),
    };
  }

  // Unreachable — `windowsFrom` always ends on the unbounded window, and the
  // loop returns there whether or not it found anything. Kept so the function
  // has one exit type rather than an assertion.
  return buildNewsMap(anchorIso, "all", null);
}

/**
 * The chips, counted over the window and never over the filter.
 *
 * A board that renumbered itself as the reader clicked through it would make
 * the chip they just left unreadable — see `MinisterBoard`.
 */
function ministerBoard(corpus: Corpus, cutoff: number): MinisterBoard {
  const tiers: Record<MinisterTier, number> = { cm: 0, dcm: 0, min: 0, mos: 0 };
  const perMinister = new Map<string, number>();
  let matched = 0;

  for (const article of [...corpus.articles, ...corpus.statewide]) {
    if (Date.parse(article.publishedAt) < cutoff) continue;

    const ids = corpus.named.get(article.url);
    if (!ids?.length) continue;

    matched += 1;

    // An article naming two ministers of one rank counts once for that rank,
    // so these stay counts of articles rather than of mentions.
    const ranks = new Set<MinisterTier>();

    for (const id of ids) {
      perMinister.set(id, (perMinister.get(id) ?? 0) + 1);

      const tier = TIER_OF.get(id);
      if (tier) ranks.add(tier);
    }

    for (const tier of ranks) tiers[tier] += 1;
  }

  return {
    tiers,
    ministers: MINISTERS.map((minister) => ({
      id: minister.id,
      tier: minister.tier,
      nameMr: minister.nameMr,
      portfolioMr: minister.portfolioMr,
      articles: perMinister.get(minister.id) ?? 0,
    })),
    matched,
  };
}

/** The story layer for the window the map settled on. */
export function buildStories(
  anchorIso: string,
  window: { hours: number | null },
  filter: MinisterFilter | null,
): NewsStories {
  const corpus = sampleCorpus(anchorIso);
  const cutoff = window.hours === null ? 0 : corpus.anchor - window.hours * 3600_000;

  /* A story is in the window when its newest step is. Keying on `firstAt`
     would drop a thread that opened last week and is still running today,
     which is precisely the kind of story the pin layer exists to show. */
  let stories = corpus.stories.filter((story) => Date.parse(story.lastAt) >= cutoff);

  /* Under a minister filter the layer narrows by the issue they hold rather
     than by a name in a headline — the sample corpus names ministers on
     articles, not on threads. Deterministic and coarse on purpose: it is the
     seam where the real pipeline's own thread-to-minister index would go. */
  if (filter) {
    const keep = new Set(
      [...corpus.named.entries()]
        .filter(([, ids]) => satisfies(ids, filter, TIER_OF))
        .map(([url]) => url),
    );

    stories = stories.filter(
      (story) =>
        keep.size > 0 &&
        story.deskDistricts.some((districtId) =>
          corpus.articles.some(
            (article) => article.districtId === districtId && keep.has(article.url),
          ),
        ),
    );
  }

  return {
    stories: [...stories].sort((a, b) => b.lastAt.localeCompare(a.lastAt)),
    total: stories.length,
    statewide: 3,
    runId: 412,
    runAt: new Date(corpus.anchor - 38 * 60_000).toISOString(),
  };
}

/**
 * The government layer, on its own clock.
 *
 * Given the window the reader asked for rather than the one the map settled
 * on, and allowed to widen separately: the directorate issues a handful of
 * releases a day where the press files hundreds, and forcing an official layer
 * onto a newsroom's clock shows an authoritative-looking zero for days.
 */
export function buildDgipr(anchorIso: string, windowId: WindowId): DgiprMap {
  const corpus = sampleCorpus(anchorIso);
  const options = windowsFrom(windowId);

  for (const [step, option] of options.entries()) {
    const cutoff = option.hours === null ? 0 : corpus.anchor - option.hours * 3600_000;

    // The source carries a calendar date and not a timestamp, so a release
    // dated today is in every window — it is compared at end of its own day.
    const releases = corpus.releases.filter(
      (release) => Date.parse(`${release.date}T23:59:59Z`) >= cutoff,
    );

    if (!releases.length && step < options.length - 1) continue;

    const byDistrict: Record<string, DgiprRelease[]> = {};
    const unplaced: DgiprRelease[] = [];

    for (const release of releases) {
      if (!release.districtId) {
        unplaced.push(release);
        continue;
      }

      (byDistrict[release.districtId] ??= []).push(release);
    }

    return {
      releases: [...releases].sort((a, b) => b.date.localeCompare(a.date)),
      byDistrict,
      unplaced,
      totals: {
        releases: releases.length,
        districts: Object.keys(byDistrict).length,
        unplaced: unplaced.length,
      },
      window: option,
      widened: step > 0,
      pulledAt: new Date(corpus.anchor - 3 * 3600_000).toISOString(),
    };
  }

  return buildDgipr(anchorIso, "all");
}

/** The key beside the ramp: the count range each step stands for. */
export function legendBands(
  map: NewsMap,
): Array<{ level: number; min: number; max: number }> {
  const scale = quantileScale(Object.values(map.districts).map((district) => district.count));

  return scale.breaks
    .map((_, index) => {
      const band = scale.bandOf(index + 1);

      return band ? { level: index + 1, min: band[0], max: band[1] } : null;
    })
    .filter((band): band is { level: number; min: number; max: number } => band !== null);
}

/** Every window the plate offers, for the chips. Re-exported so the page has
 *  one import for its data rather than three. */
export { windowById };
