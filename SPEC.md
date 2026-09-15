# AI NewsSharing — Product Spec v1.0

**One line:** Mahasamvad is the newspaper. This is the newsroom — the system that produces what gets published, replacing the email chain between district officers, the news desk, and distribution.

**Status:** Prototype / pitch build. No real auth, no production deployment assumptions.
**All open questions closed — ready to build.**

---

## 1. The problem, in one picture

```
TODAY                                    WITH AI NEWSSHARING

DLO writes article in Word               DLO pastes article into a form
        ↓ email                                  ↓ (AI extracts title + district)
News dept opens each mail                News desk sees one queue
        ↓ manual                                 ↓ edits in place, approves
Proofreads, assembles fold by hand       Fold compiles itself
        ↓ email                                  ↓
Publisher receives fold                  Publisher downloads the fold
        ↓ separate manual work                   ↓
Varsha prepares per-article docs         Per-article DOCX + 60-word summary, one click
        ↓                                        ↓
WhatsApp                                 WhatsApp
                                         (+ heatmap over the whole thing, free)
```

Three people, three complaints, one pipeline.

| Person | Complaint | Solved by |
|---|---|---|
| Yagesh | Email route to news dept is slow; fold assembled by hand | Stages 1–3 |
| Varsha | Needs per-article DOCX + 60-word summary for WhatsApp | Stage 4 |
| Brijesh | Can't see what's happening across the state | Stage 5 |

---

## 2. Decisions locked

| Question | Decision |
|---|---|
| Language | **UI Marathi throughout.** Articles may be **Marathi, Hindi or English** — DLOs submit all three. AI detects language per article |
| Article submission | DLO **pastes raw text** into one textarea. No title/body split, no images |
| AI extraction | **Title + district + language** (title and district are suggestions the editor can correct) |
| Proofreading | **In-app rich text editor**. No Word round-trip |
| Rejection | **None.** Editor fixes whatever arrives and approves |
| Fold | **One statewide fold per day** |
| Fold output | **Download the DOCX**, matching the DGIPR template exactly (`FOLD-FORMAT.md`). That's the end of the pipe |
| 60-word summary | **Generated on demand at share time**, against final edited text |
| WhatsApp | **Generate text, user sends manually.** One message per fold, or per selected articles (`WHATSAPP-FORMAT.md`). No Business API |
| Map | **Heatmap by article volume over time** |
| Auth | **None.** Three role buttons on the landing page |
| Codebase | **Fresh start**, port the useful pieces |
| Scale | **13 DLOs**, ~**36 articles/day** (2 Sep 2026 actual) |
| Cutoff | **None.** The fold is never locked by a clock |
| Who writes articles | **DLOs write every article**, CM secretariat releases and cabinet decisions included. The news desk **never authors** — it proofreads and segregates |
| CM segregation | The desk marks each article **CM / cabinet business or not** (`category`). AI suggests, the desk confirms. It is a **label**: it drives the queue filter and badge, nothing in the fold or the outputs |
| `वृत्त क्र.` | **Assigned by the News Department** during proofreading. Not a DLO field |
| Fold = document | **One fold per day is one document.** No splitting |
| `DVOT-Surekh` | **Available.** No Unicode fallback needed |
| Fold ordering | **The News Department decides.** No automatic rule |
| WhatsApp splitting | Split at **article boundaries** only. No part labels, no "1/4" numbering |

---

## 3. Roles

No login. Landing page with three buttons:

- **डीएलओ (DLO)** — submit an article
- **वृत्त विभाग (News Department)** — proofread, **segregate CM items from the rest**, approve, compile the fold. It writes nothing
- **इतर (Anyone else)** — share articles, view the map

Role is held in client state. Swap in real auth later; nothing else in the design depends on it.

---

## 4. The pipeline

### Stage 1 — Submit (DLO)
- **Every article enters here.** There is no other way in — the Chief Minister's
  secretariat releases and cabinet decisions are pasted through this same form.
- Single textarea: paste the article. Optional: a district dropdown the DLO may pre-fill.
- On submit, **one LLM call** extracts:
  - `language` — `mr` | `hi` | `en`, detected from the pasted text
  - `title` — a headline **in the same language as the article**
  - `district` — one of Maharashtra's 36, or `null` if unclear
  - `category` — `cm` | `general`, a **suggestion** the desk confirms in Stage 2
- Article is saved with status `pending`. DLO sees a confirmation and their own submission history.
- No images. No attachments. Text only.

**Why one call:** cheap, fast, and everything else the system needs is derivable later.

> **Language is not just a label.** It picks the DOCX font (`DVOT-Surekh` / `Arial`+`Mangal` / `Times New Roman`), the language the title and the 60-word summary are written in, and the `-hi` / `-en` suffix on the per-article DOCX filename. Get it wrong and the fold renders in the wrong typeface.
>
> District detection must still resolve to the **canonical Marathi district list** even when the article is in English or Hindi — "Solapur" and "सोलापूर" are the same district.

### Stage 2 — Proofread (News Department)
- Queue of `pending` articles for the day, newest first.
- **~36 articles a day from 13 DLOs** — the queue is the busiest screen in the product. It needs filters (district, language, status), keyboard navigation, and a visible count of what's still pending. Don't build it as a simple list.
- Click one → rich text editor with the body, an editable title, a **prominent वर्ग (CM / इतर) toggle**, and a **prominent district selector** — both showing the AI's guess.
- The editor **assigns `वृत्त क्र.`** here. DLOs never see it. Suggest the next number in sequence; let the desk override, since the counter is DGIPR's and may move outside our system.
- Editor fixes the text, confirms the district, hits **मंजूर करा (Approve)**. Status → `approved`.
- Editor can also **park** an article (hold it out of today's fold without deleting it) — the one state beyond approve/pending worth having.
- **Segregation is the desk's own decision.** Every article carries a `category` — `cm` (Chief Minister / cabinet business) or `general`. The AI suggests it at submission; the desk confirms it in the editor, and **cannot approve without confirming** — the same gate the district has. The queue filters and badges on it. It changes nothing downstream: the fold, the DOCX and the WhatsApp message are identical either way.
- **The desk does not write.** There is no compose screen. If an article is missing from the fold, it is missing because no DLO sent it.

> ⚠️ **District accuracy lives or dies here.** The AI guesses; the desk confirms. If the district field is buried, the heatmap is fiction. Make it impossible to approve without looking at it.

### Stage 3 — Fold (News Department)
- A single **आजचा फोल्ड** (today's fold) view: all `approved` articles for the selected date, in order.
- **Drag to reorder.** The desk decides the sequence — there is no automatic rule, not by release number and not by time. Default the list to newest-first as a starting point, then leave it alone.
- Live preview.
- **Download DOCX** — generates **one document for the whole day**, each article on its own page, exactly per `FOLD-FORMAT.md`.
- Nothing is emailed. The publisher opens the platform and downloads.
- **No daily cutoff.** The fold stays open; approving a late article adds it to that date's fold and the next download includes it. Folds for past dates remain downloadable and regenerate from whatever is approved at that moment.

### Stage 4 — Share (Anyone)
- Browse approved articles, filter by date and district.
- Select one or more → **Prepare WhatsApp message**:
  - For each selected article: generate a **60-word summary in the article's own language** (LLM call, on demand, against the approved text)
  - Produce a **per-article DOCX**
  - Produce a copy-ready WhatsApp message + `wa.me` share link
- Also: **prepare a message from the entire fold** — the whole day in one message.
- If the message exceeds WhatsApp's limit it is **split at article boundaries**. No part numbering, no "continued" labels — each chunk is just a valid message in the same format.
- User copies or taps share; sending happens in their own WhatsApp.

### Stage 5 — Map (Anyone / Brijesh)
- Maharashtra choropleth, 36 districts.
- Shaded by **article count** over a selectable date range (today / 7 days / 30 days / custom).
- Date slider to watch coverage move over time.
- Click a district → that district's articles for the selected range.
- Counts **approved articles only** — otherwise unreviewed AI district guesses pollute the picture.

---

## 5. Data model (minimal)

```
Article
  id
  raw_text          // exactly what the DLO pasted
  title             // AI-extracted, editor-editable
  body              // editor-edited rich text; starts as raw_text
  district          // AI-suggested, editor-confirmed
  language          // mr | hi | en — AI-detected, editor-correctable
  release_no        // वृत्त क्र. — assigned by the news desk at proofreading
  category          // cm | general — AI-suggested, desk-confirmed. A label; nothing downstream reads it
  status            // pending | approved | parked
  submitted_by      // role label only, for now
  submitted_at
  approved_at
  fold_date         // which day's fold it belongs to

Fold
  date              // one per day, one document
  article_order[]   // article ids — the desk's chosen sequence, hand-ordered
  finalized_at      // advisory only; there is no cutoff
```

Summaries are **not stored** — generated on demand.

---

## 6. LLM usage

| When | Call | Output |
|---|---|---|
| On submit | Extract structure | `{ language, title, district, category }` |
| On share | Summarise | 60-word summary **in the article's own language** |

Two calls, both cheap. `category` is a two-value guess — anything that is not `cm` is stored as `general`, and the desk confirms it either way. Guard the district output against the fixed list of 36 — never let the model invent one, and map English/Hindi place names onto the canonical Marathi list.

---

## 7. Explicitly out of scope (v1)

- Real authentication, user management, government SSO
- Publishing to mahasamvad.in (needs access we don't control — revisit after the pitch)
- WhatsApp Business API sending
- Images, attachments, media
- Send-back-to-DLO / rejection workflow
- **Translation** between languages (articles stay in the language they arrived in)
- Taluka-level geography, entity extraction, thematic layers

---

## 8. Build order

1. **Submit → queue → editor → approve** (Yagesh's problem, the expensive one)
2. **Fold compile + DOCX download** (completes Yagesh)
3. **Per-article DOCX + 60-word summary + WhatsApp prep** (Varsha — port existing work)
4. **Heatmap** (Brijesh — the demo closer)

Ship 1 and 2 before touching 4. The map is the most exciting and least urgent thing here; the fold is where the hours actually go.

---

## 9. Resolved decisions

Every question raised by the fold DOCX and the WhatsApp export is now closed.

| # | Question | Answer |
|---|---|---|
| Q1 | Language | DLOs submit Marathi, Hindi **and** English. Per-article field, AI-detected |
| Q2 | Where `वृत्त क्र.` comes from | **The News Department assigns it** during proofreading |
| Q3 | One fold per day = one document? | **Yes.** The 1 Sep file was a partial |
| Q4 | `DVOT-Surekh` font | **Available.** No fallback needed |
| Q5 | WhatsApp splitting | Split at article boundaries. **No labelling** — just a correctly formatted message |
| Q6 | Cabinet decisions | **Written by DLOs like everything else**, pasted as ordinary text into the single textarea. No composite article type. The desk marks them `cm` |
| Q7 | Fold ordering | **The News Department decides.** Hand-ordered, no rule |

---

## 10. Companion documents

- `FOLD-FORMAT.md` — exact DOCX specification: page setup, fonts, per-article anatomy, separators
- `WHATSAPP-FORMAT.md` — message template for whole-fold and selected-article sharing
