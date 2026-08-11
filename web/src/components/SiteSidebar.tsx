'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

import { SITE } from '@/content/site'

import { useNavDrawer } from './NavDrawerContext'
import { SiteSocialIcon } from './SiteSocialIcon'

/**
 * All of the site's chrome: wordmark, byline, nav, social links, copyright.
 *
 * A left-hand column from `lg` up, and a slide-free drawer below it. There is no `SiteHeader` and
 * no `SiteFooter`; this replaced both, and there is no `<footer>` element on the site any more.
 *
 * ## One element, two shapes, and exactly one `<h1>`
 *
 * There is a single `<aside>` in the DOM at every viewport width. Nothing is rendered
 * conditionally on width, because the server cannot know the viewport and any attempt to would
 * be a hydration mismatch rather than a layout.
 *
 * The split that makes that work is between the **header strip**, which is visible at every
 * width, and the **panel**, which is a static block in the column on desktop and a full-screen
 * overlay on a phone. The wordmark lives in the strip.
 *
 * That placement is the whole trick, and the obvious alternative gets it wrong. Put the `<h1>`
 * in the drawer and, on a phone with the nav closed, the drawer is `display: none` — so the
 * wordmark is not merely invisible, it is **out of the accessibility tree, and the page has no
 * level-1 heading at all**. In the strip it is always present, always announced, and the mobile
 * bar needs no second non-heading copy of her name to make up for it.
 *
 * The byline is in the panel rather than the strip, and that is the one thing the arrangement
 * costs: on a phone it is visible only while the nav is open. The alternatives were a second
 * copy of the string (one string, two places — the thing CLAUDE.md's "prefer deleting a knob"
 * instinct is about) or an 80px bar on a 390px screen to hold three words of decoration.
 *
 * ## Two Tailwind v4 traps this markup is shaped around
 *
 * **Conflicting utilities resolve by emitted-CSS order, not class-list order.** So
 * `className={isOpen ? 'fixed' : 'sticky'}` on one element is a coin flip rather than a toggle.
 * Every conditional class below is a `display` pair — `flex flex-col` against `hidden lg:flex` —
 * two branches that never both apply.
 *
 * **The panel is a full-screen opaque overlay**, so there is no backdrop element and no
 * backdrop-click handler. There is nothing behind it to click. If it ever becomes a
 * partial-width drawer, that handler comes back with it.
 *
 * ## Why the nav arrives as a prop
 *
 * `SiteNav` is an async Server Component and this is a Client Component, so this file cannot
 * import it — a client module has no way to await a server one. The root layout renders
 * `<SiteSidebar nav={<SiteNav />} />` instead, which is the ordinary composition escape hatch:
 * the element is created on the server and passed through as an already-rendered child.
 */
export function SiteSidebar({ nav }: { nav: ReactNode }) {
  const { isOpen, close, toggle } = useNavDrawer()
  const toggleBtn = useRef<HTMLButtonElement>(null)

  /**
   * Every effect lives here rather than in `NavDrawerContext`, because the context has three
   * consumers and an effect registered there would be registered once per consumer.
   */

  /**
   * Escape closes from anywhere, including with focus on a nav link inside the drawer — and puts
   * focus back on the toggle. That restoration is the case that actually matters: Escape pressed
   * with focus deep in the nav would otherwise drop focus to the top of a page that has just
   * become interactive again.
   *
   * There is no focus *trap* here and none is needed. `<main>` is `inert` while the drawer is
   * open (see `MainColumn`), and an inert subtree leaves the tab order entirely — so the only
   * tabbable things left are the toggle and the drawer's own links. `inert` is the trap.
   */
  useEffect(() => {
    if (!isOpen) return

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      close()
      toggleBtn.current?.focus()
    }

    /**
     * The drawer and the desktop column are the same element, so crossing the `lg` breakpoint
     * while the drawer is open would leave `isOpen` true against a layout that has no drawer —
     * and `<main>` would stay `inert`, which is to say the desktop page would be silently
     * unclickable. Closing on the crossing is the fix; a resize is not a state we can render our
     * way out of.
     */
    const wide = window.matchMedia('(min-width: 64rem)') // Tailwind's `lg`
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
   * Scroll lock. `overflow-hidden` on `<html>` rather than the `position: fixed` body-lock hack,
   * which loses the scroll position on close and is a well-known source of jank. It does not
   * fully stop iOS Safari rubber-banding; `overscroll-contain` on the panel covers the
   * scroll-chaining half of that, and the remainder is not worth the hack.
   *
   * **The cleanup is load-bearing**, not tidiness: without it a lock could outlive the component
   * that set it and leave the document permanently unscrollable with nothing on screen to say so.
   */
  useEffect(() => {
    if (!isOpen) return
    const root = document.documentElement
    root.classList.add('overflow-hidden')
    return () => root.classList.remove('overflow-hidden')
  }, [isOpen])

  /**
   * Navigating closes it.
   *
   * `usePathname` rather than the full URL, deliberately. `useSearchParams` in a component that
   * lives in the root layout would drop every prerendered page's client tree out of its static
   * HTML, and nothing here needs the query string: the drawer makes `<main>` inert, so no
   * `?photo=` or `?tag=` link is reachable while it is open.
   */
  const pathname = usePathname()
  useEffect(() => { close() }, [pathname, close])

  return (
    /*
      The sidebar sets its own gutter rather than using `main-column`. That utility's `xl` step
      widens to 56px, which is right for a 1120px reading column and would leave this 240px one
      with 128px of usable width.
    */
    <aside className="sticky top-0 z-40 bg-canvas lg:flex lg:h-dvh lg:w-sidebar lg:shrink-0 lg:flex-col lg:self-start lg:overflow-y-auto">
      {/* Always visible, at every width. Holds the site's only level-1 heading. */}
      <div className="flex h-bar shrink-0 items-center justify-between border-b border-hairline px-5 lg:h-auto lg:block lg:border-b-0 lg:px-8 lg:pt-14">
        <h1 className="type-display-sm lg:type-display-md">
          <Link href="/" className="text-ink transition-opacity hover:opacity-60">
            {SITE.title}
          </Link>
        </h1>

        <button
          ref={toggleBtn}
          type="button"
          className="-mr-2 p-2 text-ink lg:hidden"
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-controls="site-nav-panel"
          onClick={() => {
            toggle()
            // Explicit, because Safari on macOS does not move focus to a button on click. The
            // node's identity does not change across the toggle, so this needs no tick to wait
            // for — only its label and `aria-expanded` change.
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
      </div>

      {/*
        The panel. `lg:static` returns it to the column; below that it is a full-screen sheet
        starting under the bar, which is what `top-bar` and `--spacing-bar` are for — one number
        for the bar's height and the sheet's offset.
      */}
      <div
        id="site-nav-panel"
        className={`fixed inset-x-0 bottom-0 top-bar z-40 overflow-y-auto overscroll-contain bg-canvas px-5 pt-8 pb-10 lg:static lg:z-auto lg:mt-4 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-8 lg:pt-0 ${
          isOpen ? 'flex flex-col' : 'hidden lg:flex'
        }`}
      >
        {/*
          `uppercase` is a class rather than part of the type token, deliberately: the tokens
          carry no `text-transform` so that the decision stays visible beside the text it changes.
          `SITE.nav` and this line both depend on that.
        */}
        <p className="type-body-sm uppercase tracking-[0.18em] text-muted">{SITE.tagline}</p>

        <div className="mt-10">{nav}</div>

        {/*
          Her illustrated portrait, and **the second `<img>` in the app** — so the check in
          CLAUDE.md ("grep -rn '<img' web/src finds one tag") now finds two. It is not a hole in
          that rule so much as a case the rule does not reach: the rule routes *photographs*
          through `SanityPhoto` for srcset, LQIP and alt-from-the-document, and all three of those
          need a Sanity asset. This is a static file in `web/public/`, in the same category as
          `SiteSocialIcon`'s hand-written glyphs — chrome that ships with the code, not content
          she edits. Teaching `SanityPhoto` to also swallow bare URLs was considered and rejected
          once already, for putting a permanent hole in the rule to serve a single call site.

          It is deliberately not `next/image` either. That would route a static asset through
          Vercel's optimiser to re-derive what the file already is, and add a second image
          pipeline beside the Sanity CDN one — two ways to render a picture where the whole point
          of `SanityPhoto` is that there is one.

          What that costs, and is paid for by hand here: `width`/`height` reserve the box so
          nothing shifts as it loads, and the `alt` is written at the call site because there is
          no photo document to read one off. Both are things `SanityPhoto` would have done.

          `max-h` rather than a fixed `h`/`w` pair, per CLAUDE.md's bound-vs-crop line — the
          image's own proportions survive, so the cap is the only number decided here and the
          width follows from it: 196×250 renders ~98px wide inside a 176px column.

          **`width`/`height` must be re-measured from the file every time it changes, not carried
          over.** They have been wrong once already — they said 1254×1254 against an 848×1082
          file, because the image was swapped and the old square was assumed rather than checked.
          A stale pair reserves the wrong box and shifts the socials and the copyright as the
          portrait loads, and nothing errors to say so.

          The file is stored at 250px on its long side, twice the cap, so it is sharp on a 2×
          screen and not a pixel wider. Nothing in `web/public/` is processed at build time — no
          srcset, no format negotiation, no resizing — so the file on disk is exactly what every
          visitor downloads, and it is the only place that size can be decided. Raising the cap
          means re-exporting the source, not editing this line. Resize with `sips -Z 250`, which
          fits within the bound; lowercase `-z` takes an exact width and height and will happily
          squash the picture to reach them.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div className="mt-12 lg:mt-auto lg:pt-12">
          <img
            src="/joan-animated.png"
            alt="Illustrated portrait of Joan Lebow"
            width={196}
            height={250}
            className="max-h-[125px] w-auto"
          />
        </div>

        {/*
          Bare glyphs rather than filled circles. `{rounded.full}` is the one radius DESIGN.md
          allows and it scopes it to "circular icon containers only" — but a filled container on a
          page whose only other mark is a 1px hairline reads as four buttons demanding attention,
          so the shape is kept for the hit area and the fill is not drawn.
        */}
        <ul className="mt-6 flex items-center gap-5">
          {SITE.social.map(link => (
            <li key={link.href}>
              {/*
                Icon-only, so `aria-label` is the only name a screen reader gets. `mail` opens a
                mail client rather than a tab, which is why it alone is exempt from the
                target/rel pair.
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

        <div className="type-caption mt-6 text-muted lg:pb-10">
          <p className="mb-2">{SITE.copyright}</p>
          <p>{SITE.credit}</p>
        </div>
      </div>
    </aside>
  )
}
