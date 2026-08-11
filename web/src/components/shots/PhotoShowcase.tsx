'use client'

import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'

import { useNavDrawer } from '@/components/NavDrawerContext'
import { SanityPhoto } from '@/components/SanityPhoto'
import { SITE } from '@/content/site'
import { photoRatio } from '@/lib/photo'
import { isModifiedEvent } from '@/lib/showcase'
import type { PhotoProjection } from '@/sanity/queries/photo'

/**
 * One photograph, alone on the page, at the size the viewport allows.
 *
 * The view half of `useShowcase` — that hook owns the route state, this owns the frame and every
 * effect. See it for why the address is `?photo=<id>` and why the navigation is a `pushState`.
 *
 * ## Not a modal, deliberately
 *
 * In-page, inside `<main>`. No `role="dialog"`, no focus trap, no scroll lock, no backdrop. Three
 * reasons, in order of weight: a shared link should render the photograph *as the page* on the
 * server rather than as an overlay above a grid nobody asked to see; the sidebar stays usable, so
 * a visitor who arrived on one photograph can reach the rest of the site; and none of
 * `SiteSidebar`'s drawer machinery has to be duplicated to hold it open. Escape and Back still
 * close it, which is the part of a dialog that people actually expect.
 *
 * The page keeps its own `<h2>` above this, so the heading outline is identical whether the
 * showcase is open or not. The photograph is named three times over, all from the photo document:
 * `alt` on the image, the caption in a `<figcaption>`, and the browser tab.
 *
 * ## Sizing is a bound, not a crop
 *
 * `max-width: --showcase-h × --ar` on a wrapper, with `SanityPhoto` left exactly as it is inside
 * it. That is the load-bearing shape of this: the alternative — putting `max-h-*` and `w-auto` on
 * the image — would pit `w-auto` against the `w-full` `SanityPhoto` emits, and Tailwind v4 resolves
 * conflicting utilities by emitted-CSS order rather than class-list order, so which one won would
 * be luck. The wrapper carries the bound and `w-full` keeps doing its job.
 *
 * No `crop`, no `CROPS` entry and no new srcset ladder. The showcase is the largest rendering on
 * the site, which makes the existing uncropped ladder exactly right: its top rung is the asset's
 * own width, so a 2x laptop gets the real file rather than an upscale of it.
 */
const CONTROL
  = 'type-body-sm-strong uppercase tracking-[0.1em] text-muted transition-colors hover:text-ink'

export function PhotoShowcase({
  photo,
  pending,
  closeHref,
  previousHref,
  nextHref,
  onNavigate,
  onClose,
}: {
  /** The photograph, or `null` when the id in the URL resolves to nothing. */
  photo: PhotoProjection | null
  /**
   * A lookup for this id is still in flight, so `photo` being null does not yet mean anything.
   *
   * Only `/shots/all` ever passes it — a gallery has all its photographs in memory and resolves
   * the id with a `find`, so there is nothing to wait for. Without it the index announced a
   * deep-linked photograph as missing for as long as the request took, and then showed it.
   */
  pending?: boolean
  closeHref: string
  previousHref: string | null
  nextHref: string | null
  /** Go to a neighbouring photograph's address — a `pushState`, like a tile click. */
  onNavigate: (href: string) => void
  /** Drop `photo` from the address — a `replaceState`. */
  onClose: () => void
}) {
  const ratio = photo ? photoRatio(photo) : 1.5
  const frame = useRef<HTMLDivElement>(null)

  /**
   * The rendered width is `min(column, budget × ratio)`, and on this page — uniquely — that is a
   * function of the photograph's own shape: a 3:2 landscape renders around 1030px wide where a 2:3
   * portrait renders around 460px. Every other call site can state one hint because the box does
   * not move; here a single landscape-shaped hint would hand every portrait roughly twice the
   * pixels the layout can show, on the one page showing exactly one photograph and the one moment
   * a visitor is waiting for it.
   *
   * 1088px is the widest the main column gets: `--container-shell` 90rem, less
   * `--container-sidebar` 15rem, less two 3.5rem `xl` gutters. Re-derive it if the shell changes.
   *
   * `78vh` approximates `--showcase-h` rather than restating it. `sizes` only picks a rung from a
   * five-rung ladder, so being a little out lands on the same rung nearly always — and `vh` against
   * `dvh` over-asks slightly, which is the safe direction to be wrong in.
   */
  const sizes
    = `(min-width: 1024px) min(1088px, calc(78vh * ${ratio})), min(100vw, calc(78vh * ${ratio}))`

  /**
   * The keyboard.
   *
   * The listener is here rather than in `useShowcase` for `useNavDrawer`'s stated reason: an effect
   * in a hook called from two places registers two listeners. This component is the single owner
   * of the element, so it is the single owner of the effect.
   *
   * It defers to the nav drawer. On a phone the drawer can be open over an `inert` `<main>`, and an
   * Escape then means "close the menu" — the thing on top wins, and without this both would close
   * at once and the visitor would lose the photograph they were looking at as well.
   */
  const { isOpen: navOpen } = useNavDrawer()

  useEffect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      if (navOpen) return

      if (event.key === 'Escape') {
        onClose()
        return
      }

      // Modified presses belong to the platform, and one of them is a direct collision: Cmd+Arrow
      // (macOS) and Alt+Arrow (Windows/Linux) are Back and Forward in every browser, so without
      // this a visitor pressing Cmd+Left would go back *and* push a new showcase entry in one
      // keystroke — leaving history pointing somewhere neither of them asked for. Ctrl and Shift
      // are spoken for by the OS and by assistive tech. Escape above is unmodified either way, so
      // it is deliberately checked before this.
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return

      // Arrow keys move through the loaded set. Guarded on the same nulls the controls are, so the
      // keyboard cannot reach a photograph the controls say is not there.
      if (event.key === 'ArrowLeft' && previousHref) onNavigate(previousHref)
      if (event.key === 'ArrowRight' && nextHref) onNavigate(nextHref)
    }

    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [navOpen, onClose, onNavigate, previousHref, nextHref])

  /**
   * Focus in on mount, and back to the originating tile on the way out.
   *
   * The tile is found by *id* rather than by a saved element reference, because the grid is
   * re-rendered by the same state change that unmounts this — the node that was clicked no longer
   * exists, and the one replacing it is a different object. `PhotoLink` stamps `data-showcase-id`
   * for exactly this lookup.
   *
   * `requestAnimationFrame` in the cleanup, because the tiles are created by the render that
   * follows this unmount: a synchronous `focus()` here would run against a document that does not
   * hold them yet. The page heading is the fallback for the deep-linked case, where the visitor
   * never had a tile to come from; both pages give theirs `tabIndex={-1}` so it can receive focus
   * without entering the tab order.
   */
  const photoIdRef = useRef<string | null>(null)
  photoIdRef.current = photo?._id ?? null

  useEffect(() => {
    frame.current?.focus()

    return () => {
      const id = photoIdRef.current
      requestAnimationFrame(() => {
        const tile = id
          ? document.querySelector<HTMLElement>(`[data-showcase-id="${CSS.escape(id)}"]`)
          : null
        ;(tile ?? document.querySelector<HTMLElement>('main h2'))?.focus()
      })
    }
  }, [])

  /**
   * The tab title follows the photograph.
   *
   * `generateMetadata` covers the server-rendered case — a shared link, which is what the title is
   * actually for — but a `pushState` open runs no server render, so this is the client half. The
   * previous title is restored on close rather than recomputed, so the page's own title survives
   * without this component knowing what it was.
   */
  useEffect(() => {
    if (!photo) return
    const previous = document.title
    document.title = `${photo.caption || photo.alt} · ${SITE.title}`
    return () => {
      document.title = previous
    }
  }, [photo])

  const control = (href: string, label: string, replace: boolean) => (
    <a
      href={href}
      className={CONTROL}
      onClick={(event) => {
        if (event.defaultPrevented || isModifiedEvent(event)) return
        event.preventDefault()
        if (replace) onClose()
        else onNavigate(href)
      }}
    >
      {label}
    </a>
  )

  return (
    /*
      `tabIndex={-1}` makes this focusable programmatically without putting it in the tab order,
      which is what a container that is being focused *for* the visitor wants. `outline-none`
      because the focus is ours rather than theirs — the photograph is plainly the subject of the
      page, and a ring around the whole viewport would say nothing. Keyboard focus on the controls
      below is untouched.
    */
    <div
      ref={frame}
      tabIndex={-1}
      style={{ '--ar': ratio } as CSSProperties}
      className="showcase-frame space-y-6 outline-none"
    >
      {photo
        ? (
            <>
              {/*
                `--ar` is the photograph's own shape, read from the asset; `showcase-frame` supplies
                `--showcase-h`. Both are set on the container above rather than here, because custom
                properties inherit and the controls below need the same width to line up with the
                photograph. Between them the figure is at most as tall as the budget and at most as
                wide as the column, with the ratio intact either way. `w-full` so a photograph
                narrower than the column still starts from the column and shrinks to fit.
              */}
              <figure className="mx-auto w-full max-w-[calc(var(--showcase-h)*var(--ar))]">
                <SanityPhoto photo={photo} sizes={sizes} priority />

                {photo.caption && (
                  <figcaption className="type-caption mt-3 text-muted">{photo.caption}</figcaption>
                )}
              </figure>

              {/*
                Links, not buttons, for `FilterBar`'s reason: the state is in the URL, so each
                control is a real address that can be middle-clicked, bookmarked and followed
                without JavaScript. The arrow keys in the effect above do the same navigations.

                Previous and next are absent rather than disabled when there is nowhere to go. A
                disabled control at the end of a gallery is a promise the page cannot keep, and on
                the index a deep-linked photograph outside the loaded set genuinely has no
                neighbours to offer.
              */}
              <nav
                aria-label="Photo"
                className="mx-auto flex max-w-[calc(var(--showcase-h)*var(--ar))] items-center justify-between gap-4"
              >
                {previousHref ? control(previousHref, '← Previous', false) : <span />}
                {control(closeHref, 'Close', true)}
                {nextHref ? control(nextHref, 'Next →', false) : <span />}
              </nav>
            </>
          )
        : !pending && (
            /*
              A `?photo=` naming nothing — a mistyped id, a deleted photograph, or one she has
              hidden from the index. **Deliberately not `notFound()`**: this is a query parameter,
              and letting one replace a working gallery with an error screen would be a much worse
              failure than the one it reports. Same register as the gallery page's "No photos here
              yet."

              Gated on `!pending`, so this is a verdict and not a guess: while a lookup is still
              out, nothing is claimed. The page keeps its heading and filter row either way, so the
              waiting state is a gap rather than a blank screen.
            */
            <div className="max-w-read space-y-4">
              <p className="type-body-serif-lg text-muted">
                That photo is not here — it may have been removed.
              </p>
              <a
                href={closeHref}
                className="type-body-sm-strong uppercase tracking-[0.1em] text-ink underline"
                onClick={(event) => {
                  if (event.defaultPrevented || isModifiedEvent(event)) return
                  event.preventDefault()
                  onClose()
                }}
              >
                Back to the photos
              </a>
            </div>
          )}
    </div>
  )
}
