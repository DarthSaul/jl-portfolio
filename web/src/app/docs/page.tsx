import fs from 'node:fs'
import path from 'node:path'
import type { Metadata } from 'next'

import { DocsMarkdown } from '@/components/docs/DocsMarkdown'
import { DocsTocInline, DocsTocRail } from '@/components/docs/DocsToc'
import { extractSections } from '@/lib/docs'

/**
 * /docs — the Field Guide: Joan's manual for editing the site through the Studio.
 *
 * **Unlisted, deliberately.** Nothing links here — not the nav, not `content/site.ts` — and
 * `robots` below keeps search engines from surfacing what the address's obscurity hides. Public
 * but unlisted is the intended level of protection: the guide contains nothing sensitive, it is
 * just not for visitors. There is no sitemap in the app to exclude it from; if one is ever
 * added, `/docs` stays out of it.
 *
 * **The content is the repo's, not Sanity's.** The guide documents the Studio, so it changes
 * when the code changes — the same commit that alters a schema can update the page describing
 * it. It is read from disk at build time (no dynamic APIs are used, so the route prerenders
 * fully static — expect `○` in `next build`), which means an edit to the markdown reaches the
 * page on the next deploy, not on an ISR timer. `process.cwd()` is `web/` both locally and on
 * Vercel, where it is the project's root directory.
 */

export const metadata: Metadata = {
  title: 'Field Guide',
  robots: { index: false, follow: false },
}

export default function DocsPage() {
  const markdown = fs.readFileSync(path.join(process.cwd(), 'content/docs/field-guide.md'), 'utf8')
  const sections = extractSections(markdown)

  /*
   * From `xl` up the TOC rail sits in the spare width right of the reading column; the column
   * itself may give up a few pixels of `max-w-read` at exactly `xl` (`flex-1` + `min-w-0` let
   * it), which reads better than pushing the rail below the fold until `2xl`.
   */
  return (
    <div className="xl:flex xl:gap-10">
      <div className="min-w-0 max-w-read xl:flex-1">
        <DocsTocInline sections={sections} />
        <DocsMarkdown markdown={markdown} className="type-body-serif-lg" />
      </div>
      <DocsTocRail sections={sections} />
    </div>
  )
}
