import { SITE } from '@/content/site'

/**
 * The slim footer: copyright and credit, and nothing else. Moved here from the bottom of the old
 * sidebar when the chrome became a top bar. The social links stayed in the header — the
 * copyright is one node in one place, never duplicated.
 *
 * A Server Component with no data: both lines are site chrome from `content/site.ts`. It renders
 * outside `<main>` as the page's `contentinfo` landmark, inside `MainColumn`'s inert wrapper so
 * the open drawer takes it out of the tab order along with the page.
 *
 * On /gallery/all infinite scroll pushes it down as photographs load, so it is reached only once
 * the index is exhausted. Accepted: it holds nothing a visitor needs to get to.
 */
export function SiteFooter() {
  return (
    <footer className="print:hidden">
      <div className="type-caption main-column mx-auto flex max-w-shell flex-col gap-2 py-8 text-muted sm:flex-row sm:justify-between">
        <p>{SITE.copyright}</p>
        <p>{SITE.credit}</p>
      </div>
    </footer>
  )
}
