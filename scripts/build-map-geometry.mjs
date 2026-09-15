/**
 * Projects Maharashtra's 36 district boundaries into a flat viewBox and writes
 * the result to `src/data/maharashtra-geometry.json`.
 *
 * Ported from `maharashtra-is-building/src/lib/map/geometry.ts`, with one
 * deliberate change: that project projects on every server render and keeps
 * d3-geo, topojson and 440 kB of GeoJSON in its dependency tree. Nothing here
 * changes between deploys — the boundaries are a fixed file — so the whole
 * pipeline runs once, offline, and this app ships the answer. That is why
 * `package.json` has no d3 in it.
 *
 * To regenerate, run it from a checkout that HAS those packages installed:
 *
 *   cd ../maharashtra-is-building
 *   node ../ai-newssharing/scripts/build-map-geometry.mjs \
 *     public/data/boundaries/maharashtra-districts.geojson \
 *     ../ai-newssharing/src/data/maharashtra-geometry.json
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

// Resolved against the CWD, not this file: the script is run from the checkout
// that owns the packages. See the header.
const require = createRequire(path.join(process.cwd(), "index.js"));
const { geoMercator, geoPath } = require("d3-geo");
const { feature: toFeatures, merge: mergeArcs } = require("topojson-client");
const { topology } = require("topojson-server");
const { presimplify, simplify, planarTriangleArea } = require("topojson-simplify");

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error("usage: build-map-geometry.mjs <districts.geojson> <out.json>");
  process.exit(1);
}

/** Square the projection is fitted into before the viewBox is cropped to it. */
const FIT = 1000;
/** Headroom so the coastline's stroke and the hover lift are never clipped. */
const PADDING = 42;
/**
 * Visvalingam weight, in square viewBox units, below which a vertex is
 * dropped. The source is far finer than this map can show — 21,967 points —
 * and every one of them is painted several times per frame. At 2 the state
 * comes down to ~6,300 points for a mean error of about one screen pixel at
 * rest: no district moves more than 1% of its own area and no island is lost.
 */
const SIMPLIFY_TOLERANCE = 2;

const boundaries = rewindForD3(JSON.parse(await readFile(inPath, "utf8")));

const projection = geoMercator().fitExtent([[0, 0], [FIT, FIT]], boundaries);
const spherical = geoPath(projection).digits(2);

// Slide the projection so the state's own bounding box starts at (PADDING,
// PADDING). The viewBox can then be a plain `0 0 W H`, which keeps every
// camera calculation on the client a simple `scale * point + offset`.
const [[left, top], [right, bottom]] = spherical.bounds(boundaries);
const [tx, ty] = projection.translate();
projection.translate([tx - left + PADDING, ty - top + PADDING]);

// Past here the coordinates are already in viewBox units, so `geoPath(null)`
// reads them as projected — which skips d3's spherical clipping and puts the
// simplifier in the one space where a tolerance means something readable.
const toPath = geoPath(null).digits(2);
const { features, outline } = thin(project(boundaries, projection));

const districts = features
  .map((feature) => {
    const id = feature.properties?.districtId;
    if (!id) throw new Error("boundary feature with no districtId");

    const [min, max] = toPath.bounds(feature);

    return {
      id,
      d: toPath(feature) ?? "",
      centroid: roundPoint(toPath.centroid(feature)),
      bounds: [roundPoint(min), roundPoint(max)],
      area: round(toPath.area(feature)),
    };
  })
  // Largest first, so a small district is painted last and stays hoverable
  // over the top of the big neighbour that surrounds it.
  .sort((a, b) => b.area - a.area);

const width = round(right - left + PADDING * 2);
const height = round(bottom - top + PADDING * 2);

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(
  outPath,
  JSON.stringify({
    viewBox: `0 0 ${width} ${height}`,
    size: [width, height],
    landPath: toPath(outline) ?? "",
    districts,
  }),
);

console.log(`${districts.length} districts -> ${outPath}`);

/** Bakes the projection into the coordinates, leaving plain viewBox units. */
function project(collection, projection) {
  const point = ([lon, lat]) => projection([lon, lat]) ?? [0, 0];
  const polygon = (rings) => rings.map((ring) => ring.map(point));

  return {
    ...collection,
    features: collection.features.map((feature) => {
      const { geometry } = feature;

      if (geometry.type === "Polygon") {
        return { ...feature, geometry: { ...geometry, coordinates: polygon(geometry.coordinates) } };
      }
      if (geometry.type === "MultiPolygon") {
        return {
          ...feature,
          geometry: { ...geometry, coordinates: geometry.coordinates.map(polygon) },
        };
      }
      return feature;
    }),
  };
}

/**
 * Simplification over a shared-arc topology, and the state outline dissolved
 * out of the same one.
 *
 * Simplifying the topology rather than 36 separate polygons is what keeps the
 * internal borders from opening into slivers: each one belongs to two
 * districts as a single arc and can only be thinned identically on both sides.
 *
 * `outline` is the districts dissolved — the state's edge with every internal
 * arc dropped. It has to be the edge and nothing else because the coastline
 * layer *strokes* it; the 36 outlines concatenated would print every district
 * border at coastline weight and make the state read as a net.
 */
function thin(collection) {
  const built = topology({ districts: collection });
  const thinned = simplify(presimplify(built, planarTriangleArea), SIMPLIFY_TOLERANCE);
  const geometries = thinned.objects.districts;

  return {
    features: toFeatures(thinned, geometries).features,
    outline: mergeArcs(thinned, geometries.geometries),
  };
}

/**
 * d3-geo treats polygons as spherical and wants exterior rings **clockwise**;
 * RFC 7946 — which geoBoundaries follows — specifies counter-clockwise. Fed
 * the file as-is, d3 reads every district as "the whole sphere except this
 * shape" and paints the entire clip extent. Idempotent, so already-correct
 * data passes through untouched.
 */
function rewindForD3(collection) {
  return {
    ...collection,
    features: collection.features.map((feature) => {
      const { geometry } = feature;

      if (geometry.type === "Polygon") {
        return { ...feature, geometry: { ...geometry, coordinates: rewind(geometry.coordinates) } };
      }
      if (geometry.type === "MultiPolygon") {
        return {
          ...feature,
          geometry: { ...geometry, coordinates: geometry.coordinates.map(rewind) },
        };
      }
      return feature;
    }),
  };
}

function rewind(polygon) {
  return polygon.map((ring, index) => {
    const clockwise = signedArea(ring) < 0;
    return clockwise === (index === 0) ? ring : [...ring].reverse();
  });
}

/** Shoelace area in degrees²; positive means counter-clockwise. */
function signedArea(ring) {
  let total = 0;
  for (let i = 0, last = ring.length - 1; i < ring.length; last = i++) {
    total += ring[last][0] * ring[i][1] - ring[i][0] * ring[last][1];
  }
  return total / 2;
}

function roundPoint([x, y]) {
  return [round(x), round(y)];
}

/** Two decimals is under a thousandth of the viewBox — past what any screen
 *  resolves, and it keeps the shipped JSON to a third of its raw size. */
function round(value) {
  return Math.round(value * 100) / 100;
}
