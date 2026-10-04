# /news redesign — "नवी रचना — प्रस्ताव"

Handoff for implementing the approved redesign on `src/app/news/page.tsx`.
Exported from the "DGIPR News Homepage" design canvas on 4 Oct 2026 (artboards
`Redesign.dc.html` and `RedesignMobile.dc.html` only — the older "सध्याची रचना"
artboards are not part of this handoff).

| File | What it is |
| --- | --- |
| `desktop.dc.html` | Desktop artboard, 1440px wide (content column 1280px) |
| `mobile.dc.html` | Phone artboard, 390px wide |
| `assets/` | Logo, emblem, district map SVG and 28 release photos (`ms-<post id>.jpg`) |

The `.dc.html` files are design-component sources, not app code. Markup is plain
HTML with inline styles; `{{holes}}` and `<sc-for>` / `<sc-if>` are template
bindings filled by the `class Component` script at the bottom of each file.
That script is the behaviour spec: read it for state, handlers and derived
values. Asset paths are relative (`assets/…`), so a file previews visually only
inside the design tool — treat them as a reference, not something to serve.

## Content used in the design

Headlines, summaries, dates, times and photos are real approved releases from
mahasamvad.in, 30 Sept – 3 Oct 2026 (WordPress post id = the `वृत्त क्र.` shown,
e.g. `२१७७११`). Photos are the posts' own featured images, credited
"छायाचित्र: महासंवाद". In the app every one of these must come from the
`articles` corpus (`loadCorpus`) — `image_url` / `image_credit`, the same rule
the page comment already states. Do not ship the files in `assets/` as content;
only `mahasamvad-logo.png` and `emblem.png` (already in `public/`) are site assets.

## Visual system

- Reference: bappa.org (cream ground, crimson utility bar, centred logo, red-tinted
  hero, floating bottom pill nav).
- Colours: ground `#FFF8EE`; primary crimson `#A8172C` (tweakable; maroon `#8C2F1F`
  was the alternative); deep primary = primary × 0.62 (`#680E1B`) for dark bands
  and footer; accent saffron `#E8871E`; place green `#1F6B4A`; highlight chip
  `#FFD978` on `#7A1020` text; text `#2B1A1C`, secondary `#5C4344`, muted `#7A5F60`;
  borders `#F0DCC8` / `#EBCFB8`; peach tints `#FDF1E6`, `#FDE8E2`.
- Type: headings Poppins + Noto Sans Devanagari 700–800 (Poppins has no
  Devanagari, so Marathi falls through to Noto — the repo already maps
  `--font-marathi` to Poppins); body Mukta 400–700. Devanagari headings need
  line-height ≥ 1.4.
- Shape: cards and photos 14–18px radius, pills 999px, soft warm shadows,
  no heavy rules. Touch targets ≥ 44px.

## Page order (desktop; phone keeps the same order, stacked)

1. **Utility strip** (primary): identity line; search, three text-size buttons
   (aria-pressed), sitemap, language select, staff login.
2. **Masthead** (sticky, cream): emblem + "माहिती व जनसंपर्क महासंचालनालय" left,
   Mahasamvad logo centred, right: "माझा जिल्हा" select (all 36 districts) and
   "आजचा फोल्ड" button (opens the existing fold dialog / `FoldDownload`).
   Centred pill nav below: मुख्यपृष्ठ, वृत्त विशेष, जिल्हा वार्ता, दुष्काळ २०२६
   (highlighted), कर्जमुक्ती २०२६, विशेष लेख, जय महाराष्ट्र, लोकराज्य, फॅक्ट चेक.
3. **Hero carousel** — full-bleed, 660px (phone 600px). 5 lead releases with
   photos. Primary-colour gradient over the photo from the left; yellow topic
   chip, place/date chip, heading only (no summary), white "संपूर्ण बातमी वाचा"
   pill + listen button. Bottom-left: prev, dash indicators (role=tablist; active
   dash wider and fills over 7s), next, pause. Autoplay 7s, pauses on hover,
   focus, or any open dialog; arrow/Home/End keys on the tabs. Replaces the
   current `LeadCarousel` look; keep its accessibility behaviour.
   **ताज्या बातम्या** — one column only, a cream card inside the hero on the
   right (400px): 5 newest releases not in the carousel, thumbnail + place/time +
   2-line title, "सर्व प्रसिद्धीपत्रके →". On phone it is a list under the hero.
4. **सध्या चर्चेत** — trending-topic chips; each opens search with a query.
5. **दुष्काळ २०२६ विशेष वृत्तांकन** — deep-primary band: heading, three number
   cards (२६५ दुष्काळसदृश तालुके · १२ उपाययोजना सुरू · १९ तालुक्यांत सर्वेक्षण —
   figures from releases 217495 / 217547), four district photo stories, key
   decisions row, "सर्व बातम्या" button that sets the topic filter and scrolls to
   the release list. Needs an editorial "special coverage" collection in the data.
6. **जिल्हा वार्ता** — selected district heading, district chips with counts,
   2×2 photo cards, existing district map module on the right.
7. **सर्व मंजूर प्रसिद्धीपत्रके** — topic filter chips (aria-pressed), list rows
   with photo, place/topic/date-time, title, 2-line summary, actions (ऐका, कॉपी,
   DOCX, शेअर on WhatsApp) and वृत्त क्र.; pagination. Side column: fold card +
   search by वृत्त क्र., subscribe (Telegram live; WhatsApp channel and email/RSS
   marked pending), date archive.
8. **विशेष लेख** — three large photo features.
9. **Media band** (dark): जय महाराष्ट्र / दिलखुलास video, earlier episodes,
   लोकराज्य issue card (cover is a placeholder).
10. **फॅक्ट चेक** — paste a message or वृत्त क्र.; matches against approved
    releases → match / partial / not found (with "send to fact-check team").
    Recent fact-check cards are placeholders. Per the brief, ship only once DGIPR
    confirms an official fact-check function.
11. **Social** — Facebook, X, Instagram, YouTube cards (verified URLs from the
    `SOCIAL` constant), preview content labelled as sample.
12. **Footer** (deep primary) with logo on a white plate, links, prototype status.
13. **Floating bottom pill nav** (fixed): मुख्यपृष्ठ, शोधा, जिल्हा, centre raised
    "विचारा" button (opens the assistant), फॅक्ट चेक, फोल्ड, संग्रह; plus a round
    "अ" button that cycles text size. Phone: 5 items with the same centre button.

## Overlays and behaviour (all in the component script)

- **Reading panel** — right drawer (phone: full screen) with text size, listen,
  copy, WhatsApp, photo, metadata, summary, full text, related releases.
  Escape closes; focus is trapped and returned.
- **Search** — searches title, place, department, topic and वृत्त क्र. as you
  type; Latin digits are converted to Devanagari; Enter opens the first result.
  Production: back it with the same corpus as the list (`?q=`), keeping the GET
  URLs the page already supports.
- **Listen** — `speechSynthesis`, `lang = 'mr-IN'`, toggles per release.
- **Copy** — title + summary + वृत्त क्र. + issuing authority to the clipboard,
  with a toast.
- **Assistant** — the prototype answers by keyword rules over the releases and
  always cites them. Production: retrieval over approved releases + an LLM
  (the repo has `openai`), same rule: answer only from approved releases, always
  show sources, say so when nothing is found.
- **Fold dialog** — unchanged behaviour from the current page (`foldArticles`,
  DOCX download).

## Not in this design

The old "विशेष लक्ष" and "मुख्यमंत्री व मंत्रिमंडळ" blocks were removed on
purpose.
