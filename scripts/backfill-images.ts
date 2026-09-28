/**
 * Give the mahasamvad imports their photographs.
 *
 * The rows pulled from mahasamvad.in arrived with the post's featured image in a
 * `poster_url` column that the app's schema never declared, so nothing read it.
 * This copies it into `image_url`, credited to महासंवाद — the directorate's own
 * portal, which is where the photograph was published.
 *
 * Only fills rows whose `image_url` is still empty, so it is safe to re-run and
 * never overwrites a photo or credit the desk has set by hand.
 *
 *   npm run backfill:images
 */
import { loadEnvConfig } from '@next/env'
import { ensureSchema, pool } from '../src/lib/db'

loadEnvConfig(process.cwd())

const CREDIT = 'महासंवाद'

async function main() {
  await ensureSchema()

  const legacy = await pool().query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'poster_url'`,
  )
  if (!legacy.rowCount) {
    console.log('No poster_url column — nothing to backfill.')
    return
  }

  const res = await pool().query(
    `UPDATE articles
        SET image_url = poster_url, image_credit = COALESCE(image_credit, $1)
      WHERE image_url IS NULL AND poster_url IS NOT NULL AND poster_url <> ''`,
    [CREDIT],
  )
  const { rows } = await pool().query(
    `SELECT COUNT(*) FILTER (WHERE image_url IS NOT NULL) AS with_image, COUNT(*) AS total
       FROM articles WHERE status = 'approved'`,
  )
  console.log(`Backfilled ${res.rowCount} rows. Approved releases with a photo: ${rows[0].with_image} of ${rows[0].total}.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => pool().end())
