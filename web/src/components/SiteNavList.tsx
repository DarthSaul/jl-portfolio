'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

import type { NavItem, NavLabels } from '@/content/site'

export type SubNavItem = { key: string, title: string, to: string }

/**
 * The nav, stacked. Lives inside `SiteSidebar` at every width — a column on desktop, the body of
 * the drawer on a phone.
 *
 * Split from `SiteNav` because that half is an async Server Component doing the Sanity read and
 * this half needs `usePathname` and a piece of state. The gallery list arrives as a prop.
 *
 * The items come from `SITE.nav`, arriving as `nav` already in her order (`siteSettings.menuOrder`,
 * via `orderNav`); the words are hers, from `siteSettings.navLabels`, and arrive as `labels`. They
 * are stored sentence case and uppercased in CSS, so assistive tech reads "Copy" rather than
 * spelling it out. That is why `uppercase` is a class here and deliberately not baked into the
 * `type-*` token.
 *
 * ## Active state, and the bug this fixes
 *
 * `next/link` sets no `aria-current` at all, so the active test is computed here — and it would
 * have to be even if it did. The rule is exact match for `/`, prefix match for everything else,
 * because `/copy/<slug>` should light COPY. Under a centred horizontal bar a post page
 * highlighting nothing was easy to miss; under a sidenav that sits beside the reader the whole
 * time, it reads as broken.
 *
 * Active is ink against the muted grey of the rest — DESIGN.md is a strict black-and-white duet,
 * so weight and value carry the state and there is no accent colour to reach for.
 *
 * `aria-current` is bound to the string `'false'` rather than omitted when inactive. An explicit
 * `aria-current="false"` is valid ARIA meaning "not the current item", and the styling hangs off
 * the same attribute — `aria-[current=page]:text-ink` — so the visual state and the announced
 * one cannot drift apart.
 *
 * `usePathname` and **not** `useSearchParams`: this component is in the root layout, and
 * `useSearchParams` in a prerendered route bails the whole client tree up to the nearest
 * Suspense boundary out of the static HTML. From the layout that would be every page on the
 * site. Nothing here needs the query string.
 */
export function SiteNavList({
  nav,
  subNav,
  labels,
}: {
  nav: NavItem[]
  subNav: SubNavItem[]
  labels: NavLabels
}) {
  const pathname = usePathname()

  /** Prefix matching, with `/` as the one exception — every path starts with it. */
  const isActive = (to: string) =>
    to === '/'
      ? pathname === '/'
      : pathname === to || pathname.startsWith(`${to}/`)

  /**
   * Open by default, and kept in plain component state on purpose.
   *
   * `SiteNav` is rendered once, inside the sidebar, inside the root layout — and App Router
   * preserves layouts across client-side navigation, so this survives a route change without any
   * storage. It resets on a full reload, which is the right default for a nav: the list is how
   * these pages are found, so a visitor arriving fresh should see it.
   *
   * It is deliberately *not* forced open when one of its items is the current page. That would
   * re-open the group under someone who had just collapsed it and then clicked something in it,
   * which reads as the control being broken rather than helpful.
   */
  const [subNavOpen, setSubNavOpen] = useState(true)

  /**
   * The top-level look, without a `display`. Each item adds its own: the links are `inline-block`
   * and the GALLERIES button is `inline-flex`, so its chevron sits beside the label. Sharing one
   * string with `inline-block` in it and appending `flex` for the button put two display utilities
   * on one element, and Tailwind resolves that by emitted-CSS order rather than class-list order —
   * `inline-block` won, and the chevron (a block-level `svg` under preflight) wrapped to its own
   * line.
   */
  const topLevel
    = 'type-body-sm-strong uppercase tracking-[0.16em] text-muted transition-colors hover:text-ink aria-[current=page]:text-ink'

  return (
    <nav aria-label="Main">
      <ul className="flex flex-col gap-4">
        {nav.map(item => item.key === 'galleries'
          ? (
              /*
                GALLERIES is a heading, not a page — there is no /gallery index — so the label
                itself is the toggle, as a real `<button>`. This used to be a chevron beside START,
                because START was both a link to `/` and the parent of the galleries, and an element
                that both navigates and expands is the classic dropdown-nav trap. Splitting the
                two roles into two menu items removed the trap rather than working around it.

                The galleries are now a nested `<ul>` inside this `<li>`, which is the textbook
                disclosure markup — and it is finally honest. Under START it was wrong, because
                `/gallery/<slug>` is not a child of `/`, so the group was a flat sibling `<li>`
                styled to look nested. Under GALLERIES the nesting is the truth.

                `aria-controls` names the list and `aria-expanded` states which way it is. The
                chevron is `aria-hidden`: it repeats the state visually and would otherwise be
                announced as a second, wordless thing. The label lights up (ink) while one of its
                pages is open, the same signal an active link gets — but through a class, because
                `aria-current` belongs on the link to the current page, which is inside the list.

                `hidden`, not conditional rendering, and that is an accessibility requirement
                rather than a preference: `aria-controls` points at the list by id, and removing
                the element would leave the attribute referencing nothing whenever the group is
                closed — which is exactly when it is being read.
              */
              <li key={item.key}>
                <button
                  type="button"
                  className={`${topLevel} inline-flex items-center gap-2 ${subNav.some(sub => isActive(sub.to)) ? 'text-ink' : ''}`}
                  aria-expanded={subNavOpen}
                  aria-controls="site-subnav"
                  onClick={() => setSubNavOpen(open => !open)}
                >
                  {labels.galleries}
                  <svg
                    className={`size-3.5 shrink-0 transition-transform ${subNavOpen ? '' : '-rotate-90'}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                <ul id="site-subnav" hidden={!subNavOpen} className="mt-2 flex flex-col gap-2 pl-3">
                  {subNav.map(sub => (
                    <li key={sub.key}>
                      <Link
                        href={sub.to}
                        aria-current={isActive(sub.to) ? 'page' : 'false'}
                        className="type-body-sm inline-block uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink aria-[current=page]:text-ink"
                      >
                        {sub.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            )
          : (
              <li key={item.key}>
                <Link
                  href={item.to}
                  aria-current={isActive(item.to) ? 'page' : 'false'}
                  className={`${topLevel} inline-block`}
                >
                  {labels[item.key]}
                </Link>
              </li>
            ))}
      </ul>
    </nav>
  )
}
