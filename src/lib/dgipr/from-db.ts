/**
 * The map's corpus, read from this desk's own Postgres.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS REPLACES, AND WHY.
 *
 * The map shipped on `lib/news/sample.ts` — a seeded generator that invents
 * 665 newspaper articles, nine running stories and five press releases back
 * from an hour anchor. That was the right thing while the surface was being
 * built: it exercises every branch of the choropleth, the widening walk, the
 * minister board and the share sheet without a database.
 *
 * It is the wrong thing now, and not for a reason of polish. The map's whole
 * claim is that a mark on a district is a government release from that
 * district, and a generated headline under that claim is a fabricated
 * government notice. So every row the map paints now comes from `articles`
 * with `status = 'approved'` — the same rows the fold, the DOCX builder and
 * `/news` are built on, and nothing else.
 * ---------------------------------------------------------------------------
 *
 * WHY A RELEASE AND NOT AN ARTICLE.
 *
 * `types/dgipr.ts` argues that a press release is not a newspaper article and
 * must not be bent into `NewsArticle`. That argument survives the move intact,
 * and the desk's `Article` is a third shape again — a queue record, with a
 * status and a submitter on it. So this file does the mapping in one place:
 * `Article` in, `DgiprRelease` out, with the desk's provenance columns
 * (`release_no`, `office`, `department`, `attribution`) carried across rather
 * than dropped, because those are exactly what makes the thing on the card
 * citable.
 *
 * The choropleth still wants `NewsMap`, so the same releases are projected a
 * second time into the shape `NewsPlate` and `NewsReadout` read. That is a
 * projection and never a second source of truth — both views are built from
 * one array, in one pass, so the plate's totals and the panel's stack can
 * never disagree.
 */
import { MINISTERS } from "@/data/ministers";
import { listArticles } from "@/lib/db";
import { resolveDistrict } from "@/lib/districts";
import { DGIPR_MR } from "@/lib/dgipr/marathi";
import { summary60 } from "@/lib/dgipr/summary";
import { quantileScale } from "@/lib/news/scale";
import { windowsFrom } from "@/lib/news/window";
import type { Article } from "@/lib/types";
import type { DgiprMap, DgiprRelease } from "@/types/dgipr";
import type {
  DistrictNews,
  MinisterBoard,
  MinisterFilter,
  MinisterTier,
  NewsArticle,
  NewsMap,
  WindowId,
} from "@/types/news";

/**
 * What the desk's two categories are called on the map.
 *
 * A release carries a `categoryMr` — the line the panel prints under विषय —
 * and the desk's own record carries a category that is not a subject at all:
 * it is the one editorial decision the desk makes, whether this is Chief
 * Minister and cabinet business or an ordinary departmental release. Where a
 * row names its department that is the better subject line and is used
 * instead; these are the fallback, and they are the truthful one, because the
 * only other thing this app knows about an uncategorised release is which
 * queue it came out of.
 */
const CATEGORY_MR = {
  cm: "मुख्यमंत्री व मंत्रिमंडळ",
  general: "शासकीय प्रसिद्धीपत्रक",
} as const;

/**
 * When a release with no approval timestamp is treated as having gone out.
 *
 * `fold_date` is a calendar date and the fold is a morning bulletin, so a
 * release with no `approved_at` is stamped at nine on its own fold day. The
 * alternative — midnight — puts every such release on the wrong side of a
 * 24-hour window for the first nine hours of the day it belongs to.
 */
const FOLD_HOUR = "T09:00:00.000Z";

/**
 * How many districts a window has to reach before the map stops widening.
 *
 * The walk used to stop at the first window with *anything* in it, which is the
 * right rule for the corpus it was written against: a newspaper scrape files
 * hundreds of pieces a day from thirty districts, so "anything" and "enough to
 * draw a map with" are the same test.
 *
 * They are not the same test here. This store fills a bulletin at a time, and
 * the bulletin is often two statewide cabinet notices — rows with no district
 * at all. Under the old rule a 24-hour window containing those two stopped the
 * walk dead: the sheet painted nothing, every district answered "no releases",
 * and clicking one opened an empty panel, on a day when the desk had approved
 * fifteen releases across thirteen districts. A reader cannot tell that map
 * from an outage.
 *
 * Three is the floor because the object on screen is a map of Maharashtra. One
 * mark on it is a dot, two is a coincidence, and three is the first number at
 * which the sheet is saying something a list would not have said better.
 *
 * The widening is never silent: `widened` is set, and the plate prints
 * `DGIPR_MR.widened` — which has always named *districts* as the reason rather
 * than releases, because this is the rule it was written for.
 */
const DISTRICT_FLOOR = 3;

/**
 * Whether a window is worth stopping the widening walk at.
 *
 * Two reasons to keep going, and the second is the one that makes the map and
 * the list into one product rather than two.
 *
 * **Not enough of a map.** Fewer than `DISTRICT_FLOOR` districts painted, for
 * the reasons given on it.
 *
 * **Not the district that was asked for.** `?district=` is written by the link
 * out of `/news` and out of a release page, and it is a *request to be shown a
 * place*. Answering it with that district greyed out and a panel saying "no
 * releases in this window" is answering a question the reader did not ask —
 * they have just read a Nagpur release, so they know perfectly well there is
 * one, and what they are being shown is an artefact of a 24-hour default they
 * never chose. So the walk keeps going until the named district is on the
 * sheet, and `widened` then says on the plate that it had to.
 *
 * A district that has never filed anything widens the walk all the way to
 * `all` and then stops, which is correct: at that point "nothing from here" is
 * the true answer rather than a window artefact, and the panel says so.
 */
function enoughToShow(
  districts: Set<string> | Map<string, unknown> | string[],
  focus: string | null | undefined,
): boolean {
  const ids = Array.isArray(districts) ? districts : [...districts.keys()];

  if (focus && !ids.includes(focus)) return false;

  return ids.length >= DISTRICT_FLOOR;
}

/** The release page for a desk row. One function, so the card, the ticker, the
 *  share message and the panel cannot disagree about the shape of the URL. */
export function releaseHref(id: number | string): string {
  return `/news/${id}`;
}

/** Where the editable copy is built. Built on request rather than stored, which
 *  is why this is an endpoint and not a file under `public/`. */
export function releaseDocxHref(id: number | string): string {
  return `/api/articles/${id}/docx`;
}

/* ------------------------------------------------------------------ mapping */

/**
 * One approved desk record as a release the map can paint.
 *
 * Nothing here invents a field. Where the desk has no value the release gets
 * null and the panel prints nothing — an empty issuing-office line is a fact
 * about a row the desk has not finished, and filling it with the directorate's
 * name would be this app signing a document on the directorate's behalf.
 */
export function toRelease(article: Article): DgiprRelease {
  const id = String(article.id);

  return {
    id,
    slug: article.release_no ? `vrutt-${article.release_no}` : id,
    titleMr: article.title || article.raw_text.split(/\n/)[0]?.trim() || "",
    date: article.fold_date,
    summaryMr: article.body || article.raw_text,
    summary60Mr: summary60(article.body || article.raw_text, {
      titleMr: article.title,
      attributionMr: article.attribution,
    }),
    /* The column is written by `resolveDistrict` on the way in, so it is
       already canonical — passed through it again anyway, because a row edited
       by hand at the desk has not been, and a district key the map's geometry
       does not know paints nothing and says nothing about why. */
    districtId: resolveDistrict(article.district) ?? null,
    /* The department's own dateline word, printed rather than the resolved
       district. See `datelineMr` in `./marathi.ts` for the Mumbai case this
       exists for. */
    datelineMr: article.dateline,
    categoryMr: article.department ?? CATEGORY_MR[article.category] ?? CATEGORY_MR.general,
    sourceMr: DGIPR_MR.tag,
    authorMr: article.office ?? article.department,
    departmentMr: article.department,
    attributionMr: article.attribution,
    releaseNo: article.release_no,
    /* The desk's bold sub-bullets. They are the release's own subject lines —
       what the department chose to pull out of its own text — which is exactly
       what the panel's खुणा row is for. */
    tags: article.bullets ?? [],
    featured: article.category === "cm",
    posterUrl: null,
    /* No PDF: this store holds text and builds its sheets on request. The DOCX
       endpoint is the one that exists, and the reader page stands where a PDF
       would on a curated mahasamvad row. */
    pdfUrl: null,
    docxUrl: releaseDocxHref(article.id),
    readerUrl: releaseHref(article.id),
    /* No mahasamvad permalink. A release that came through this desk has not
       been published there by this app, and pointing at a URL that may not
       exist would be a worse failure than showing no source link at all. */
    url: null,
  };
}

/** The instant a release is treated as having been published. */
function publishedAt(article: Article): string {
  return article.approved_at ?? `${article.fold_date}${FOLD_HOUR}`;
}

/**
 * A release as the choropleth's row type.
 *
 * `NewsArticle` is a newspaper record and most of it has no counterpart here:
 * there is no section page, no picture, no revision count and — importantly —
 * no prominence, because prominence is inferred from where *editors* put a
 * link and nobody edits a press release into a front page. Those stay null
 * rather than being filled with plausible-looking zeroes, and the panel and
 * the plate already render every one of them conditionally.
 *
 * `description` carries the sixty-word cut, which is the one field of the
 * newspaper shape that a release genuinely has an answer for.
 */
function toNewsArticle(release: DgiprRelease, article: Article): NewsArticle {
  return {
    url: release.readerUrl ?? releaseHref(release.id),
    districtId: release.districtId,
    section: release.categoryMr,
    headline: release.titleMr,
    description: release.summary60Mr ?? null,
    imageUrl: null,
    author: release.authorMr,
    publishedAt: publishedAt(article),
    modifiedAt: null,
    wordCount: release.summaryMr.trim().split(/\s+/).filter(Boolean).length,
    revisions: 0,
    prominence: null,
  };
}

/* ---------------------------------------------------------------- ministers */

/**
 * Which ministers a release names.
 *
 * Matched at read time and never stored, for the reason `data/ministers.ts`
 * gives at length: the roster is an assertion with a date on it, and a
 * reshuffle should be one edit to that file rather than a re-run over every
 * row ever approved.
 *
 * What is matched is narrower than the press index upstream. That one reads
 * whole newspaper bodies and needs the alias discipline the roster documents;
 * this reads the `attribution` column first — a DGIPR release states its
 * minister outright, which is the cleanest signal either corpus has — and the
 * headline behind it, for the cabinet items that name a minister in the
 * headline and attribute to nobody. The body is deliberately excluded: a
 * release that mentions a minister in its ninth paragraph is not that
 * minister's news, and counting it would make the chips meaningless.
 */
function ministersNamed(article: Article): string[] {
  const haystack = `${article.attribution ?? ""} ${article.title}`.toLowerCase();
  if (!haystack.trim()) return [];

  const named: string[] = [];

  for (const minister of MINISTERS) {
    const hit =
      minister.aliasesMr.some((alias) => haystack.includes(alias.toLowerCase())) ||
      minister.aliasesEn.some((alias) => haystack.includes(alias.toLowerCase()));

    if (hit) named.push(minister.id);
  }

  return named;
}

const TIER_OF = new Map(MINISTERS.map((minister) => [minister.id, minister.tier]));

/** Whether a row's matched roster ids satisfy the reader's filter. */
function satisfies(ids: string[], filter: MinisterFilter | null): boolean {
  if (!filter) return true;
  if (ids.length === 0) return false;

  if (filter.kind === "one") return ids.includes(filter.id);

  return ids.some((id) => TIER_OF.get(id) === filter.tier);
}

/**
 * The chips, counted over the window and never over the filter.
 *
 * The same rule the sample board followed and for the same reason: a board
 * that renumbered itself as the reader clicked through it would make the chip
 * they just left unreadable.
 */
function ministerBoard(rows: Row[]): MinisterBoard {
  const tiers: Record<MinisterTier, number> = { cm: 0, dcm: 0, min: 0, mos: 0 };
  const perMinister = new Map<string, number>();
  let matched = 0;

  for (const row of rows) {
    if (!row.ministers.length) continue;

    matched += 1;

    // A release naming two ministers of one rank counts once for that rank, so
    // these stay counts of releases rather than of mentions.
    const ranks = new Set<MinisterTier>();

    for (const id of row.ministers) {
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

/* ------------------------------------------------------------------ loading */

/**
 * One approved row, with everything derived from it computed once.
 *
 * The two layers are built from the same array and each of them needs the
 * release, the projected article and the matched ministers. Deriving them per
 * layer would run the roster match and the sixty-word cut twice over every row
 * on every request.
 */
export type Row = {
  release: DgiprRelease;
  article: NewsArticle;
  ministers: string[];
  /** Epoch milliseconds of `article.publishedAt`, for the window comparisons. */
  at: number;
};

export type Corpus = {
  rows: Row[];
  /** The newest `approved_at` in the store, or null when nothing is approved.
   *  Printed on the plate as the honest stamp: the layer's claim is that it is
   *  official, not that it is live. */
  approvedAt: string | null;
};

/**
 * Every approved release, newest first.
 *
 * Unbounded on purpose. The desk's store is a bulletin's worth of releases a
 * day rather than a newspaper's, the windows are applied in memory below, and
 * a query per window would mean four round trips to paint one sheet.
 */
export async function loadCorpus(): Promise<Corpus> {
  const articles = await listArticles({ status: "approved" });

  const rows = articles
    .map((article): Row => {
      const release = toRelease(article);

      return {
        release,
        article: toNewsArticle(release, article),
        ministers: ministersNamed(article),
        at: Date.parse(publishedAt(article)),
      };
    })
    .sort((a, b) => b.at - a.at);

  const approvedAt = articles
    .map((article) => article.approved_at)
    .filter((stamp): stamp is string => Boolean(stamp))
    .sort()
    .at(-1);

  return { rows, approvedAt: approvedAt ?? null };
}

/* ----------------------------------------------------------------- the maps */

/**
 * The choropleth, for one window and one minister.
 *
 * The widening walk is kept from the reader it was written for and matters
 * more here, not less: this store fills a bulletin at a time, so a 24-hour
 * window on a Monday morning is routinely empty where the sample corpus never
 * was. A widening window is honest; a zero is not.
 */
export function buildNewsMap(
  corpus: Corpus,
  windowId: WindowId,
  filter: MinisterFilter | null,
  now: number,
  focus?: string | null,
): NewsMap {
  const options = windowsFrom(windowId);

  for (const [step, option] of options.entries()) {
    const cutoff = option.hours === null ? 0 : now - option.hours * 3600_000;

    const inWindow = corpus.rows.filter((row) => row.at >= cutoff);
    const kept = inWindow.filter((row) => satisfies(row.ministers, filter));

    const placed = kept.filter((row) => row.release.districtId);
    const state = kept.filter((row) => !row.release.districtId);

    const buckets = new Map<string, Row[]>();

    for (const row of placed) {
      const key = row.release.districtId as string;
      const bucket = buckets.get(key);

      if (bucket) bucket.push(row);
      else buckets.set(key, [row]);
    }

    /* Too little to draw a map with, or not the map that was asked for: step
       outward rather than paint a sheet that looks like an outage. See
       `enoughToShow`. `all` closes the list, so the walk always terminates —
       and on the last step this test is skipped, which is what makes a
       genuinely empty store show an empty map instead of looping. */
    if (!enoughToShow(buckets, focus) && step < options.length - 1) continue;

    const scale = quantileScale([...buckets.values()].map((list) => list.length));
    const districts: Record<string, DistrictNews> = {};

    for (const [districtId, list] of buckets) {
      /* Newest first, and nothing else. The sample corpus sorted on
         prominence, which a press release does not have — see `toNewsArticle`
         — so sorting on it here would be sorting 15 rows by a field that is
         null on every one of them and falling back to insertion order. */
      const sorted = [...list].sort((a, b) => b.at - a.at);

      districts[districtId] = {
        districtId,
        articles: sorted.map((row) => row.article),
        count: sorted.length,
        level: scale.levelOf(sorted.length),
        lead: sorted[0]?.article ?? null,
        latestAt: sorted[0]?.article.publishedAt ?? null,
      };
    }

    return {
      districts,
      statewide: state.map((row) => row.article),
      window: option,
      widened: step > 0,
      totals: {
        articles: kept.length,
        districts: buckets.size,
        statewide: state.length,
      },
      ceiling: Math.max(0, ...[...buckets.values()].map((list) => list.length)),
      /* Counted over the window before the filter — see `ministerBoard`. */
      ministers: ministerBoard(inWindow),
      minister: filter,
      /* No collector and no sweep. These are a scraper's clocks and this
         corpus has neither; the desk's own approval stamp is the honest one
         and it is what the plate prints. */
      collectedAt: corpus.approvedAt,
      sweptAt: null,
    };
  }

  return buildNewsMap(corpus, "all", null, now);
}

/**
 * The government layer, on its own clock.
 *
 * Given the window the reader asked for rather than the one the choropleth
 * settled on, and allowed to widen separately. Both layers are now the same
 * rows, so in practice the two walks agree — but they are allowed not to, and
 * collapsing them into one would mean a minister filter that empties the
 * choropleth also empties the marks, which is not what the overlay is for: the
 * overlay says "a release came out of here", and that is true whoever it names.
 */
export function buildDgiprMap(
  corpus: Corpus,
  windowId: WindowId,
  now: number,
  focus?: string | null,
): DgiprMap {
  const options = windowsFrom(windowId);

  for (const [step, option] of options.entries()) {
    const cutoff = option.hours === null ? 0 : now - option.hours * 3600_000;
    const rows = corpus.rows.filter((row) => row.at >= cutoff);

    const releases = rows.map((row) => row.release);
    const byDistrict: Record<string, DgiprRelease[]> = {};
    const unplaced: DgiprRelease[] = [];

    for (const release of releases) {
      if (!release.districtId) {
        unplaced.push(release);
        continue;
      }

      (byDistrict[release.districtId] ??= []).push(release);
    }

    /* The same test the choropleth widens on, and it matters more here: the
       marks *are* this layer, and so is the stack the panel opens. A window
       holding two statewide cabinet notices and nothing else leaves the sheet
       with no marks at all, which reads as "the directorate issued nothing"
       rather than as "nothing datelined to a district this week". */
    if (!enoughToShow(Object.keys(byDistrict), focus) && step < options.length - 1) {
      continue;
    }

    return {
      releases,
      byDistrict,
      unplaced,
      totals: {
        releases: releases.length,
        districts: Object.keys(byDistrict).length,
        unplaced: unplaced.length,
      },
      window: option,
      widened: step > 0,
      /* Not a pull from an external feed — these rows were approved here. The
         newest approval is the closest true answer to "how fresh is this", and
         printing a fabricated import time would be the plate lying about its
         own provenance. */
      pulledAt: corpus.approvedAt,
    };
  }

  return buildDgiprMap(corpus, "all", now);
}

/** The key beside the ramp: the count range each step stands for. */
export function legendBands(
  map: NewsMap,
): Array<{ level: number; min: number; max: number }> {
  const scale = quantileScale(
    Object.values(map.districts).map((district) => district.count),
  );

  return scale.breaks
    .map((_, index) => {
      const band = scale.bandOf(index + 1);

      return band ? { level: index + 1, min: band[0], max: band[1] } : null;
    })
    .filter((band): band is { level: number; min: number; max: number } => band !== null);
}
