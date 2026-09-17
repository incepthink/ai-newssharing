'use client'

import { useState } from 'react'
import type { FeatureArticle } from '@/lib/articles/feature'
import { DocxButton } from '@/components/articles/ArticleCard'
import { AskDrawer } from '@/components/articles/AskDrawer'
import { ShareSheet } from '@/components/articles/ShareSheet'
import { IconMessage, IconShare } from '@/components/ui'

/**
 * Everything you can do with the article you are reading.
 *
 * The only client island on `/news/[id]`: the story itself, its summary and
 * its related row all render on the server, and this is the one piece that
 * needs state. Keeping the boundary here rather than around the page means a
 * reader who never presses anything downloads no panel code for the article
 * body at all.
 *
 * The two panels stack rather than replace each other — asking the assistant
 * about the article should not close a share sheet that is already open — and
 * the assistant's context is fixed to this article, because on this page there
 * is no other article it could plausibly mean.
 */
export function ArticleActions({ article }: { article: FeatureArticle }) {
  const [sharing, setSharing] = useState(false)
  const [asking, setAsking] = useState(false)

  return (
    <>
      <div className="grid gap-2">
        <button type="button" className="btn-primary btn-block" onClick={() => setAsking(true)}>
          <IconMessage size={14} /> या बातमीबद्दल विचारा
        </button>

        <DocxButton
          article={article}
          className="btn-ghost btn-block"
          label="वर्ड फाइल (.docx)"
        />

        <button type="button" className="btn-ghost btn-block" onClick={() => setSharing(true)}>
          <IconShare size={14} /> शेअर करा
        </button>
      </div>

      {sharing && <ShareSheet article={article} onClose={() => setSharing(false)} />}
      {asking && <AskDrawer article={article} onClose={() => setAsking(false)} />}
    </>
  )
}
