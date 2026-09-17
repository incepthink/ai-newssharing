"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";

import { NewsMap } from "./news-map";
import { ministerParam } from "@/data/ministers";
import { DEFAULT_WINDOW } from "@/lib/news/window";
import type { DgiprMap } from "@/types/dgipr";
import type { MapGeometry } from "@/types/map";
import type { MinisterFilter, NewsMap as NewsMapData, WindowId } from "@/types/news";

type NewsMapShellProps = {
  /** Projected on the server — see `lib/map/geometry.ts`. */
  geometry: MapGeometry;
  /** The choropleth, read on the server against the window below. */
  map: NewsMapData;
  /** The government layer, on its own clock. Same rows, different walk. */
  dgipr: DgiprMap;
  bands: Array<{ level: number; min: number; max: number }>;
  /** What the reader asked for. The map may have widened it; `map.window` says
   *  what it settled on, and the plate prints both. */
  window: WindowId;
  minister: MinisterFilter | null;
  /** A district to open on arrival, from `?district=`. Passed straight through
   *  — this component owns the two filters and nothing else. */
  initialDistrictId?: string | null;
};

/**
 * The two filters that decide which rows exist, held in the URL.
 *
 * This component used to answer them in the browser. That was right while the
 * map ran on a generated corpus — every row was already in memory, so a window
 * change was a `useMemo` and a round trip would have been a fetch, a spinner
 * and a transition in order to redraw something the browser was already
 * holding. The note it carried said so, and said what would replace it:
 *
 *   > When there is a database behind this, the body of `setFilters` becomes a
 *   > `router.replace` and nothing above it changes.
 *
 * There is a database behind it now. The rows are approved releases in
 * Postgres, the browser holds one window's worth of them and never the store,
 * and the two filters are server state again — so this is that `router.replace`
 * and, as promised, nothing above it changed. `NewsMap` takes the same props it
 * always did.
 *
 * `useTransition` survives the change and matters more than it did: it is what
 * keeps the old map on screen, dimmed, while the new one is fetched, instead of
 * blanking the sheet between two readings of the same state.
 *
 * Deliberately **not** `useSearchParams`. The two parameters this owns are
 * already parsed on the server and handed down as `window` and `minister`, and
 * reading them a second time in the browser would opt the whole subtree into a
 * Suspense boundary to learn what it was already told.
 */
export function NewsMapShell({
  geometry,
  map,
  dgipr,
  bands,
  window: requested,
  minister,
  initialDistrictId,
}: NewsMapShellProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  /**
   * Write the next reading into the URL.
   *
   * `replace` and not `push`: stepping a window from 24h to 7d to 30d is one
   * reader adjusting one control, and leaving three entries behind means the
   * back button walks through the adjustment instead of leaving the map. The
   * scroll position is held for the same reason — the map is the viewport, and
   * jumping to the top of it on every filter change would be the sheet
   * flinching each time it is asked a question.
   *
   * Both parameters are written from the *whole* next state rather than one
   * field at a time, which is what stops picking a minister from silently
   * resetting the window.
   */
  const go = useCallback(
    (next: { window: WindowId; minister: MinisterFilter | null }) => {
      const params = new URLSearchParams();

      // The default is the absence of the parameter, so a shared link to the
      // map's front door is `/map` rather than `/map?window=24h`.
      if (next.window !== DEFAULT_WINDOW) params.set("window", next.window);

      const who = ministerParam(next.minister);
      if (who) params.set("minister", who);

      const query = params.toString();

      startTransition(() => {
        router.replace(query ? `/map?${query}` : "/map", { scroll: false });
      });
    },
    [router],
  );

  const setWindow = useCallback(
    (id: WindowId) => go({ window: id, minister }),
    [go, minister],
  );

  const setMinister = useCallback(
    (next: MinisterFilter | null) => go({ window: requested, minister: next }),
    [go, requested],
  );

  return (
    <NewsMap
      geometry={geometry}
      map={map}
      /* No story layer. `buildStories` invents nine running stories out of a
         seeded generator, and a fabricated thread on a map whose every other
         mark is a government release is the one thing this surface cannot
         carry. `NewsStories | null` has always been a supported state — it is
         what a checkout with no threading run gets — so the plate and the mode
         toggle already know how to say that the pins are not there. */
      stories={null}
      dgipr={dgipr}
      bands={bands}
      window={requested}
      onWindow={setWindow}
      minister={minister}
      onMinister={setMinister}
      pending={pending}
      initialDistrictId={initialDistrictId}
    />
  );
}
