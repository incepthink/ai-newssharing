# Fold DOCX — format specification

Reverse-engineered from `Dgipr News Fold 1 Sep 2026 (2).docx`.
**Every fold the system generates must match this.** Where the source document is
internally inconsistent (separator lines, see §6) we standardise — noted below.

---

## 1. Page setup

| Property | Value |
|---|---|
| Page size | A4 — 8.27" × 11.69" |
| Margin left / right | 1.0" / 1.0" |
| Margin top / bottom | 0.59" / 0.39" |
| Header / footer | **Empty.** No running header, no page numbers |
| Tables | None |
| Images | None |

## 2. Fonts

Three scripts appear in the same document. Font is chosen per article by language.

| Language | ascii / hAnsi | cs (complex script) |
|---|---|---|
| Marathi | `DVOT-Surekh` (also `DVOT-SurekhMR`) | same |
| Hindi | `Arial` | `Mangal` |
| English | `Times New Roman` | `Times New Roman` |

Sizes (`w:sz` is half-points — the value in the XML is double the point size):

| Element | Size |
|---|---|
| Body, datelines, meta lines | **12 pt** |
| Emphasised headline | **14 pt** |
| Minor / sub lines | 10 pt, 11 pt (occasional) |

> ⚠️ **DVOT-Surekh is a proprietary Marathi font.** It must be installed on the
> machine rendering the DOCX or Word substitutes and the fold looks wrong. Confirm
> DGIPR can supply the font file, or agree a Unicode fallback before building the
> generator.

## 3. Paragraph defaults

| Property | Value |
|---|---|
| Body alignment | **Justified** |
| Body first-line indent | **0.5"** (457200 EMU) |
| Line spacing | 1.0 |
| Space after | 0 |

## 4. Anatomy of one article

**Document head — only on the FIRST article.** In the source, the date and weekday
lines appear once, wrapped around the first article's release number. Later articles
carry only `वृत्त क्र.` and, sometimes, the office line.

```
                                          दि. १ सप्टेंबर, २०२६        ← first article only
                                          वृत्त क्र. 3331             ← right, bold, 12pt
                          मुख्यमंत्री सचिवालय (जनसंपर्क कक्ष)         ← right, bold, 12pt — OPTIONAL
                              मंगळवार, दि. १ सप्टेंबर, २०२६.          ← first article only
```

**Then, for every article:**

```
                                                    (गृह विभाग)      ← right, bold — department, OPTIONAL

              महाराष्ट्रातून अंमली पदार्थाचे २०२९ पर्यंत समूळ उच्चाटन   ← CENTER, bold — HEADLINE
                        (may run to two centred lines)

                                    – मुख्यमंत्री देवेंद्र फडणवीस      ← right, bold — OPTIONAL

              गुंतवणूक, आर्थिक विकासाला चालना मिळणार                  ← CENTER, bold — sub-heads, 0..n
              भूमी प्रशासनासाठी एकात्मिक डिजिटल सुविधा                 ← NO bullet character

    मुंबई, दि. १ :  <body text…>                                      ← JUSTIFIED, 0.5" indent
    <further body paragraphs…>                                        ← bold runs inline for sub-headings

                                    0000                              ← CENTER — separator
                            अश्विनी पुजारी/विसंअ                       ← writer credit, OPTIONAL
[page break]
```

**Rules:**

- **Each article starts on a new page.** The source has 6 articles and 6 page breaks.
- **Sub-heads carry no bullet character.** They are plain centred bold lines. The
  `•` seen in the WhatsApp export is a WhatsApp convention only — never in the DOCX.
- **The dateline** (`मुंबई, दि. १ :`) opens the first body paragraph inline — it is
  not its own paragraph.
- **Headline size:** the source has one headline at 14pt and the rest at 12pt.
  Generated folds use **12pt** throughout — a generated document should be
  consistent even where the hand-made one is not.
- A headline may occupy two or three centred paragraphs where the writer broke it
  by hand. Treat it as one field and let it wrap.
- Bold runs appear *inside* body text for inline sub-headings
  (`प्रकल्पाबाबत माहिती`, `नागरिकांना होणारे फायदे -`). Preserve them.
- `(विभाग)`, the office line, the attribution, the sub-heads and the writer credit
  are all **optional** and vary article to article.

## 5. वृत्त क्र. — the release number

Each article carries an official DGIPR release number. In the source these run
**3331, 3330, 3329, 3328, 3327, 3326** — sequential and **descending** through the
document, i.e. newest release first.

This is a real identifier in DGIPR's existing system.

**Decided:** the **News Department assigns it** during proofreading. DLOs never enter it.
The platform suggests the next number in sequence and lets the desk override, because the
counter is DGIPR's and may advance outside our system.

## 6. Separators — we standardise

The source uses four different end-of-article separators, inconsistently:

| Separator | Times used |
|---|---|
| `0000` | 5 |
| `००००` | 3 |
| `--००--` | 2 |
| `--०--` | 1 |

This is human variation, not meaning. **Generated folds use `0000`, centred, 12 pt**,
for every article. If DGIPR wants the Devanagari `००००` instead, it's a one-line change.

## 7. Cabinet decisions — not a special case

`वृत्त क्र. 3331` in the source document is a block of four cabinet decisions under
one release number, introduced by a centred bold count line (`मंत्रिमंडळ निर्णय (एकूण – ४)`).

**The generator does not model this.** There is no composite article type. A cabinet
release arrives the way every other article arrives — a DLO pastes the whole thing,
count line and all, into the submit form — and renders as ordinary body text under one
release number. The count line is whatever the source text says; nothing computes it.

What the desk does with such an article is mark its `category` as `cm`. That is a queue
label and changes nothing in this document.

## 8. Language is per article, not per fold

The 1 Sep fold contains **Marathi, Hindi and English** articles in the same document.
The 2 Sep WhatsApp export confirms it: of 36 articles, 26 are Marathi, 5 English
(`-en.docx`), 5 Hindi (`-hi.docx`).

**Confirmed:** DLOs submit in all three languages. `language` (`mr` | `hi` | `en`) is a
field on Article, AI-detected at submission and correctable by the desk. It drives font
selection in §2, the language the title and 60-word summary are written in, and the
`-hi` / `-en` suffix on per-article DOCX filenames.
