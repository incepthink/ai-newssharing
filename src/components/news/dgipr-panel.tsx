"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ArrowUpRight, Check, FileDown, Share2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { MODAL_GRID, PanelModal, PanelTools } from "./panel-modal";
import { ShareBar } from "@/components/share/share-bar";
import { SharePreview } from "@/components/share/share-preview";
import {
  DGIPR_MR,
  DGIPR_SHARE_MR,
  datelineMr,
  releaseCountMr,
  releaseDateMr,
} from "@/lib/dgipr/marathi";
import { isShareable } from "@/lib/dgipr/share-message";
import { districtNameMr } from "@/lib/news/marathi";
import { toDevanagari } from "@/lib/signals/marathi";
import type { DgiprRelease } from "@/types/dgipr";

const SPRING = { type: "spring", stiffness: 260, damping: 30, mass: 0.9 } as const;

const panelVariants = {
  hidden: { opacity: 0, x: 40 },
  shown: {
    opacity: 1,
    x: 0,
    transition: { ...SPRING, staggerChildren: 0.05, delayChildren: 0.1 },
  },
  gone: { opacity: 0, x: 28, transition: { duration: 0.18 } },
};

const ITEM = {
  hidden: { opacity: 0, y: 10 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
  gone: { opacity: 0 },
};

type DgiprPanelProps = {
  /** Every release the marked district issued in the window, newest first.
   *  Empty or null closes the panel. */
  releases: DgiprRelease[];
  /** Which of them is open. The mark opens the newest; the rail below switches. */
  openId: string | null;
  onOpen: (release: DgiprRelease) => void;
  onClose: () => void;
};

/**
 * One district's government press releases, read in full.
 *
 * **This panel prints the whole released text, and that is the one place this
 * product does.** `NewsPanel` and `StoryPanel` both stop at a headline and a
 * standfirst and say at length why: the collector stores newspaper bodies
 * because the analysis needs them, and republishing a Marathi daily is a
 * different act from linking to it. That rule is about somebody else's
 * reporting. A DGIPR release is a government department's own public
 * information, issued in order to be carried, and already published in full on
 * mahasamvad.in. There is no publisher here whose readers we would be taking.
 *
 * Which means this panel has a different job from the other two. It is not a
 * reading list pointing somewhere else — it is the document. So the release is
 * laid out to be read: the dateline and the issuing office first, because for
 * an official notice *who said it* is half the content; then the sixty-word
 * reading; then the text; then the subject tags. The other releases from the
 * same district sit at the bottom as a rail, so a Mumbai mark carrying four
 * notices opens one and offers three rather than hiding them behind the map.
 *
 */

export function DgiprPanel({ releases, openId, onOpen, onClose }: DgiprPanelProps) {
  const listRef = useRef<HTMLDivElement>(null);

  /**
   * Which release's stack is being read full-page as a set of cards, rather
   * than whether one is.
   *
   * Held as the id it was opened from, for the reason given in `NewsPanel`: a
   * boolean would have to be reset by an effect every time the panel changed
   * subject, and the fact is derivable without one.
   */
  const [expandedFor, setExpandedFor] = useState<string | null>(null);
  const expanded = openId !== null && expandedFor === openId;

  /* Share mode, held the same way and for the same reason. The expanded
     reading collapses on its own when the district changes, and holding this
     as a boolean would leave the sheet re-opening in a mode the reader turned
     on for a different district's releases. */
  const [shareFor, setShareFor] = useState<string | null>(null);
  const shareMode = expanded && shareFor === openId;

  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const open = releases.find((release) => release.id === openId) ?? null;

  /* What can be sent at all: a release only counts once it has both a page to
     read and a file to keep. Read off the rows rather than off a list of ids,
     because the answer changes with every row the desk approves. */
  const eligible = useMemo(() => releases.filter(isShareable), [releases]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  /* Ordered by the grid and not by tap order, so the same four selections
     always produce the same message. Filtering through `eligible` is also what
     makes ids left over from another district inert rather than stale. */
  const selected = useMemo(
    () => eligible.filter((release) => selectedSet.has(release.id)),
    [eligible, selectedSet],
  );

  const allSelected =
    eligible.length > 0 && eligible.every((release) => selectedSet.has(release.id));

  function exitShareMode() {
    setShareFor(null);
    setPreviewOpen(false);
    setSelectedIds([]);
  }

  function closeExpanded() {
    setExpandedFor(null);
    exitShareMode();
  }

  function shareOne(release: DgiprRelease) {
    setExpandedFor(release.id);
    setShareFor(release.id);
    setSelectedIds([release.id]);
    setPreviewOpen(true);
  }

  // A new release is a new document, and inheriting the last one's scroll
  // offset drops the reader into the middle of a notice they just opened.
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [openId]);

  useEffect(() => {
    // The grid owns Escape while it is open, so one press steps back to the
    // panel rather than closing the panel and the grid together.
    if (!open || expanded) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [open, expanded, onClose]);

  const others = releases.filter((release) => release.id !== openId);

  /* Where "अधिक बातम्या पहा" goes.
     Taken from the stack rather than from the open release, so switching
     releases inside one district never changes the destination. A release with
     no district — a statewide notice — sends the reader to the unfiltered list
     rather than to `?district=null`, which would filter everything away. */
  const districtId = releases.find((release) => release.districtId)?.districtId ?? null;
  const districtTitle = districtId ? districtNameMr(districtId) : DGIPR_MR.statewide;
  const tallyText = `${toDevanagari(releases.length)} ${releases.length === 1 ? "बातमी" : "बातम्या"}`;

  const moreHref = districtId
    ? `/news?district=${encodeURIComponent(districtId)}`
    : "/news";

  /* The tag, worn where a reader cannot miss it. The whole point of this
     layer is that it is a different kind of source from everything else on
     the sheet, and a badge is the shortest way to say so at the top of a
     document. Built once because the expanded reading wears the same one. */
  const eyebrow = (
    <>
      <span className="dgipr-badge">{DGIPR_MR.tag}</span>
      {DGIPR_MR.hint}
    </>
  );

  return (
    <>
      <AnimatePresence>
        {releases.length > 0 ? (
          <motion.aside
            key={districtId ?? openId ?? "dgipr-panel"}
            className="news-panel dgipr-panel"
            lang="mr"
            role="dialog"
            aria-label={`${districtTitle} — ${tallyText}`}
            variants={panelVariants}
            initial="hidden"
            animate="shown"
            exit="gone"
          >
            <header className="news-panel-head">
              <div>
                <p className="news-panel-eyebrow dgipr-eyebrow">{eyebrow}</p>
                <h2 className="news-panel-title dgipr-title">{districtTitle}</h2>
                <p className="news-panel-tally">{tallyText}</p>
              </div>

              <PanelTools
                onClose={onClose}
                onExpand={() => setExpandedFor(openId ?? releases[0]?.id ?? null)}
              />
            </header>

            <div className="news-panel-list dgipr-panel-list" ref={listRef}>
              {releases.map((release) => {
                const summary =
                  release.summary60Mr?.trim() ||
                  release.summaryMr.split(/\n\s*\n/)[0]?.trim() ||
                  "";
                const who = release.attributionMr ?? release.departmentMr ?? release.authorMr;
                const articleUrl = release.readerUrl ?? release.url ?? `/news/${release.id}`;

                return (
                  <article key={release.id} className="dgipr-panel-card">
                    <div className="dgipr-card-badges">
                      {release.categoryMr ? (
                        <span className="dgipr-card-badge dgipr-category">{release.categoryMr}</span>
                      ) : null}
                      {who ? (
                        <span className="dgipr-card-badge dgipr-card-badge-who">{who}</span>
                      ) : null}
                    </div>

                    <h3 className="dgipr-panel-card-heading">
                      <Link href={articleUrl} className="dgipr-panel-card-title">
                        {release.titleMr}
                      </Link>
                    </h3>

                    {release.attributionMr && release.attributionMr !== who ? (
                      <p className="dgipr-attribution">{release.attributionMr}</p>
                    ) : null}

                    <p className="dgipr-dateline">
                      <span className="dgipr-dateline-place">{datelineMr(release)}</span>
                      <span className="dgipr-dateline-date numeric">{releaseDateMr(release.date)}</span>
                      {release.releaseNo ? (
                        <span className="dgipr-card-no numeric">· {DGIPR_MR.releaseNo} {toDevanagari(release.releaseNo)}</span>
                      ) : null}
                    </p>

                    {summary ? (
                      <div className="dgipr-card-summary">
                        <p className="dgipr-card-label">{DGIPR_MR.summary60}</p>
                        <p className="dgipr-card-lead">{summary}</p>
                      </div>
                    ) : null}

                    <div className="dgipr-actions">
                      <Link
                        className="dgipr-action dgipr-action-read"
                        href={articleUrl}
                      >
                        <ArrowUpRight size={14} strokeWidth={2.2} aria-hidden />
                        पूर्ण बातमी वाचा
                      </Link>

                      {release.docxUrl ? (
                        <a className="dgipr-action" href={release.docxUrl} download>
                          <FileDown size={14} strokeWidth={2.2} aria-hidden />
                          वर्ड फाइल (DOCX)
                        </a>
                      ) : null}

                      <Link
                        className="dgipr-action"
                        href={`/share?id=${encodeURIComponent(release.id)}`}
                      >
                        <Share2 size={14} strokeWidth={2.2} aria-hidden />
                        शेअर करा
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>

            <footer className="news-panel-foot dgipr-foot">
              <p>{DGIPR_MR.issuer}</p>

              <Link className="dgipr-more-news" href={moreHref}>
                <span>
                  {DGIPR_MR.moreNews}
                  <span className="dgipr-more-news-where">
                    {districtId ? districtNameMr(districtId) : DGIPR_MR.statewide}
                  </span>
                </span>
                <ArrowRight size={14} strokeWidth={2.2} aria-hidden />
              </Link>
            </footer>
          </motion.aside>
        ) : null}
      </AnimatePresence>

      {/* The district's whole stack, laid out at once.

          The docked panel is the document and the rail at its foot is a table of
          contents deliberately kept quiet so it does not compete with the text.
          That is the right weighting when you are reading one notice. It is the
          wrong one when the question is "what has this district put out" — four
          Mumbai releases as four muted rows tell you how many there are and
          nothing about what they say. Full-page, they get to be cards: the
          badge, the date, the headline, the sixty-word reading and the three
          things you can do with it, which is as much of a press release as
          anyone needs to decide whether to open it.

          Picking one opens it in the panel and hands the map back, because the
          panel is still where a release is read in full. */}
      <PanelModal
        open={expanded && releases.length > 0}
        onClose={closeExpanded}
        /* One press, one step back — preview, share mode, grid, panel. The
           preview stops Escape before it reaches here (see the capture-phase
           listener in `SharePreview`), so by the time this runs the only level
           left inside the sheet is share mode. */
        onEscape={shareMode ? exitShareMode : closeExpanded}
        className="dgipr-modal"
        eyebrow={<span className="dgipr-eyebrow">{eyebrow}</span>}
        title={districtTitle}
        tally={tallyText}
        /* No `foot`. The directorate's name used to close this sheet as a
           credit; it now opens the share message as its first bold line, which
           is where it is actually read. The docked panel keeps its own. */
        actions={
          /* Offered only where there is something to send. A bar whose every
             card is disabled teaches the reader nothing except that the button
             lied. */
          eligible.length > 0 ? (
            <ShareBar
              active={shareMode}
              selectedCount={selected.length}
              eligibleCount={eligible.length}
              allSelected={allSelected}
              onEnter={() => setShareFor(openId)}
              onSelectAll={() => setSelectedIds(eligible.map((release) => release.id))}
              onClear={() => setSelectedIds([])}
              onExit={exitShareMode}
              onPreview={() => setPreviewOpen(true)}
            />
          ) : null
        }
      >
        <motion.div
          className="panel-modal-grid"
          variants={MODAL_GRID}
          initial="hidden"
          animate="shown"
        >
          {releases.map((release) => (
            <ReleaseCard
              key={release.id}
              release={release}
              reading={release.id === openId}
              shareMode={shareMode}
              shareable={isShareable(release)}
              selected={selectedSet.has(release.id)}
              onOpen={() => {
                onOpen(release);
                closeExpanded();
              }}
              onShare={() => shareOne(release)}
              onToggle={() =>
                setSelectedIds((current) =>
                  current.includes(release.id)
                    ? current.filter((id) => id !== release.id)
                    : [...current, release.id],
                )
              }
            />
          ))}
        </motion.div>
      </PanelModal>

      <SharePreview
        open={shareMode && previewOpen && selected.length > 0}
        onClose={() => setPreviewOpen(false)}
        releases={selected}
      />
    </>
  );
}

/**
 * The three ways out of a release: read it, keep it, forward it.
 *
 * One component because the docked panel and the grid card must not drift —
 * the DOCX on the card and the DOCX on the panel are the same file, and a
 * reader who learns the row in one place should find it unchanged in the other.
 *
 * The DOCX is a plain `<a download>` at an endpoint that builds the file on
 * request. Not a button with a fetch behind it: a link is what a browser knows
 * how to resume, open in a new tab and hand to a download manager, and the one
 * thing a fetch would buy — a spinner — is not worth losing any of that.
 */
function ReleaseActions({
  release,
  onShare,
}: {
  release: DgiprRelease;
  /** Omitted where the release has nothing to send, so the row shows two
   *  buttons rather than a third that explains itself when pressed. */
  onShare?: () => void;
}) {
  const readerUrl = release.readerUrl ?? release.url;

  if (!readerUrl && !release.docxUrl && !onShare) return null;

  return (
    <div className="dgipr-actions">
      {readerUrl ? (
        <Link className="dgipr-action dgipr-action-read" href={readerUrl}>
          <ArrowUpRight size={14} strokeWidth={2.2} aria-hidden />
          पूर्ण बातमी वाचा
        </Link>
      ) : null}

      {release.docxUrl ? (
        <a className="dgipr-action" href={release.docxUrl} download>
          <FileDown size={14} strokeWidth={2.2} aria-hidden />
          वर्ड फाइल (DOCX)
        </a>
      ) : null}

      {onShare ? (
        <button
          type="button"
          className="dgipr-action"
          onClick={onShare}
          aria-haspopup="dialog"
        >
          <Share2 size={14} strokeWidth={2.2} aria-hidden />
          शेअर करा
        </button>
      ) : null}
    </div>
  );
}

/**
 * One release as a card, for the expanded reading only.
 *
 * It carries what the docked panel's rail does not, and the difference is the
 * job each is doing: a row in the panel is a pointer inside a document the
 * reader is already in, and a card here is the whole basis on which they pick.
 * So the card is the release's own masthead — who it is attributed to, which
 * district it belongs to, when it went out, under what number — and then sixty
 * words of it, which for a government notice is enough to know whether to open
 * it. None of those words are written by this app; see `lib/dgipr/summary.ts`.
 *
 * It is an `<article>` and not a `<button>`, which it used to be. A card that
 * offers a reader page, a download and a share cannot be a single button — a
 * link inside a button is markup a browser is entitled to make its own sense
 * of — so the headline is the button and the actions sit beside it.
 *
 * In share mode a transparent `role="checkbox"` covers the whole card instead,
 * which is what turns it from a door into a choice. Covering it rather than
 * replacing its contents is what keeps the card the same object in both modes:
 * a grid where some clicks navigate and others tick a box is a grid nobody can
 * use, and a grid that reflows when the mode changes is one nobody can follow.
 */
function ReleaseCard({
  release,
  reading,
  shareMode,
  shareable,
  selected,
  onOpen,
  onShare,
  onToggle,
}: {
  release: DgiprRelease;
  /** The one currently open in the panel behind, marked rather than hidden:
   *  the reader arrived from it and a grid that silently drops it looks like
   *  it has lost one. */
  reading: boolean;
  shareMode: boolean;
  /** Whether this release has both a page and a file to send. */
  shareable: boolean;
  selected: boolean;
  onOpen: () => void;
  onShare: () => void;
  onToggle: () => void;
}) {
  /* The sixty-word reading, or the release's own first paragraph where a row
     carries no cut — the curated mahasamvad rows do not. Never nothing: a card
     with a headline and no text is the one shape that tells a reader less than
     the rail row it replaced. */
  const summary =
    release.summary60Mr?.trim() ||
    release.summaryMr.split(/\n\s*\n/)[0]?.trim() ||
    "";

  /* Whose release this is, in the order a reader would want to be told.
     The minister first where the department named one — on a cabinet item that
     is half of what the headline means — then the department, then the office
     that issued it. One badge and not three: a card carrying every line of a
     release's provenance is a card nobody scans. The rest is on the panel. */
  const who = release.attributionMr ?? release.departmentMr ?? release.authorMr;

  const picking = shareMode && shareable;

  return (
    <motion.article
      className="dgipr-card"
      variants={ITEM}
      data-reading={reading || undefined}
      data-share={shareMode || undefined}
      data-selected={(picking && selected) || undefined}
      data-inert={(shareMode && !shareable) || undefined}
    >
      {shareMode ? (
        /* The whole card, as one control. A release with no sheets still gets
           its card and its reason printed on it — dropping it would leave a
           grid that loses a tile the moment share mode goes on, which reads as
           a bug where a disabled card reads as an answer. */
        <button
          type="button"
          className="dgipr-card-pick"
          role="checkbox"
          aria-checked={selected && shareable}
          aria-label={release.titleMr}
          disabled={!shareable}
          onClick={onToggle}
        >
          <span className="dgipr-card-check" aria-hidden>
            {selected && shareable ? <Check size={13} strokeWidth={3} /> : null}
          </span>
        </button>
      ) : null}

      {release.posterUrl ? (
        /* The same two kinds of image the panel takes, and `next/image` suits
           neither of them for the same reasons. See the note on `.dgipr-poster`
           above. Cropped here rather than contained, because a grid of cards
           whose tops are all at different heights is not a grid. */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="dgipr-card-poster"
          src={release.posterUrl}
          alt=""
          loading="lazy"
          decoding="async"
        />
      ) : null}

      <div className="dgipr-card-body">
        {/* Who the release is attributed to, and where it belongs. The two
            badges answer the two questions a reader scanning a grid of a
            district's notices actually has, and they come first because a
            badge is read before a headline is. */}
        <div className="dgipr-card-badges">
          {release.categoryMr ? (
            <span className="dgipr-card-badge dgipr-category">{release.categoryMr}</span>
          ) : null}
          {who ? (
            <span className="dgipr-card-badge dgipr-card-badge-who">{who}</span>
          ) : null}
          <span className="dgipr-card-badge dgipr-card-badge-where">
            {release.districtId ? districtNameMr(release.districtId) : DGIPR_MR.statewide}
          </span>
        </div>

        <div className="dgipr-card-meta">
          <time className="dgipr-card-date numeric" dateTime={release.date}>
            {releaseDateMr(release.date)}
          </time>

          {release.releaseNo ? (
            <span className="dgipr-card-no numeric">
              {DGIPR_MR.releaseNo} {toDevanagari(release.releaseNo)}
            </span>
          ) : null}
        </div>

        {/* The headline is the door. A button and not a link because it opens
            the release in the panel behind this sheet rather than navigating —
            the reader came here from the map and the map is where they are
            going back to. The reader *page* is offered below, as a link, where
            a link is the right thing. */}
        <button type="button" className="dgipr-card-title" onClick={onOpen}>
          {release.titleMr}
        </button>

        {summary ? (
          <div className="dgipr-card-summary">
            <p className="dgipr-card-label">{DGIPR_MR.summary60}</p>
            <p className="dgipr-card-lead">{summary}</p>
          </div>
        ) : null}

        {shareMode && !shareable ? (
          <p className="dgipr-card-nofile">{DGIPR_SHARE_MR.noFiles}</p>
        ) : null}

        {/* Hidden in share mode rather than disabled: the card is one control
            there, and three inert-looking links under a checkbox invite a tap
            that does the opposite of what they say. */}
        {shareMode ? null : (
          <ReleaseActions release={release} onShare={shareable ? onShare : undefined} />
        )}
      </div>
    </motion.article>
  );
}
