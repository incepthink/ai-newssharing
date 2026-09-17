"use client";

import Link from "next/link";
import { List } from "lucide-react";
import { useMemo } from "react";

import { NEWS_MR } from "@/lib/news/marathi";

/**
 * One headline as it crosses the band.
 *
 * Deliberately not a `NewsArticle`: the ticker is rendered on the client and
 * the page is rendered on the server, so what travels between them is the four
 * plain fields the band actually paints — not the standfirst, the picture, the
 * word count or the prominence workings, none of which the strip has any use
 * for and all of which it would otherwise be paying to serialise.
 */
export type NewsItem = {
  id: string;
  headline: string;
  /** Which district, in Marathi. Empty for a statewide piece. */
  place: string;
  url: string;
};

/**
 * The way off the page, printed on the right end of the band.
 *
 * Optional, because the band is not only the map's: whoever renders it says
 * where the reader should be able to go from it, and a strip with nowhere to
 * go is still a strip of headlines.
 */
export type TickerAction = {
  href: string;
  label: string;
};

type NewsTickerProps = {
  items: NewsItem[];
  action?: TickerAction;
};

/** Seconds of travel per character of headline text, and the floor under it.
 *  The duration is derived from the text rather than fixed, because a fixed
 *  one makes the band's speed a function of how much news happens to have
 *  landed — nine headlines would crawl and forty would blur past. Tuned to
 *  land near 70px/s: fast enough to read as live, slow enough to finish a
 *  Marathi line before it leaves the frame. */
const SECONDS_PER_CHAR = 0.13;
const MIN_DURATION = 28;

/**
 * The band across the top of the sheet: what has landed lately, running past
 * once, continuously, the way a news channel runs its strip.
 *
 * It is the one place in the product that is printed *dark* — ink ground,
 * pale type — and that is on purpose. Everything below it is a survey sheet;
 * a second pale plate stretched across the full width would have read as more
 * chrome on the same surface and would have been ignored. Inverting it makes
 * the band a different object entirely, which is what lets it sit above the
 * map without competing with a single district.
 *
 * Each headline is led by a plain disc rather than by a sector dot. The sector
 * taxonomy the dot used to carry does not exist in this corpus and inventing
 * one from keywords would have been the strip asserting something the data
 * does not say, so the mark is punctuation now: it separates headlines and
 * claims nothing.
 *
 * Every line is a link now. The strip used to be a read-only summary of pins
 * that were clickable below it, which made it the one live-looking thing on
 * the page that did nothing when pressed.
 *
 * The list is rendered twice and the track translated by exactly half its
 * width, so the loop closes on itself with no gap and no jump — the second
 * copy is `aria-hidden`, and a screen reader gets the headlines once. Hover or
 * focus anywhere on the band holds it still, because a line you cannot stop is
 * a line you cannot finish reading.
 */
export function NewsTicker({ items, action }: NewsTickerProps) {
  const duration = useMemo(() => {
    const characters = items.reduce(
      (total, item) => total + item.headline.length + item.place.length,
      0,
    );

    return Math.max(MIN_DURATION, Math.round(characters * SECONDS_PER_CHAR));
  }, [items]);

  /* Nothing to say is said by saying nothing: an empty band would be a strip
     across the top of the map with a live dot on it and no news behind it.

     Unless the band is also carrying the way off the page, which it is on the
     map — and a corpus with nothing approved in it is exactly when a reader is
     most likely to want the list. So the strip survives as its own bookend:
     the label and the dot go, because those are the part that claims to be
     live, and the link stays. */
  if (items.length === 0 && !action) return null;

  const empty = items.length === 0;

  return (
    <section
      className="news-ticker"
      data-empty={empty || undefined}
      lang="mr"
      aria-label={NEWS_MR.tickerAria}
    >
      {/* The one fixed thing on the band. It does not scroll, so the strip
          still says what it is at any moment of the loop. */}
      {empty ? null : (
        <p className="news-ticker-label">
          <span className="news-ticker-dot" aria-hidden />
          {NEWS_MR.ticker}
        </p>
      )}

      <div className="news-ticker-viewport">
        <div
          className="news-ticker-track"
          style={{ "--ticker-duration": `${duration}s` } as React.CSSProperties}
        >
          <NewsRun items={items} />
          {empty ? null : <NewsRun items={items} aria-hidden />}
        </div>
      </div>

      {/* The other end of the band: the way out of it. It used to be a button
          on a header strip above, which cost the page a whole row to say one
          thing — and on the map that row is taken off the state. The band
          already crosses the top of the page and already has a fixed block at
          its left end, so the link is its right-hand bookend. It is outside
          the viewport, so the running track never passes under it.

          The word goes on a phone and the mark stays: at that width the strip
          is mostly furniture otherwise, and the headlines are what it is for. */}
      {action ? (
        <Link
          className="news-ticker-action"
          href={action.href}
          // The word is `display:none` on a phone, which takes it out of the
          // accessibility tree with it — so the name is carried here and the
          // link is never a bare icon with nothing to announce.
          aria-label={action.label}
        >
          <List size={15} strokeWidth={2.2} aria-hidden />
          <span className="news-ticker-action-word">{action.label}</span>
        </Link>
      ) : null}
    </section>
  );
}

/** Whether a headline points off this site. */
function external(url: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("//");
}

/** One pass of the list. Two of these sit in the track end to end. */
function NewsRun({
  items,
  ...rest
}: { items: NewsItem[] } & React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul className="news-ticker-run" {...rest}>
      {items.map((item) => (
        <li key={item.id} className="news-ticker-item">
          <a
            className="news-ticker-link"
            href={item.url}
            /* A new tab only for somewhere else.

               The band used to carry scraped headlines and every one of them
               left the site, so opening a tab was the right default: a reader
               following a link to a newspaper has not finished with the map.
               The lines are this app's own release pages now, and a new tab for
               an internal link is the one thing that reliably makes a site feel
               like it has lost the reader's place. */
            target={external(item.url) ? "_blank" : undefined}
            rel={external(item.url) ? "noreferrer noopener" : undefined}
            // The duplicate run is inert to the pointer and to the reader: two
            // copies of every headline in the tab order is the accessibility
            // cost of a seamless loop, and this is how it is not paid.
            tabIndex={rest["aria-hidden"] ? -1 : undefined}
          >
            <span className="news-ticker-mark" aria-hidden />
            <span className="news-ticker-head">{item.headline}</span>
            {item.place ? <span className="news-ticker-place">{item.place}</span> : null}
          </a>
        </li>
      ))}
    </ul>
  );
}
