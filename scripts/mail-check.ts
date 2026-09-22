/**
 * Checks the SMTP settings in .env, and optionally sends a test fold.
 * Run from the project root:
 *   npx tsx scripts/mail-check.ts                 # verify credentials only
 *   npx tsx scripts/mail-check.ts you@example.com # also send a test message
 */
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { mailConfig, verifyMail, sendFold } from '../src/lib/email'

const SAMPLE = `*माहिती व जनसंपर्क महासंचालनालय*

*महत्वाच्या बातम्यांचा सारांश*
-----------
*चाचणी संदेश — DGIPR वृत्तपत्रिका*
- माहिती व जनसंपर्क महासंचालनालय
• ही एक चाचणी आहे
• मराठी मजकूर, ठळक अक्षरे आणि दुवे तपासण्यासाठी

मुंबई : हा संदेश ईमेल सेवा योग्य प्रकारे काम करत आहे हे तपासण्यासाठी पाठवला आहे.

संपादनयोग्य प्रत (DOCX):
https://example.gov.in/dgipr/docs/ms-000000.docx
──────────────`

async function main() {
  const cfg = mailConfig()
  if ('error' in cfg) {
    console.log(`not configured: ${cfg.error}`)
    process.exit(1)
  }

  console.log(`host   ${cfg.host}:${cfg.port} (secure=${cfg.secure})`)
  console.log(`auth   ${cfg.user ? cfg.user : 'none'}`)
  console.log(`from   ${cfg.from}`)

  try {
    await verifyMail()
    console.log('\nhandshake + auth ok')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`\nfailed: ${msg}`)
    // The two that actually happen, and what each one means in practice.
    if (/Invalid login|535|BadCredentials/i.test(msg)) {
      console.log('→ Gmail rejects the account password. Use a 16-character App Password.')
    }
    if (/ETIMEDOUT|ECONNREFUSED/i.test(msg)) {
      console.log('→ Nothing answered on that host/port. Check SMTP_HOST and that 587 is not blocked.')
    }
    process.exit(1)
  }

  const to = process.argv[2]
  if (!to) {
    console.log('\npass an address to send a test message there.')
    process.exit(0)
  }

  const r = await sendFold({
    to: [to],
    subject: 'DGIPR Daily News Summary — test',
    message: SAMPLE,
  })
  console.log(`\nsent to ${r.accepted.join(', ') || '(none)'}`)
  if (r.rejected.length) console.log(`rejected: ${r.rejected.join(', ')}`)
  process.exit(0)
}

main()
