/**
 * Exercises every ported SQL path against the live database, then cleans up.
 * Run from the project root:  npx tsx <this file>
 */
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import {
  createArticle, getArticle, listArticles, updateArticle, deleteArticle,
  suggestReleaseNo, getFold, setFoldOrder, foldArticles,
  districtCounts, dailyCounts, ensureSchema, pool,
} from '../src/lib/db'

const DATE = '2099-01-01' // far future so it cannot collide with seeded data
const created: number[] = []

function check(label: string, cond: boolean, detail?: unknown) {
  if (cond) {
    console.log(`  ok   ${label}`)
  } else {
    console.log(`  FAIL ${label}`, detail ?? '')
    process.exitCode = 1
  }
}

async function main() {
  console.log('schema...')
  await ensureSchema()
  console.log('  ok   ensureSchema (tables, migrations, indexes)')

  console.log('insert / read back...')
  const a = await createArticle({
    raw_text: 'स्मोक चाचणी मजकूर',
    title: 'स्मोक चाचणी',
    district: 'pune',
    language: 'mr',
    bullets: ['एक', 'दोन'],
    release_no: '999001',
    fold_date: DATE,
    status: 'pending',
    submitted_by: 'smoke',
  })
  created.push(a.id)
  check('RETURNING * yields a numeric id', typeof a.id === 'number' && a.id > 0, a.id)
  check('bullets round-trip as JSON', Array.isArray(a.bullets) && a.bullets.length === 2, a.bullets)
  check('devanagari survives the round-trip', a.title === 'स्मोक चाचणी', a.title)

  const fetched = await getArticle(a.id)
  check('getArticle returns the row', fetched?.id === a.id)
  check('getArticle(missing) is null', (await getArticle(2147483600)) === null)

  console.log('filters...')
  check('filter by fold_date', (await listArticles({ fold_date: DATE })).length === 1)
  check('filter by status', (await listArticles({ fold_date: DATE, status: 'pending' })).length === 1)
  check('filter by district', (await listArticles({ fold_date: DATE, district: 'pune' })).length === 1)
  check('date range (from/to)', (await listArticles({ from: DATE, to: DATE })).length === 1)
  check('non-matching filter is empty', (await listArticles({ fold_date: DATE, district: 'akola' })).length === 0)

  console.log('update / approve...')
  const patched = await updateArticle(a.id, { title: 'बदललेले शीर्षक', bullets: ['तीन'] })
  check('scalar update applies', patched?.title === 'बदललेले शीर्षक', patched?.title)
  check('bullets update applies', patched?.bullets.length === 1, patched?.bullets)

  const approved = await updateArticle(a.id, { status: 'approved' })
  check('status update applies', approved?.status === 'approved')
  check('approved_at is stamped', !!approved?.approved_at, approved?.approved_at)

  const noop = await updateArticle(a.id, {})
  check('empty patch is a no-op, not a crash', noop?.id === a.id)

  console.log('release numbers...')
  const next = await suggestReleaseNo()
  check('suggestReleaseNo returns a number string', /^\d+$/.test(next), next)

  // The SQLite GLOB port: a non-numeric release_no must not break the CAST.
  const weird = await createArticle({
    raw_text: 'x', release_no: '12अ', fold_date: DATE, status: 'pending',
  })
  created.push(weird.id)
  const stillFine = await suggestReleaseNo()
  check('non-numeric release_no does not break the CAST', /^\d+$/.test(stillFine), stillFine)

  console.log('folds (upsert)...')
  const f1 = await getFold(DATE)
  check('fold auto-includes approved article', f1.article_order.includes(a.id), f1.article_order)

  await setFoldOrder(DATE, [a.id])
  const f2 = await setFoldOrder(DATE, [a.id]) // second write exercises ON CONFLICT
  check('ON CONFLICT upsert works on re-write', f2.article_order.length === 1, f2.article_order)

  const fa = await foldArticles(DATE)
  check('foldArticles returns ordered approved rows', fa.length === 1 && fa[0].id === a.id)

  console.log('stats (bigint COUNT)...')
  const dc = await districtCounts(DATE, DATE)
  const pune = dc.find((d) => d.district === 'pune')
  check('districtCounts returns a real number, not a string',
    typeof pune?.count === 'number' && pune.count === 1, pune)

  const daily = await dailyCounts(DATE, DATE)
  check('dailyCounts returns a real number, not a string',
    typeof daily[0]?.count === 'number' && daily[0].count === 1, daily[0])

  console.log('delete...')
  for (const id of created) await deleteArticle(id)
  check('rows are gone after delete', (await listArticles({ fold_date: DATE })).length === 0)
  await pool().query('DELETE FROM folds WHERE "date" = $1', [DATE])
  console.log('  ok   cleaned up')
}

main()
  .then(() => pool().end())
  .then(() => console.log(process.exitCode ? '\nSMOKE FAILED' : '\nSMOKE PASSED'))
  .catch(async (err) => {
    console.error('\nSMOKE ERROR:', err)
    process.exitCode = 1
    await pool().end().catch(() => {})
  })
