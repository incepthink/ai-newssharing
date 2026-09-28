# DGIPR news landing page — design brief

Revised 28 September 2026 after reviewing the [PIB homepage](https://www.pib.gov.in/indexd.aspx?reg=48&lang=1), the supplied screenshot of PIB's Social Engagements section, the running `/news` and `/map` pages, and [DGIPR's description of its work](https://dgipr.maharashtra.gov.in/about).

## Design intent

Build a **full public news homepage** with the same breadth of useful components that the client likes on PIB: lead news, releases, focus collections, explainers, topic entry points, media, social accounts, archives, search, and public information. Make each component clearer and easier to use than PIB's version. The Maharashtra map is **one feature on this page**, not the page's organizing concept or its largest section.

The promise to a reader: **“महाराष्ट्र शासनाच्या अधिकृत बातम्या — ताज्या, विषयानुसार आणि तुमच्या जिल्ह्यातील.”** A citizen can discover news; a journalist can find and cite a release; DGIPR can use the page as a credible front door to its complete publishing work.

## PIB component coverage

The brief must account for the components PIB actually shows. “Same or similar” means preserving the purpose of each component while using this site's own design language and Maharashtra content.

| PIB component | Proposed DGIPR equivalent on `/news` | Better experience |
| --- | --- | --- |
| Government identity, utility bar, region/language and accessibility controls | DGIPR/Mahasamvad identity; Marathi/English choice; district quick-select; search; accessibility/help links | One compact, usable header. The chosen language and district persist in links. No tiny icon-only controls. |
| Large rotating image banner | One editorial lead story with authentic image when available, plus 3–5 latest headlines | Clear hierarchy, readable on phones, no automatic rotation or hidden stories. |
| PM profile and links to releases, speeches, photos, videos, decisions | “मुख्यमंत्री व मंत्रिमंडळ” gateway with releases, decisions, speeches, photos and videos, where published | A compact content gateway rather than a personality block taking over the page. |
| PM video / InFocus / campaign quick links | Featured video, **विशेष लक्ष** feature, and 3–5 current campaign or policy links | Each has a date, destination and editorial owner; expired campaigns leave the featured slot. |
| Latest press releases and “More” | Prominent latest approved releases module and full searchable archive | Full headlines, issue date, district/statewide, department and release number; quick route to all releases. |
| Most viewed | “लोकप्रिय बातम्या” module once real analytics exist | Separate popularity from editorial importance; show the measurement period. |
| Latest explainers and subject carousels | “समजून घ्या” explainers and topic collections such as schemes, health, agriculture and infrastructure | Useful summaries and clear topic landing routes instead of an overfilled carousel. |
| Media advisory, invitations, accreditations and facilitation | “माध्यमांसाठी” area: upcoming advisories/events, invitations and media service links | Event date and time are visible; journalists can scan upcoming items quickly. |
| Video gallery, photo gallery, infographics, e-books and blog | “फोटो, व्हिडिओ आणि माहितीचित्रे” media area with format cards and browse links | Show caption, date, credit and playable/viewable preview. Do not send readers into unlabeled files. |
| Social Engagements: X, fact check, Instagram and Facebook (shown in supplied screenshot) | **“सोशल मीडियावर महासंवाद”** section for DGIPR's official X, Facebook, Instagram, YouTube and Telegram channels; WhatsApp channel if approved for this site | Named account cards with preview and “Follow/View on…” actions. A dedicated fact-check card appears only if DGIPR operates and verifies that channel or service. |
| Archives, RSS/subscription and advanced search | Search with advanced filters, date archive and follow/subscribe options | One search flow; useful saved filter URLs; clear distinctions between site news and social notifications. |
| Official links, contact, policies and certification | Government/service links, contact, RTI/accessibility/privacy and source information | Organize in a readable footer; retain provenance without a wall of links. |

PIB's [homepage](https://www.pib.gov.in/indexd.aspx?reg=48&lang=1) provides this component range. DGIPR's [about page](https://dgipr.maharashtra.gov.in/about) names district and division news, schemes, success stories, photos and video as part of its work. DGIPR's [official Telegram channel](https://t.me/MahaDGIPR) links to its X, Facebook, Instagram, YouTube and Telegram accounts. Confirm each destination with DGIPR before publication.

## Page composition and priority

```text
1  Utility strip + public masthead
   DGIPR identity | language | district | search | accessibility

2  Lead news + latest headlines
   1 featured/leading release, 3–5 current headlines, “सर्व बातम्या”

3  InFocus + quick links
   1 major policy/event/campaign; compact मुख्यमंत्री/मंत्रिमंडळ gateway

4  Latest press releases
   Clear list of current releases, topic chips, archive/search entry

5  Maharashtra news map  ← a feature, not the page frame
   District activity preview + district finder + 2–3 selected headlines
   “पूर्ण नकाशा पहा” opens existing /map experience

6  Explainers + topic collections
   Schemes, public services, agriculture, health, infrastructure, etc.

7  Media corner
   Advisories, invitations and journalist service links

8  Photo / video / infographic / publication gallery

9  Social Engagements
   DGIPR's official platform cards and recent content previews

10 Institutional footer
   Archives, subscriptions, public links, contact, policies, last updated
```

This is the **desktop reading order**. On mobile, preserve the same order with stacked modules. Do not make users swipe a carousel to reach a story or rely on the map to find a district.

### Section behavior

**Lead and latest.** The lead is selected by an editor; if none is selected, the newest approved release fills the slot and is labeled as latest. A real image is welcome, but a typographic lead is better than a generic or unofficial image. The adjacent headline list makes the page feel current even when the lead remains featured for several days.

**Latest press releases.** This is the page's main news utility. Search and filters should live here rather than consuming the entire first screen. Show district, department, publication date/time, language, issuing office and release number when present. Keep read, share and DOCX, but put the most important action first. A compact view/list control can let journalists scan more stories than a three-column card grid allows.

**Map feature.** Use the existing 36-district map as a bounded module, approximately one content band, with a visible period such as “मागील ७ दिवस.” Hover/focus or tap a district to see its count and 2–3 recent releases; selecting “जिल्ह्यातील सर्व बातम्या” moves to filtered results. Provide an adjacent district picker and text list so the feature works on phones and with assistive technology. Separate statewide releases from geographic shading. The existing `/map` remains the detailed map destination with its time and source controls.

**Explainers and topics.** Give each a recognizable editorial treatment. An explainer answers a public question in plain Marathi; a topic collection groups related approved releases. These are not relabeled press releases. Include the modules in the design, and define the editorial content/types needed to populate them.

**Media corner and gallery.** Media invitations need event time and place, with passed events clearly archived. Photo/video/infographic previews need dates and captions. Show a small curated selection plus “सर्व पहा,” not endless horizontal sliders.

**Social Engagements.** This is a full-width lower-page section, visually distinct like the PIB example, with a title, account names, platform color accents and preview content. Use a 3-column desktop arrangement that can show X and Facebook updates, Instagram imagery, YouTube video and a Telegram/WhatsApp follow card without nested scrollbars. On mobile, use stacked cards. Each card identifies the account as DGIPR's, shows the date of its latest preview, and links directly to the verified profile/post. If an embed is blocked, slow or requires consent, the designed card and outbound link still work. Do not display stale follower counts or empty embeds. A fact-check channel or function should be included only if DGIPR confirms an official one; PIB's Fact Check card is a component type, not permission to imply DGIPR has the same unit.

**Footer and trust.** Include the issuing authority, source policy, archives, contact, accessibility, privacy and related government links. The page should state whether it is a pitch prototype or an officially adopted DGIPR site; branding and publication claims follow that status.

## Visual and UX direction

- **Government credibility, editorial ease.** Keep the current warm off-white and deep maroon foundation. Use stronger type scale and more air between sections than PIB, while preserving the sense of an official, information-rich portal.
- **Dense where useful.** Latest releases and journalist notices can be compact lists; explainers and visual media can use cards. Avoid forcing every content type into the same card template.
- **Marathi-first, multilingual-ready.** Date formats, search labels and filters should read naturally in Marathi. A language switch must lead to actual translated content or clearly indicate availability.
- **No surprise motion.** Avoid auto-advancing banners. Any ticker/video motion needs pause. Keep focus indicators, sufficient contrast, semantic headings and readable text at 200% zoom.
- **Fast and resilient.** Map and social previews should enhance the page, not hold up the latest releases. External embeds should not create nested scrolling or leave blank holes when unavailable.

## What the current product already has, and what must change

Current [`/news`](../src/app/news/page.tsx) has useful Marathi search/filter/card actions, but shows ten representative sample articles. Current [`/map`](../src/app/map/page.tsx) displays approved desk releases and offers a much richer geographic view. A reader can therefore see a release on the map that is absent from the news list. **The first implementation step is to make the lead, latest releases, search, map preview and counts use the same approved records and canonical release URLs.** Remove the sample-content presentation from the public page.

The current staff links (`/dlo`, `/desk`, `/fold`, `/share`) also sit in the public masthead. For this page, group them under a separate staff entry, and make the main navigation about reading: News, Districts, Topics, Media, Search and Archives.

The database already stores approval status, date, district, language, issuing office, department and release number. Additional editorial inputs are needed for the lead slot, explainers, topic collections, media assets and advisories. Popularity needs actual analytics. The brief **includes** these components as target page sections and specifies the data required to launch them truthfully.

## Build sequence

1. **Public news foundation:** unified approved corpus, public navigation, lead/latest/release stream, search and archive entry.
2. **Full homepage breadth:** map feature, InFocus, topic/explainer and media/advisory sections with their publishing workflows.
3. **Social and utility polish:** verified DGIPR social cards/previews, subscriptions, accessibility refinement, analytics-backed popular items.

The final designed page should show the complete composition from the start; these phases are about connecting and validating each section, not reducing the design to a map and a release list.

## Acceptance criteria

- The landing page has an explicit counterpart for every PIB component family listed above, including **Social Engagements**.
- The map occupies one section of the landing page and links to the detailed map; it does not dominate the hero or entire page.
- The first screen clearly shows what is new, when it was published, and how to reach all releases.
- A newly approved release appears consistently in latest news, search, and its district/statewide map view, all pointing to the same article.
- Official social destinations are verified; their previews remain usable if third-party embeds fail.
- No sample article, invented explainer, fabricated popularity number or unverified government account is presented as official content.
- Readers can complete the main journeys on a phone and with a keyboard: find a release, find a district, open media, follow an official channel and locate contact/archives.
