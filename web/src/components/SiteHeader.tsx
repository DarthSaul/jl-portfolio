'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

import { SITE } from '@/content/site'
// Type-only, so erased: the server-only loader never reaches this client module.
import type { SiteSettings } from '@/sanity/siteSettings'

import { useNavDrawer } from './NavDrawerContext'
import { SiteSocialIcon } from './SiteSocialIcon'

/**
 * The site's masthead: her name and byline on the left; the menu (Featured, Images, Copy, Bio)
 * and three icon links (Instagram, Substack, email) on the right. Below `md` the menu and icons collapse into a
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
 * The wordmark is outside the panel, in the masthead itself, so it is always present and always the
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
 * created on the server and passed through already rendered. `title` and `byline` arrive the same
 * way, from `getSiteSettings()` in the layout. This file never touches Sanity.
 */
export function SiteHeader({ nav, title, titleSize, byline }: {
  nav: ReactNode
  title: string
  titleSize: SiteSettings['titleSize']
  byline: string
}) {
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
   * (see `MainColumn`), and so is the wordmark the sheet covers, so the only tabbable things left
   * are the toggle and the drawer's own links.
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
      A masthead, not a bar: it scrolls away with the page. Nothing in the chrome is sticky, so
      nothing else subtracts a bar height — except `showcase-frame`, which opens scrolled to the
      top with the masthead above it and reads `--spacing-masthead(-md)` for that.

      Her name and the byline stack on the left; the menu and icons sit bottom-right, over a 1px
      ink rule — the mockup's masthead. `items-baseline-last` (`align-items: last baseline`) puts
      the menu's text on the byline's baseline, so the byline and the menu read as one row; a
      bottom edge (`items-end`) would not, as the menu's underline padding lifts its text. Contents sit in the
      same `max-w-shell` + `main-column` box as `<main>`, so the rule and the page share edges.

      `print:hidden` takes the chrome out of every printed page — added for the Field Guide.
    */
    <header className="print:hidden">
      <div className="main-column mx-auto max-w-shell">
        <div className="flex items-start justify-between gap-x-8 gap-y-5 border-b border-hairline pt-6 pb-4 md:flex-wrap md:items-baseline-last md:pt-9 md:pb-[22px]">
          {/*
            `inert` while the drawer is open: the full-screen sheet covers the wordmark on a
            phone, and a hidden link should not take focus. The drawer only opens below `md`.
          */}
          <div className="flex min-w-0 flex-col gap-1.5" inert={isOpen}>
            {/* `data-size` is her `siteSettings.titleSize`; `type-wordmark` maps it to a size. */}
            <h1 className="type-wordmark" data-size={titleSize}>
              <Link href="/" className="text-ink transition-colors hover:text-accent">
                {title}
              </Link>
            </h1>
            {/* As she typed it — no `uppercase`; the italic is the token's. */}
            <p className="type-tagline text-muted">{byline}</p>
          </div>

          {/*
            `relative z-50` lifts the toggle above the open drawer (`z-40`), so the same button
            closes it. The masthead is not sticky, but the toggle is on screen whenever it can be
            clicked, and the scroll lock keeps it there while the drawer is open.
          */}
          <button
            ref={toggleBtn}
            type="button"
            className="relative z-50 -mr-2 mt-1 p-2 text-ink md:hidden"
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
            The panel. Below `md` a full-screen sheet (`inset-0`) under the toggle; its top
            padding clears the masthead. From `md` up `md:static` returns it to the masthead as a
            row, its text on the byline's baseline. The panel aligns on its last baseline so the
            menu's text carries it outward; the icons opt out (`self-center`) — glyphs have no
            baseline, and their box bottom would otherwise stand in for one.
          */}
          <div
            id="site-nav-panel"
            className={`fixed inset-0 z-40 flex-col gap-10 overflow-y-auto overscroll-contain bg-canvas px-5 pt-36 pb-10 md:static md:z-auto md:flex-row md:items-baseline-last md:gap-8 md:overflow-visible md:p-0 ${
              isOpen ? 'flex' : 'hidden md:flex'
            }`}
          >
            {nav}

            {/*
              Bare glyphs rather than filled circles: a filled container on a page whose only other
              mark is a 1px hairline reads as three buttons demanding attention. `rounded-full` is
              kept for the focus ring's shape — one of the two `rounded-full` exceptions (the other
              is the Instagram strip's Follow pill).
            */}
            <ul className="flex items-center gap-5 md:self-center">
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
      </div>
    </header>
  )
}
