import { IconSparkle } from '@/components/ui'

/**
 * ६० शब्दांत सारांश — the whole release, for the reader who will not read the
 * whole release.
 *
 * It replaces the bulleted "महत्त्वाचे मुद्दे" box the reader modal used to
 * carry. Three fragments make a reader assemble the story themselves; sixty
 * words of continuous prose is a thing you can read once, forward, and leave
 * with. The bullets have not gone away — they are still what the .docx prints
 * as sub-heads and what the assistant is grounded on — they are simply no
 * longer what a citizen is shown first.
 */
export function SummaryCard({ summary }: { summary: string }) {
  return (
    <section className="summary-card" aria-labelledby="summary-60">
      <div className="flex items-center gap-1.5">
        <IconSparkle size={13} style={{ color: 'var(--accent)' }} />
        <h2
          id="summary-60"
          className="text-xs font-semibold"
          style={{ color: 'var(--accent)' }}
        >
          ६० शब्दांत सारांश
        </h2>
      </div>
      <p className="mt-2">{summary}</p>
    </section>
  )
}
