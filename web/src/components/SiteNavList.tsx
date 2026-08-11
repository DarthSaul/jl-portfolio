'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment, useState } from 'react'

import { SITE } from '@/content/site'

export type SubNavItem = { key: string, title: string, to: string }

/**
 * The nav, stacked. Lives inside `SiteSidebar` at every width — a column on desktop, the body of
 * the drawer on a phone.
 *
 * Split from `SiteNav` because that half is an async Server Component doing the Sanity read and
 * this half needs `usePathname` and a piece of state. The gallery list arrives as a prop.
 *
 * Labels are stored sentence case in `SITE.nav` and uppercased in CSS, so assistive tech reads
 * "Copy" rather than spelling it out. That is why `uppercase` is a class here and deliberately
 * not baked into the `type-*` token.
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
export function SiteNavList({ subNav }: { subNav: SubNavItem[] }) {
  const pathname = usePathname()

  /**
   * Prefix matching, with `/` as the one exception — every path starts with it.
   *
   * `/shots` used to need the same treatment, because it was a top-level item whose children
   * were all listed separately under START, so a prefix match lit two entries in two groups for
   * one page. That item is gone, and with it the exception; the `/shots/*` pages are now *only*
   * in the sub-nav, where each matches itself exactly.
   */
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

  return (
    <nav aria-label="Main">
      <ul className="flex flex-col gap-4">
        {/*
          A keyed `<Fragment>`, so START emits two *sibling* `<li>`s inside this one `<ul>` —
          itself and its gallery group — rather than a wrapper element. That is the exact
          equivalent of Vue's `<template v-for>`, and it matters here: any real wrapper would
          add a list level, which is the nesting the comment on the group below argues against.
        */}
        {SITE.nav.map(item => (
          <Fragment key={item.to}>
            <li className={item.to === '/' ? 'flex items-center gap-2' : undefined}>
                <Link
                  href={item.to}
                  aria-current={isActive(item.to) ? 'page' : 'false'}
                  className="type-body-sm-strong inline-block uppercase tracking-[0.16em] text-muted transition-colors hover:text-ink aria-[current=page]:text-ink"
                >
                  {item.label}
                </Link>

                {/*
                  A separate control rather than making START itself the toggle. START is a link
                  to a real page and has to stay one; an element that both navigates and expands
                  is the classic dropdown-nav trap, where a keyboard user can reach the section
                  and never the page, or the reverse.

                  `aria-controls` names the list, `aria-expanded` states which way it is, and the
                  `aria-label` changes with it so a screen reader hears what the button will do
                  rather than only what it is. The chevron is `aria-hidden` — it repeats the
                  state visually and would otherwise be announced as a second, wordless thing.
                */}
                {item.to === '/' && (
                  <button
                    type="button"
                    className="-m-1 p-1 text-muted transition-colors hover:text-ink"
                    aria-expanded={subNavOpen}
                    aria-controls="site-subnav"
                    aria-label={subNavOpen ? 'Hide photo pages' : 'Show photo pages'}
                    onClick={() => setSubNavOpen(open => !open)}
                  >
                    <svg
                      className={`size-3.5 transition-transform ${subNavOpen ? '' : '-rotate-90'}`}
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
                )}
              </li>

              {/*
                The galleries, nested under START.

                A real nested `<ul>` inside START's own `<li>` would be the textbook markup, and
                it is wrong here: these pages are not children of `/`, they are `/shots/<slug>`.
                Nesting them under START would tell a screen reader they are sub-pages of the
                front page, which is a claim about structure that is not true. They are a flat
                sibling group that happens to sit under START visually — hence the indent, the
                smaller type, and the `aria-label` naming what the group is.

                `-mt-2` is doing real work, not nudging. This group is a sibling `<li>` inside a
                `gap-4` column, so it inherits the same 16px that separates two top-level items —
                which reads as a fifth peer rather than as START's children. Pulling it back 8px
                halves that, so the gap above the group is visibly tighter than the gap between
                the items around it, which is the whole signal that they belong to START.

                `hidden`, not conditional rendering, and that is an accessibility requirement
                rather than a preference: `aria-controls` on the button above points at this list
                by id, and removing the element would leave the attribute referencing nothing
                whenever the group is closed — which is exactly when it is being read.
              */}
              {item.to === '/' && (
                <li className="-mt-2" hidden={!subNavOpen}>
                  <ul id="site-subnav" aria-label="Photos" className="flex flex-col gap-2 pl-3">
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
              )}
          </Fragment>
        ))}
      </ul>
    </nav>
  )
}
