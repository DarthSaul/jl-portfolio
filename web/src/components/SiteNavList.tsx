'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import type { NavItem, NavLabels } from '@/content/site'

export type SubNavItem = { key: string, title: string, to: string }

/**
 * The menu: IMAGES, COPY, BIO. A row in the header from `md` up, a column in the drawer below it.
 *
 * Split from `SiteNav` because that half is an async Server Component doing the Sanity read and
 * this half needs `usePathname` and a piece of state. The dropdown's items arrive as a prop.
 *
 * The items come from `SITE.nav`, arriving as `nav` already in her order (`siteSettings.menuOrder`,
 * via `orderNav`); the words are hers, from `siteSettings.navLabels`, and arrive as `labels`. They
 * are stored sentence case and uppercased in CSS, so assistive tech reads "Copy" rather than
 * spelling it out. That is why `uppercase` is a class here and not baked into a `type-*` token.
 *
 * ## Active state
 *
 * `next/link` sets no `aria-current`, so the active test is computed here: exact match for `/`,
 * prefix match for everything else, because `/copy/<slug>` should light COPY. Active is ink
 * against the muted grey of the rest — weight and value carry the state, not colour.
 *
 * `aria-current` is the string `'false'` rather than omitted when inactive, and the styling hangs
 * off the same attribute — `aria-[current=page]:text-ink` — so the visual state and the announced
 * one cannot drift apart.
 *
 * `usePathname` and **not** `useSearchParams`: this is in the root layout, and `useSearchParams`
 * there would bail every prerendered page's client tree out of its static HTML.
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
   * Whether the IMAGES list is open. Closed by default — from `md` up it is a dropdown over the
   * page, and a dropdown that arrives open covers the content someone came for.
   */
  const [subNavOpen, setSubNavOpen] = useState(false)
  const group = useRef<HTMLLIElement>(null)
  const groupButton = useRef<HTMLButtonElement>(null)

  /** Choosing a page closes it, as does any other navigation. */
  useEffect(() => { setSubNavOpen(false) }, [pathname])

  /**
   * A click anywhere outside the group closes it. `pointerdown` rather than `click`, so the list
   * is gone before whatever was clicked reacts. Only registered while open.
   *
   * The `onBlur` on the group covers the keyboard half (tabbing out). This covers the mouse half,
   * including Safari on macOS, where clicking the button never focuses it and so nothing blurs.
   */
  useEffect(() => {
    if (!subNavOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!group.current?.contains(event.target as Node)) setSubNavOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [subNavOpen])

  /**
   * The top-level look, without a `display`. Each item adds its own: the links are `inline-block`
   * and the IMAGES button is `inline-flex`, so its chevron sits beside the label. Two display
   * utilities on one element resolve by emitted-CSS order, not class-list order.
   */
  const topLevel
    = 'type-body-sm-strong uppercase tracking-[0.16em] text-muted transition-colors hover:text-ink aria-[current=page]:text-ink'

  return (
    <nav aria-label="Main">
      <ul className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
        {nav.map(item => item.key === 'galleries'
          ? (
              /*
                IMAGES is not a page — there is no /gallery index — so the label itself is the
                toggle, as a real `<button>`, and the list is a nested `<ul>` inside this `<li>`:
                the disclosure pattern, not an ARIA `menu`. Below `md` the list opens inline in the
                drawer; from `md` up it is positioned under the button as a dropdown.

                `hidden`, not conditional rendering: `aria-controls` points at the list by id, and
                removing the element would leave the attribute referencing nothing whenever the
                group is closed — which is exactly when it is being read.

                Escape closes the list and returns focus to the button. It is handled on the group
                rather than on `window`, so it fires only with focus inside it; the drawer's own
                Escape handler (in `SiteHeader`) still closes the drawer as well, which is the
                expected result of Escape on a phone.
              */
              <li
                key={item.key}
                ref={group}
                className="md:relative"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSubNavOpen(false)
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Escape' || !subNavOpen) return
                  setSubNavOpen(false)
                  groupButton.current?.focus()
                }}
              >
                <button
                  ref={groupButton}
                  type="button"
                  className={`${topLevel} inline-flex items-center gap-2 ${subNav.some(sub => isActive(sub.to)) ? 'text-ink' : ''}`}
                  aria-expanded={subNavOpen}
                  aria-controls="site-subnav"
                  onClick={() => setSubNavOpen(open => !open)}
                >
                  {labels.galleries}
                  <svg
                    className={`size-3.5 shrink-0 transition-transform ${subNavOpen ? 'rotate-180' : ''}`}
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

                {/*
                  The dropdown from `md` up: just below the header bar (`mt-7` clears the
                  bar from the button's baseline), its left edge aligned with the label, a
                  hairline box on the canvas — DESIGN.md's only elevation cue is a
                  hairline, so no shadow. `z-50` clears the sticky header's own `z-40` content.
                */}
                <ul
                  id="site-subnav"
                  hidden={!subNavOpen}
                  className="mt-3 flex flex-col gap-3 pl-3 md:absolute md:top-full md:left-0 md:z-50 md:mt-7 md:w-max md:min-w-48 md:border md:border-hairline md:bg-canvas md:px-5 md:py-4"
                >
                  {subNav.map(sub => (
                    <li key={sub.key}>
                      <Link
                        href={sub.to}
                        aria-current={isActive(sub.to) ? 'page' : 'false'}
                        className="type-body-sm inline-block uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink aria-[current=page]:text-ink"
                        onClick={() => setSubNavOpen(false)}
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
