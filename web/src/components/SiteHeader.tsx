'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

import { SITE } from '@/content/site'

import { useNavDrawer } from './NavDrawerContext'
import { SiteSocialIcon } from './SiteSocialIcon'

/**
 * The site's top bar: her name on the left edge; the menu (IMAGES, COPY, BIO) and three icon
 * links (Instagram, Substack, email) on the right. Below `md` the menu and icons collapse into a
 * full-screen drawer behind a menu button. The copyright and credit live in `SiteFooter`.
 *
 * It replaced `SiteSidebar`, the left-hand column the site launched with. What carried over is
 * the drawer machinery, unchanged in substance.
 *
 * ## One element, two shapes, and exactly one `<h1>`
 *
 * The **panel** — nav plus icons — is a single element in the DOM at every width: an inline row
 * from `md` up, and a fixed full-screen sheet below it. Nothing is rendered conditionally on
 * width, because the server cannot know the viewport and any attempt to would be a hydration
 * mismatch rather than a layout. It also means the nav (and the `id`s inside it) exist once.
 *
 * The wordmark is outside the panel, in the bar itself, so it is always present and always the
 * page's level-1 heading. Inside the drawer it would be `display: none` on a phone with the menu
 * closed, which takes it out of the accessibility tree and leaves the page with no `<h1>`.
 *
 * DOM order is wordmark, toggle, panel. On a phone that puts the toggle before the links it
 * opens, so tabbing from the toggle walks into the drawer; from `md` up the toggle is
 * `display: none` and the panel sits at the right edge through `justify-between`.
 *
 * ## Two Tailwind v4 traps this markup is shaped around
 *
 * **Conflicting utilities resolve by emitted-CSS order, not class-list order.** So
 * `className={isOpen ? 'fixed' : 'static'}` on one element is a coin flip rather than a toggle.
 * The panel's conditional classes are a `display` pair — `flex` against `hidden md:flex` — two
 * branches that never both apply.
 *
 * **The drawer is a full-screen opaque overlay**, so there is no backdrop element and no
 * backdrop-click handler. There is nothing behind it to click. If it ever becomes a
 * partial-width drawer, that handler comes back with it.
 *
 * ## Why the nav arrives as a prop
 *
 * `SiteNav` is an async Server Component and this is a Client Component, so this file cannot
 * import it. The root layout renders `<SiteHeader nav={<SiteNav />} />` instead — the element is
 * created on the server and passed through already rendered. `title` arrives the same way, from
 * `getSiteSettings()` in the layout. This file never touches Sanity.
 */
export function SiteHeader({ nav, title }: { nav: ReactNode, title: string }) {
  const { isOpen, close, toggle } = useNavDrawer()
  const toggleBtn = useRef<HTMLButtonElement>(null)

  /**
   * Every effect lives here rather than in `NavDrawerContext`, because the context has three
   * consumers and an effect registered there would be registered once per consumer.
   */

  /**
   * Escape closes the drawer from anywhere and puts focus back on the toggle — otherwise Escape
   * pressed deep in the nav would drop focus to the top of a page that just became interactive.
   *
   * No focus *trap* is needed: everything outside the header is `inert` while the drawer is open
   * (see `MainColumn`), so the only tabbable things left are the wordmark, the toggle and the
   * drawer's own links.
   */
  useEffect(() => {
    if (!isOpen) return

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      close()
      toggleBtn.current?.focus()
    }

    /**
     * The drawer and the desktop row are the same element, so crossing `md` while the drawer is
     * open would leave `isOpen` true against a layout with no drawer — and the page would stay
     * `inert`, silently unclickable. Closing on the crossing is the fix.
     */
    const wide = window.matchMedia('(min-width: 48rem)') // Tailwind's `md`
    const onWiden = (event: MediaQueryListEvent) => {
      if (event.matches) close()
    }

    window.addEventListener('keydown', onKeydown)
    wide.addEventListener('change', onWiden)
    return () => {
      window.removeEventListener('keydown', onKeydown)
      wide.removeEventListener('change', onWiden)
    }
  }, [isOpen, close])

  /**
   * Scroll lock: `overflow-hidden` on `<html>` rather than the `position: fixed` body-lock hack,
   * which loses the scroll position on close. **The cleanup is load-bearing** — without it a lock
   * could outlive the component and leave the document permanently unscrollable.
   */
  useEffect(() => {
    if (!isOpen) return
    const root = document.documentElement
    root.classList.add('overflow-hidden')
    return () => root.classList.remove('overflow-hidden')
  }, [isOpen])

  /**
   * Navigating closes it. `usePathname` and never `useSearchParams`: this is in the root layout,
   * and `useSearchParams` there would drop every prerendered page's client tree out of its static
   * HTML.
   */
  const pathname = usePathname()
  useEffect(() => { close() }, [pathname, close])

  return (
    /*
      Sticky at every width, so `--spacing-bar` / `--spacing-bar-md` are the chrome the showcase's
      height budget and the docs' scroll offsets subtract. Change the bar's height and those move
      with it — they read the same tokens.

      The bar spans the viewport with no bottom rule (the canvas alone separates it); its contents sit in the same
      `max-w-shell` + `main-column` box as `<main>`, so the wordmark lines up with the page's
      left edge and the last icon with its right.

      `print:hidden` takes the chrome out of every printed page — added for the Field Guide.
    */
    <header className="sticky top-0 z-40 bg-canvas print:hidden">
      <div className="main-column mx-auto flex h-bar max-w-shell items-center justify-between gap-8 md:h-bar-md">
        <h1 className="type-display-sm shrink-0">
          <Link href="/" className="text-ink transition-opacity hover:opacity-60">
            {title}
          </Link>
        </h1>

        <button
          ref={toggleBtn}
          type="button"
          className="-mr-2 p-2 text-ink md:hidden"
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-controls="site-nav-panel"
          onClick={() => {
            toggle()
            // Explicit, because Safari on macOS does not move focus to a button on click.
            toggleBtn.current?.focus()
          }}
        >
          <svg
            className="size-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            {isOpen
              ? (
                  <>
                    <path d="M5 5 19 19" />
                    <path d="M19 5 5 19" />
                  </>
                )
              : (
                  <>
                    <path d="M3 7h18" />
                    <path d="M3 17h18" />
                  </>
                )}
          </svg>
        </button>

        {/*
          The panel. Below `md` a full-screen sheet starting under the bar (`top-bar`); from `md`
          up `md:static` returns it to the bar as a row.
        */}
        <div
          id="site-nav-panel"
          className={`fixed inset-x-0 bottom-0 top-bar z-40 flex-col gap-10 overflow-y-auto overscroll-contain bg-canvas px-5 pt-8 pb-10 md:static md:z-auto md:flex-row md:items-center md:gap-8 md:overflow-visible md:p-0 ${
            isOpen ? 'flex' : 'hidden md:flex'
          }`}
        >
          {nav}

          {/*
            Bare glyphs rather than filled circles: a filled container on a page whose only other
            mark is a 1px hairline reads as three buttons demanding attention. `rounded-full` is
            kept for the focus ring's shape — DESIGN.md's one allowed radius, "circular icon
            containers only".
          */}
          <ul className="flex items-center gap-5">
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
                  className="block rounded-full text-muted transition-colors hover:text-ink"
                >
                  <SiteSocialIcon name={link.icon} className="size-5" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </header>
  )
}
