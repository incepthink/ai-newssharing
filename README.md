# AI NewsSharing

The newsroom behind Mahasamvad. District officers submit, the news desk proofreads
and approves, the day's fold assembles itself, and articles go out over WhatsApp —
without the email chain.

Built for the Maharashtra Directorate General of Information and Public Relations
(DGIPR). See `SPEC.md` for the product decisions, `FOLD-FORMAT.md` and
`WHATSAPP-FORMAT.md` for the two output formats.

---

## Running it

```bash
pnpm install          # or npm install
cp .env.example .env.local
# add your OPENAI_API_KEY to .env.local
pnpm seed             # optional — loads 16 real releases so there's something to see
pnpm dev
```

Open http://localhost:3000.

The app stores articles in Postgres. Point `DATABASE_URL` at any Postgres instance
(AWS RDS in production, a local server or `docker run postgres` in development);
the schema is created automatically on first query.

**Without an API key** the app still runs: submitting an article saves it with a
blank title for the desk to fill in, and WhatsApp summaries fall back to the
opening of the approved text. Nothing is lost, it's just less automatic.

## The screens

The desk never writes an article. DLOs write all of them — CM secretariat releases and
cabinet decisions included — and the desk proofreads, decides whether each one is Chief
Minister / cabinet business, and approves.

| Route | Who | What |
|---|---|---|
| `/` | — | Role picker. No auth in the prototype |
| `/dlo` | District officer | Paste an article — the only way anything enters. Language, headline, district and CM-or-not are detected |
| `/desk` | News department | The queue — filter, search, open, fix, segregate (CM / इतर), approve |
| `/fold` | News department | The day's fold — reorder, download as one DOCX |
| `/share` | Anyone | Pick articles or the whole fold → a ready WhatsApp message |
| `/map` | Anyone | District heatmap and volume over time |

## How it's put together

```
src/lib/
  types.ts        Article, Fold, Category
  db.ts           SQLite — schema, queries, fold ordering, stats
  districts.ts    The 36 districts + alias resolution (mr / hi / en / former names)
  marathi.ts      Devanagari numerals and the date forms DGIPR uses
  ai.ts           One extraction call at submit, one summary call at share
  whatsapp.ts     Message builder — see WHATSAPP-FORMAT.md
  docx/
    common.ts     Page setup, fonts per language, paragraph styles
    article.ts    One article's paragraphs — shared by fold and per-article DOCX
    fold.ts       The day's document
```

### Things worth knowing before you change something

**District is the honest bit.** The AI proposes it, the desk confirms it, and the
editor won't let you approve until someone has ticked that box. The heatmap counts
approved articles only. If you loosen that, the map becomes fiction.

**Language picks the font.** `mr` → DVOT-Surekh, `hi` → Arial + Mangal,
`en` → Times New Roman. DVOT-Surekh must be installed on the machine that opens
the DOCX, or Word substitutes and the fold looks wrong.

**One article renders once.** `articleParagraphs()` is shared between the fold and
the standalone DOCX, so a downloaded article is identical to its page in the fold.

**There is no cutoff.** The fold regenerates on every download. Approving an article
late simply puts it in the next one. `getFold()` keeps the desk's hand-ordering and
appends anything newly approved rather than resorting.

**`वृत्त क्र.` belongs to DGIPR.** We suggest the next number; the desk overrides it.
Never treat our counter as the source of truth.

## Not built yet

- Real authentication (roles are just buttons)
- Publishing to mahasamvad.in
- WhatsApp Business API sending — messages are copied or opened via `wa.me`
- Images and attachments
- The geographic choropleth — `/map` ranks districts honestly; port the GeoJSON
  map from `maharashtra-is-building` and feed it `heatColor()`
