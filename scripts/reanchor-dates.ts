/**
 * Slide the stored corpus forward so its newest fold lands on today.
 *
 * The seed is anchored to the day it was run — `seed.ts` spreads its rows over
 * the five days ending that day — so a database seeded last week shows an empty
 * fold on the home page and a greyed-out 24-hour map, which reads as an outage
 * rather than as a demo whose data has aged. Re-seeding would fix that by
 * deleting everything, including whatever the desk has written since. This
 * shifts instead: every date in `articles` and `folds` moves by the same whole
 * number of days, so the shape of the corpus — five days, the weekend gap, the
 * order inside a fold — survives, and only the anchor changes.
 *
 * Idempotent: the shift is computed from the newest `fold_date`, so a second
 * run on the same day is a no-op.
 *
 *   npx tsx scripts/reanchor-dates.ts             # newest fold -> today
 *   npx tsx scripts/reanchor-dates.ts --to 2026-09-20
 *   npx tsx scripts/reanchor-dates.ts --days 3    # explicit shift
 *   npx tsx scripts/reanchor-dates.ts --dry-run
 */
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { ensureSchema, pool } from '../src/lib/db'

/** `YYYY-MM-DD` in local time — the same day the app's `todayIso` means. */
function isoDate(d: Date): string {
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? undefined : process.argv[i + 1]
}

/** Whole days between two ISO dates, counted at noon UTC so DST cannot shave one off. */
function daysBetween(from: string, to: string): number {
  const at = (iso: string) => Date.parse(`${iso}T12:00:00Z`)
  return Math.round((at(to) - at(from)) / 86_400_000)
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const target = arg('to') ?? isoDate(new Date())

  if (!/^\d{4}-\d{2}-\d{2}$/.test(target)) {
    throw new Error(`--to expects YYYY-MM-DD, got "${target}"`)
  }

  await ensureSchema()
  const client = await pool().connect()

  try {
    const { rows } = await client.query<{ max: string | null; n: string }>(
      `SELECT MAX(fold_date) AS max, COUNT(*) AS n FROM articles`,
    )
    const newest = rows[0]?.max
    if (!newest) {
      console.log('No articles to re-anchor — run `npm run seed` first.')
      return
    }

    const explicit = arg('days')
    const shift = explicit !== undefined ? Number(explicit) : daysBetween(newest, target)
    if (!Number.isInteger(shift)) throw new Error(`--days expects a whole number, got "${explicit}"`)

    console.log(`${rows[0].n} articles, newest fold ${newest}`)
    if (shift === 0) {
      console.log('Already anchored — nothing to do.')
      return
    }
    const anchor = shiftIso(newest, shift)
    console.log(`Shifting every date by ${shift > 0 ? '+' : ''}${shift} day(s) → newest fold ${anchor}`)
    if (dryRun) {
      console.log('--dry-run: nothing written.')
      return
    }

    // One transaction: a half-shifted corpus — articles moved, folds not —
    // would drop the desk's hand-ordering for every fold it touched.
    await client.query('BEGIN')

    // `submitted_at`/`approved_at` are ISO strings in a TEXT column, so they are
    // parsed, shifted and re-rendered in exactly the format the app writes
    // (`toISOString`), not in Postgres's default timestamp rendering.
    const { rowCount: articles } = await client.query(
      `UPDATE articles SET
         fold_date    = to_char(fold_date::date + $1::int, 'YYYY-MM-DD'),
         submitted_at = to_char((submitted_at::timestamptz + make_interval(days => $1::int))
                                  AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
         approved_at  = CASE WHEN approved_at IS NULL THEN NULL ELSE
                          to_char((approved_at::timestamptz + make_interval(days => $1::int))
                                    AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END`,
      [shift],
    )

    /* `folds.date` is the primary key, and shifting forward walks a row onto the
       key of the row above it before that one has moved. Staging the shifted
       rows, clearing the table and re-inserting them is three statements rather
       than one for a reason: a data-modifying CTE (`WITH moved AS (DELETE ...)`)
       does not work here, because the delete and the insert see the same
       snapshot, so the unique check still finds the rows the CTE just removed
       and raises 23505. Inside the transaction this is atomic either way. */
    await client.query(
      `CREATE TEMP TABLE folds_shifted ON COMMIT DROP AS
       SELECT to_char("date"::date + $1::int, 'YYYY-MM-DD') AS "date",
              article_order,
              CASE WHEN finalized_at IS NULL THEN NULL ELSE
                to_char((finalized_at::timestamptz + make_interval(days => $1::int))
                          AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END AS finalized_at
       FROM folds`,
      [shift],
    )
    await client.query('DELETE FROM folds')
    const { rowCount: folds } = await client.query(
      `INSERT INTO folds ("date", article_order, finalized_at)
       SELECT "date", article_order, finalized_at FROM folds_shifted`,
    )

    await client.query('COMMIT')
    console.log(`Re-anchored ${articles} articles and ${folds} fold(s).`)

    const { rows: after } = await client.query(
      `SELECT fold_date, COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
              COUNT(*) FILTER (WHERE status = 'pending')::int  AS pending
       FROM articles GROUP BY fold_date ORDER BY fold_date DESC`,
    )
    for (const r of after) console.log(`  ${r.fold_date}  approved ${r.approved}  pending ${r.pending}`)
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
    await pool().end()
  }
}

function shiftIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
