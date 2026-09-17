import type { FeatureArticle } from './feature'

/**
 * Ask the server for this article as a .docx and hand the file to the browser.
 *
 * The document is built server-side, by the same `buildArticleDocx` the desk
 * and the fold use, so a citizen's download and the department's own file are
 * the same document. Building it here in the browser instead would mean a
 * second implementation of FOLD-FORMAT and a ~500 KB library on a page whose
 * point is that it is fast.
 *
 * The article travels in the request body because the sample set has no rows
 * behind it. When these come from the database, this becomes a GET of
 * `/api/articles/<id>/docx` and nothing else on the page changes.
 */
export async function downloadArticleDocx(article: FeatureArticle): Promise<void> {
  const res = await fetch('/api/articles/export/docx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ article }),
  })
  if (!res.ok) throw new Error(`docx export failed: ${res.status}`)

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${article.id}.docx`
  document.body.appendChild(a)
  a.click()
  a.remove()

  // Chrome needs the object URL to outlive the click by a tick; revoking it
  // synchronously cancels the download it was just handed.
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
