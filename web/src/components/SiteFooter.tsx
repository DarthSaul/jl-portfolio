import { SITE } from '@/content/site'

/**
 * The footer: a 1px ink rule, the copyright on the left, and text links to Instagram, Substack
 * and email on the right — the mockup's footer. The header keeps its icon links too; these are
 * the same `SITE.social` list, spelled out, for a visitor who has scrolled past the masthead
 * (which is not sticky). The credit line follows the copyright.
 *
 * A Server Component with no data: everything here is site chrome from `content/site.ts`. It
 * renders outside `<main>` as the page's `contentinfo` landmark, inside `MainColumn`'s inert
 * wrapper so the open drawer takes it out of the tab order along with the page.
 *
 * On /gallery/all infinite scroll pushes it down as photographs load, so it is reached only once
 * the index is exhausted. Accepted: it holds nothing a visitor needs to get to.
 */
const FOOTER_LABEL = { instagram: 'Instagram', substack: 'Substack', mail: 'Email' } as const

export function SiteFooter() {
  return (
    <footer className="print:hidden">
      <div className="main-column mx-auto max-w-shell">
        <div className="type-body-sm flex flex-col gap-5 border-t border-hairline pt-7 pb-11 text-muted sm:flex-row sm:flex-wrap sm:justify-between">
          <div className="flex flex-col gap-1">
            <p>{SITE.copyright}</p>
            <p>{SITE.credit}</p>
          </div>
          <ul className="flex flex-wrap gap-6">
            {SITE.social.map(link => (
              <li key={link.href}>
                <a
                  href={link.href}
                  {...(link.icon === 'mail' ? {} : { target: '_blank', rel: 'me noopener' })}
                  className="text-ink transition-colors hover:text-accent"
                >
                  {FOOTER_LABEL[link.icon]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}
