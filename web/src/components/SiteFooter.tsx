import { SITE } from '@/content/site'

import { SiteSocialIcon } from './SiteSocialIcon'

/**
 * The footer: a 1px ink rule, the copyright and credit on the left, and three icon links —
 * Instagram, Substack, email, from `SITE.social` — on the right. They are the site's only social
 * links: they were in the masthead until 2026-11, and moved here so the menu ends the masthead.
 *
 * A Server Component with no data: everything here is site chrome from `content/site.ts`. It
 * renders outside `<main>` as the page's `contentinfo` landmark, inside `MainColumn`'s inert
 * wrapper so the open drawer takes it out of the tab order along with the page.
 *
 * On /gallery/all infinite scroll pushes it down as photographs load, so it is reached only once
 * the index is exhausted. Accepted: it holds nothing a visitor needs to get to.
 */
export function SiteFooter() {
  return (
    <footer className="print:hidden">
      <div className="main-column mx-auto max-w-shell">
        <div className="type-body-sm flex flex-col gap-5 border-t border-hairline pt-7 pb-11 text-muted sm:flex-row sm:flex-wrap sm:justify-between">
          <div className="flex flex-col gap-1">
            <p>{SITE.copyright}</p>
            <p>{SITE.credit}</p>
          </div>
          {/*
            Bare glyphs rather than filled circles: a filled container on a page whose only other
            mark is a 1px hairline reads as three buttons demanding attention. `rounded-full` is
            kept for the focus ring's shape — one of the two `rounded-full` exceptions (the other
            is the Instagram strip's Follow pill).
          */}
          <ul className="flex items-center gap-5 sm:self-start">
            {SITE.social.map(link => (
              <li key={link.href}>
                {/*
                  Icon-only, so `aria-label` is the only name a screen reader gets. `mail` opens a
                  mail client rather than a tab, which is why it alone skips target/rel.
                */}
                <a
                  href={link.href}
                  aria-label={link.label}
                  {...(link.icon === 'mail' ? {} : { target: '_blank', rel: 'me noopener' })}
                  className="block rounded-full text-ink transition-colors hover:text-accent"
                >
                  <SiteSocialIcon name={link.icon} className="size-5" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}
