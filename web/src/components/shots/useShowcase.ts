'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import { readPhotoId, showcaseHref, viewKey } from '@/lib/showcase'
import type { PhotoProjection } from '@/sanity/queries/photo'

/**
 * One photograph, alone on the page, at an address someone can send.
 *
 * ## Why it is a query parameter and not a route
 *
 * `?photo=<_id>` on whichever `/shots/*` page you were already on. The obvious alternative is a
 * nested route — `/shots/[slug]/[photo]` — and it is rejected for what it would cost `/shots/all`,
 * which holds two things a route change destroys: `appended`, every photograph loaded past the
 * first page, and the `IntersectionObserver` driving it.
 *
 * The query string composes, too: `?tag=life&photo=X` is a photograph reached from a filtered
 * index, and closing it returns to that filter.
 *
 * ## Why `history.pushState` and not `<Link>`
 *
 * Both `/shots/*` routes are dynamic — they read `searchParams` on the server so a deep link
 * renders the photograph as the page. That makes a `<Link>` to `?photo=X` a **real navigation**:
 * the RSC payload is refetched and the whole first page of `ALL_SHOTS_QUERY` re-runs, on every
 * open *and* every close. On a ~200 kB LQIP payload that is the exact cost the paging exists to
 * avoid, paid on a UI gesture.
 *
 * Native `history.pushState` avoids it entirely. Next patches both `pushState` and `replaceState`,
 * dispatches its restore action, and derives `useSearchParams()` from the new URL — so this
 * re-renders the client tree and spawns **no request**. Back and Forward across those entries stay
 * soft navigations for the same reason. Nuxt got this property as a side effect of keying pages by
 * interpolated path; here it is stated rather than inherited.
 *
 * The one thing it does not do is re-run `generateMetadata`, so the tab title stops following
 * `?photo=` on client-side opens. `PhotoShowcase` sets `document.title` for that case. The deep
 * link — the case this feature is actually for — is a fresh server request and is unaffected, as
 * is `robots: noindex`, which only crawlers read.
 *
 * ## Open pushes, close replaces
 *
 * Opening is a `push`, so Back closes the showcase — which is what a visitor expects from
 * something that filled the page. Closing is a `replace` to the same address minus `photo`, so
 * repeatedly opening and closing does not stack history entries to walk back through.
 *
 * Escape performs the *same navigation* as the close link rather than `history.back()`. That
 * matters for the deep-linked visitor: `back()` would take them off the site, where this takes
 * them to the index they were sent a photograph from.
 *
 * ## What is deliberately not here
 *
 * No fetching. The two pages resolve the id differently — a gallery has all its photographs
 * already and looks the id up in the array it was handed, while the index may need to ask for one
 * it has not paged to — so this owns the *route state* and the views own their data.
 *
 * No keyboard listener either. That belongs to `PhotoShowcase`, the single component that owns the
 * element, for `useNavDrawer`'s stated reason: an effect in a shared hook is registered once per
 * caller.
 */
export function useShowcase(photos: PhotoProjection[]) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const photoId = readPhotoId(searchParams.getAll('photo'))
  const isOpen = photoId !== ''

  /** The photograph in the currently loaded list, or `null` if it is not among them. */
  const inList = useMemo(
    () => (photoId ? photos.find(photo => photo._id === photoId) ?? null : null),
    [photoId, photos],
  )

  const index = useMemo(
    () => (photoId ? photos.findIndex(photo => photo._id === photoId) : -1),
    [photoId, photos],
  )

  /**
   * The photographs either side, within the loaded list.
   *
   * `null` at the ends, and `null` for both when the showcased photograph is not in the list at
   * all — a deep link past the first page of the index. Hiding the controls is the honest answer
   * there: "previous" would have to mean "previous among the 24 you have not loaded", which is not
   * a thing, and guessing would send someone to an unrelated photograph.
   */
  const previous = index > 0 ? photos[index - 1] ?? null : null
  const next = index >= 0 && index < photos.length - 1 ? photos[index + 1] ?? null : null

  const openHref = useCallback(
    (id: string) => showcaseHref(pathname, searchParams, id),
    [pathname, searchParams],
  )
  const closeHref = useMemo(
    () => showcaseHref(pathname, searchParams, null),
    [pathname, searchParams],
  )

  /** Open a photograph by id — what a tile click does. */
  const open = useCallback((id: string) => {
    window.history.pushState(null, '', showcaseHref(pathname, searchParams, id))
  }, [pathname, searchParams])

  /**
   * Go to an address the caller already has — what the showcase's Previous/Next controls do.
   *
   * They hold an `href` rather than an id because they are real anchors whose `href` has to be
   * the same address the click produces; handing the id back would mean building it twice.
   */
  const pushTo = useCallback((href: string) => {
    window.history.pushState(null, '', href)
  }, [])

  const close = useCallback(() => {
    window.history.replaceState(null, '', showcaseHref(pathname, searchParams, null))
  }, [pathname, searchParams])

  /**
   * Where the index was scrolled to when the showcase opened, and what it was showing.
   *
   * The views render the grid behind a conditional, so opening collapses the document and the
   * browser clamps `scrollY` to the new maximum — by the time the showcase closes, the old
   * position is gone, and a `pushState` navigation restores nothing on its own.
   *
   * Vue read `window.scrollY` inside a pre-flush watcher, i.e. before the DOM collapsed. React has
   * no pre-commit hook in a function component, so the position is recorded continuously instead.
   * A passive listener is cheap and, unlike capturing it in the click handler, it is also correct
   * when the showcase is opened by Forward rather than by a click.
   */
  const lastScrollY = useRef(0)
  useEffect(() => {
    const onScroll = () => {
      lastScrollY.current = window.scrollY
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /**
   * **The view is saved alongside the position, and that is not belt-and-braces.** The filter row
   * stays on screen while the showcase is open, and `FilterBar`'s links drop `photo` entirely — so
   * clicking a tag from inside the showcase closes it *and* changes the list underneath in one
   * navigation. Restoring a position measured against the old list would drop the visitor into the
   * middle of a different set of photographs; worse, it would land after `/shots/all`'s own
   * scroll-to-top on a filter change and silently undo it. When the view has moved, the position
   * is not ours to restore and the page's own handling wins.
   *
   * Restoring in an effect is only reliable because `SanityPhoto` reserves every box from the
   * asset's own dimensions: the grid's full height is back in the same commit, without waiting for
   * a single image to decode. That is a decision made elsewhere paying off here, and it is worth
   * knowing before anyone considers making the reservation conditional.
   */
  const currentView = viewKey(searchParams)
  const savedScroll = useRef(0)
  const savedView = useRef('')
  const previousId = useRef(photoId)

  useEffect(() => {
    const before = previousId.current
    previousId.current = photoId

    if (photoId && !before) {
      savedScroll.current = lastScrollY.current
      savedView.current = currentView
      window.scrollTo({ top: 0 })
      return
    }

    if (!photoId && before && currentView === savedView.current) {
      window.scrollTo({ top: savedScroll.current })
    }
  }, [photoId, currentView])

  return {
    photoId,
    isOpen,
    inList,
    index,
    previous,
    next,
    openHref,
    closeHref,
    open,
    pushTo,
    close,
  }
}

export type Showcase = ReturnType<typeof useShowcase>
