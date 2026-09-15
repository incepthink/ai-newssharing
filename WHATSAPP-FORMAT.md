# WhatsApp message — format specification

Reverse-engineered from `dgipr-whatsapp-2026-09-02.txt` (36 articles, 2 Sep 2026).
This format is **already built** in the old repo — port it, don't redesign it.

---

## 1. Two message modes

| Mode | Contents |
|---|---|
| **Whole fold** | Header block + every article in the day's fold |
| **Selected articles** | Header block + only the articles the user ticked |

Same template either way. Selection just filters the article list.

## 2. Header block

```
*माहिती व जनसंपर्क महासंचालनालय*

*महत्वाच्या बातम्यांचा सारांश*

*२ सप्टेंबर २०२६*
-----------
```

- Date rendered in **Marathi numerals and month names**.
- The `-----------` rule (11 hyphens) closes the header.

## 3. Per-article block

```
*<headline>*
-<attribution>                        ← optional, e.g. -कृषी राज्यमंत्री आशिष जयस्वाल
• <sub-bullet>                        ← optional, zero or more

<dateline>, दि. २ : <~60-word summary>

संपादनयोग्य प्रत (DOCX):
<url>

──────────────
```

- Headline wrapped in `*…*` for WhatsApp bold.
- Body is the **60-word summary**, not the full article — opens with the dateline.
- `संपादनयोग्य प्रत (DOCX):` ("editable copy") labels the download link.
- Articles separated by `──────────────` (14 × U+2500 box-drawing).

## 4. The DOCX link

Each article links to its own hosted file:

```
https://<host>/dgipr/docs/ms-3372.docx        ← Marathi (default, no suffix)
https://<host>/dgipr/docs/ms-3349-en.docx     ← English
https://<host>/dgipr/docs/ms-3349-hi.docx     ← Hindi
```

Pattern: `ms-<release number>[-<lang>].docx`, where the number matches
`वृत्त क्र.` from the fold. Marathi carries no suffix.

**This means per-article DOCX files must be generated and publicly hosted** at a
stable URL before the WhatsApp message can be sent — the message is a set of links,
not attachments.

## 5. Length

The 2 Sep file is **57 KB / 340 lines** for 36 articles. That is far past WhatsApp's
single-message limit (~65,536 characters, but practically much less before clients
truncate or refuse).

The old repo has a `dgipr-whatsapp-parts/` directory — the full-fold message is already
being split.

**Decided:** split at **article boundaries** only. No part numbers, no "1/4", no
"continued" labels. Each chunk is simply a valid message in this same format — header
block, then whole articles, never a truncated one. The header block repeats on each chunk.
