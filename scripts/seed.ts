/**
 * Seed the database with real DGIPR releases (2 Sep 2026), so the product can be
 * demonstrated without an OpenAI key and without waiting for DLOs to submit.
 *
 * Districts are spread across the state for demo purposes — the source releases
 * are mostly Mumbai-datelined state-level announcements, which would make for a
 * very boring heatmap.
 *
 *   npx tsx scripts/seed.ts
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createArticle, ensureSchema, pool } from '../src/lib/db'
import type { Language } from '../src/lib/types'

interface Seed {
  title: string
  attribution: string | null
  bullets: string[]
  body: string
  dateline: string | null
  release_no: string | null
  language: Language
  district: string | null
}

function isoDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const seeds: Seed[] = JSON.parse(
  readFileSync(join(process.cwd(), 'scripts/seed-data.json'), 'utf-8'),
)

async function main() {
  await ensureSchema()
  await pool().query('DELETE FROM articles; DELETE FROM folds;')

  let n = 0
  for (const [i, s] of seeds.entries()) {
    // Spread over the last few days so the volume chart has a shape.
    const foldDate = isoDaysAgo(i % 5)
    await createArticle({
      raw_text: s.body,
      body: s.body,
      title: s.title,
      language: s.language,
      district: s.district,
      dateline: s.dateline,
      attribution: s.attribution,
      bullets: s.bullets,
      release_no: s.release_no,
      office: 'मुख्यमंत्री सचिवालय (जनसंपर्क कक्ष)',
      // Rough stand-in for what the desk would decide, so the queue's वर्ग filter
      // has both sides to show.
      category: /मुख्यमंत्री|मंत्रिमंडळ/.test(`${s.title} ${s.attribution ?? ''}`) ? 'cm' : 'general',
      // Leave a few pending so the desk queue isn't empty on first open.
      status: i % 6 === 0 ? 'pending' : 'approved',
      fold_date: foldDate,
      submitted_by: 'seed',
    })
    n++
  }

  console.log(`Seeded ${n} articles across 5 days.`)
  await pool().end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
