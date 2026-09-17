/**
 * A press release cut down to sixty words, for a card.
 *
 * This is a **cut and never a rewrite**, and the distinction is the whole
 * reason the file is this careful. `DgiprPanel` prints a government
 * department's own words in full and says at length why that is allowed;
 * everything on the way to that panel has to hold the same line. Summarising a
 * release — compressing it, paraphrasing it, running it through a model — would
 * be this app putting words in a department's mouth on a surface a reader takes
 * to be the department speaking. So what happens here is mechanical: drop what
 * the card is already printing, take the release's own opening words in the
 * order they were written, and stop.
 *
 * Sixty words because that is the length `FeatureArticle.summary60` settled on
 * for the reader page, and a citizen who meets a release on the map and then
 * opens it should be reading the same shape of thing twice.
 */

/** The target. Not a hard ceiling — a release shorter than it is returned
 *  whole, and nothing is ever padded to reach it. */
const SUMMARY_WORDS = 60;

/**
 * A dateline at the head of the text, in either script.
 *
 * Marathi rows open `मुंबई, दि. १६ :` and the desk's English rows open
 * `Mumbai, September 2 :`. Both are lifted, because the card prints the place
 * and the date in its own metadata row — leaving the dateline in would spend
 * four of the sixty words repeating the line directly above it.
 *
 * The place is capped at 60 characters for the reason `share-message.ts` caps
 * it at 40: a dateline is a town name and a comma, and anything longer is a
 * sentence that happens to contain the word दि.
 */
const DATELINE_HEAD =
  /^.{0,60}?,\s*(?:दि\s*\.?\s*[०-९\d]+|[A-Z][a-z]+\s+\d{1,2})\s*[:：]\s*/;

/**
 * A WordPress byline, which is the one piece of furniture this corpus carries.
 *
 * `mahasamvad.in` runs on WordPress and prints `By Guest -सप्टेंबर 15, 2026`
 * under every post's standfirst. A release pasted into the desk from the site
 * brings that line with it, and it is not the department's text — it is the
 * theme's. Two of the fifteen approved rows have one today, and both of them
 * were spending a fifth of their sixty words on it.
 *
 * Deliberately narrow. It matches the theme's exact shape and nothing else,
 * because a loose "drop short leading lines" rule would eventually eat a real
 * standfirst, and a summary that silently drops the department's own second
 * sentence is a worse failure than one that begins with a byline.
 */
const WP_BYLINE = /^By\s+\S[^\n]{0,60}?\s*[-–—]\s*\S[^\n]{0,30}$/i;

/**
 * The text as the lines it was written in.
 *
 * Both separators, because the two stores disagree. The curated mahasamvad
 * rows are blank-line separated prose; the rows this desk stores are a
 * headline, a standfirst and then the body, separated by single newlines —
 * splitting those on blank lines only returns the whole release as one
 * paragraph and none of the stripping below ever fires.
 */
export function releaseLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Loose equality for "is this line that field again". Punctuation, the dash
 *  DGIPR opens an attribution with, and the quotation marks it sets around
 *  scheme names all vary between a column and the body's own copy of it, so
 *  neither side is compared verbatim. */
function sameText(a: string, b: string): boolean {
  const flatten = (text: string) =>
    text.replace(/[\s‘’“”"'.,:;–—-]+/g, "").toLowerCase();

  return flatten(a) === flatten(b);
}

export type ReleaseParts = {
  /** The `title` column. The desk stores `body` with the headline as its first
   *  line — that is how a DLO pastes a release in, and it is what the DOCX
   *  builder expects — so a summary taken off the raw text would open by
   *  repeating the headline set in bold immediately above it. */
  titleMr?: string | null;
  /** The `attribution` column. Printed as the deck on the reader page and as a
   *  badge on the card, and some rows carry it as the body's first line too. */
  attributionMr?: string | null;
};

/**
 * The release's own prose, as lines, with the furniture taken off.
 *
 * Nothing here is ever rewritten, reordered or shortened — lines are either
 * kept whole or dropped whole, and a line is only dropped when it is something
 * the reader is already being shown (the headline, the attribution) or
 * something no department wrote (the WordPress byline). The two cases have
 * different rules about *where* they may be dropped from, and the comments
 * below say why.
 */
export function releaseBodyLines(text: string, parts: ReleaseParts = {}): string[] {
  const lines = releaseLines(text);

  /* The headline and the attribution are stripped only from the *front*, and
     only while they keep coming. Both are things the surface has already
     printed above the text; a line matching one of them further down is the
     department repeating itself on purpose, which is the department's business
     and not this function's. */
  while (lines.length > 1) {
    const head = lines[0];

    const repeated =
      (parts.titleMr && sameText(head, parts.titleMr)) ||
      (parts.attributionMr && sameText(head, parts.attributionMr));

    if (!repeated) break;

    lines.shift();
  }

  /* The byline is dropped wherever it stands, which is the one rule here that
     is not positional — and it has to be. A pasted mahasamvad post puts it
     under the *standfirst*, not at the top, so the walk above breaks on the
     standfirst (correctly: that is the department's own text) and never reaches
     it. Filtering globally is safe precisely because the pattern is so narrow:
     a whole line of the form `By <name> -<date>` is a WordPress theme's
     furniture and is not a sentence a Marathi press release contains. */
  return lines.filter((line) => !WP_BYLINE.test(line));
}

/**
 * The same, as one run of prose, with a dateline lifted off the opening line.
 *
 * The lift is applied to the first line and then the lines are joined — not the
 * other way round. Stripping after the join lets `.{0,60}?` run across what was
 * a line break and swallow a whole leading line on its way to a dateline in the
 * next one, which is how a release that opens on its attribution quietly lost
 * it. The rule is meant to remove four words the card is already printing, and
 * it should not be able to remove anything else.
 */
export function releaseProse(text: string, parts: ReleaseParts = {}): string {
  const lines = releaseBodyLines(text, parts);
  if (lines.length === 0) return "";

  return [lines[0].replace(DATELINE_HEAD, ""), ...lines.slice(1)]
    .join(" ")
    .trim();
}

/**
 * Sixty words of it, and an ellipsis when there was more.
 *
 * The ellipsis is load-bearing: without it a cut release reads as a release
 * that simply ended there, which for a government notice is a claim about its
 * contents rather than about this card's width.
 */
export function summary60(text: string, parts: ReleaseParts = {}): string {
  const prose = releaseProse(text, parts);
  if (!prose) return "";

  const words = prose.split(/\s+/);
  if (words.length <= SUMMARY_WORDS) return prose;

  return `${words.slice(0, SUMMARY_WORDS).join(" ")}…`;
}
