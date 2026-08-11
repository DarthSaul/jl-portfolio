'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { GalleryGrid } from '@/components/presets/GalleryGrid'
import type { PhotoProjection } from '@/sanity/queries/photo'
import type { TagOption } from '@/sanity/queries/allShots'

import { FilterBar } from './FilterBar'
import { PhotoLink } from './PhotoLink'
import { PhotoShowcase } from './PhotoShowcase'
import { useShowcase } from './useShowcase'

const EMPTY: PhotoProjection[] = []

/**
 * /shots/all — every photograph she has uploaded, minus the ones she has hidden.
 *
 * The client half. The page above owns `searchParams`, the first page, the tag list and the
 * deep-link lookup; this owns everything that needs a browser: paging, the observer, and the
 * showcase.
 *
 * ## Paging, and what infinite scroll costs
 *
 * Photographs load as you reach the bottom. That was chosen over numbered pages knowing the three
 * things it gives up, and two of them are dealt with here:
 *
 * - **Reaching the end of the page.** Normally infinite scroll strands whatever sits below it. Here
 *   it strands nothing: the copyright and social links live in the sticky sidebar, not in a footer
 *   at the end of `<main>`, so they stay reachable at any scroll depth. This is the layout paying
 *   off rather than anything done here.
 * - **Announcing that content appeared.** A `role="status"` region reports the running count, so a
 *   screen reader hears "Showing 48 of 187 photos" instead of nothing. The Load more button below
 *   it is not decoration either: `IntersectionObserver` only fires on scroll, and a keyboard user
 *   tabbing through the grid never triggers it. The button is how they page.
 * - **The URL no longer describes the view, and that one stands.** The *filter* is in the query
 *   string and is shareable; how far you scrolled is not, so a refresh returns you to the first
 *   batch. Recording depth in the URL was considered and dropped: restoring it means fetching every
 *   photo up to that point in one request, which is the cost this page exists to avoid.
 *
 * ## What keeps ~200 photographs cheap
 *
 * The document count is not the expensive part — the LQIP is. Every projected photo carries a
 * base64 placeholder of roughly a kilobyte, so the whole set is ~200 kB of JSON before a single
 * image is requested. So: one page of documents per request via a GROQ slice; the paging endpoint
 * fetches only the new slice and this appends, rather than re-fetching from zero; the grid runs
 * `compact`, which halves the requested pixel width per tile; and `SanityPhoto` already lazy-loads
 * everything below the fold and paints the LQIP while it waits.
 */
export function AllShotsView({
  initialPhotos,
  total,
  tagsInUse,
  activeTags,
  filterKey,
  deepLinked,
}: {
  initialPhotos: PhotoProjection[]
  total: number
  tagsInUse: TagOption[]
  activeTags: string[]
  /** The active tags as one string, so a filter change is a change of value rather than identity. */
  filterKey: string
  /** A photograph named by `?photo=` that is not in the first page. Resolved on the server. */
  deepLinked: PhotoProjection | null
}) {
  /**
   * Everything fetched *after* the first page, keyed by the filter it belongs to.
   *
   * The key is what collapses the Nuxt version's two separate mechanisms — a watcher that emptied
   * the accumulator on a filter change, and an in-flight guard comparing the tag key when a
   * response landed — into one invariant: **an accumulator whose key does not match the current
   * filter is not this filter's.**
   *
   * A `?tag=` change is a real `<Link>` navigation, so the server re-renders and `filterKey` and
   * `initialPhotos` both change; `appended` empties without any effect running, so there is no
   * frame in which the previous filter's photographs sit underneath the new first page.
   *
   * A `?photo=` change is a `pushState`, so the server does *not* re-render and this survives
   * untouched. That is the property the whole showcase design rests on — see `useShowcase`.
   *
   * The blunt alternative, keying the whole component on the filter from the server, also works and
   * is one line. It is wrong for a specific reason: it remounts the `role="status"` region, and a
   * live region created in the same commit as its first content is not announced by most screen
   * readers.
   */
  const [acc, setAcc] = useState<{ key: string, photos: PhotoProjection[] }>({
    key: filterKey,
    photos: EMPTY,
  })
  const appended = acc.key === filterKey ? acc.photos : EMPTY

  const photos = useMemo(() => [...initialPhotos, ...appended], [initialPhotos, appended])
  const hasMore = photos.length < total

  const [loading, setLoading] = useState(false)

  const loadMore = useCallback(async () => {
    // `hasMore` and `loading` are both load-bearing: the observer fires repeatedly while the
    // sentinel is in view, and without the guard a single scroll would launch several overlapping
    // requests for the same slice.
    if (loading || !hasMore) return
    setLoading(true)

    try {
      const offset = photos.length
      const params = new URLSearchParams()
      for (const tag of activeTags) params.append('tag', tag)
      params.set('offset', String(offset))

      const response = await fetch(`/api/photos?${params.toString()}`)
      const next = (await response.json()) as PhotoProjection[]

      /*
        The filter is re-checked at commit time rather than compared to a value captured when the
        request started. A response that outlived its filter finds a state whose own key no longer
        matches and is dropped — one comparison instead of the Nuxt version's two, and it cannot go
        stale because the state is the thing being compared.
      */
      setAcc(prev => (prev.key === filterKey ? { key: prev.key, photos: [...prev.photos, ...next] } : prev))
    }
    catch {
      // Swallowed deliberately, like the nav's. A failed *extra* page leaves the photographs
      // already on screen intact and the button available to try again; throwing would replace a
      // working page with an error screen over content the visitor is not waiting for.
    }
    finally {
      setLoading(false)
    }
  }, [loading, hasMore, photos.length, activeTags, filterKey])

  /**
   * The sentinel, watched by a callback ref rather than attached once on mount.
   *
   * It sits inside the branch that is hidden while the showcase is open, so opening a photograph
   * destroys this element and closing it creates a different one. An observer attached at mount
   * would afterwards be holding a detached node, and infinite scroll would silently stop working
   * for the rest of the session — silently being the problem, since the Load more button keeps
   * working and nothing looks broken. React 19 lets a ref callback return its own cleanup, which is
   * the exact analogue of Vue's `watch(templateRef, (el, _prev, onCleanup) => …)`.
   *
   * **Two things here are load-bearing.** `useCallback([])` gives the ref a stable identity: a
   * fresh function each render makes React detach and re-attach the ref every render, re-creating
   * the observer each time. And because the identity is stable it cannot close over a fresh
   * `loadMore`, hence the ref indirection — without it the observer would call the first render's
   * `loadMore` forever, with `photos.length` frozen at zero.
   *
   * `rootMargin` starts the fetch while the sentinel is still 800px below the fold, so the next
   * batch is usually in place before the visitor reaches the end of the current one.
   */
  const loadMoreRef = useRef(loadMore)
  useEffect(() => {
    loadMoreRef.current = loadMore
  })

  const sentinelRef = useCallback((node: HTMLElement | null) => {
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMoreRef.current()
      },
      { rootMargin: '800px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  /**
   * Scrolling back to the top on a filter change is the point of the filter — landing halfway down
   * a different set of photographs reads as the page having broken.
   *
   * A `<Link>` navigation scrolls to top on its own, so this covers the case where it does not:
   * arriving with the same pathname and a changed query. It is skipped on first render, which is
   * what the ref is for — a deep link that also carries `?photo=` must not be yanked to the top
   * before `useShowcase` has saved its position.
   */
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    window.scrollTo({ top: 0 })
  }, [filterKey])

  /**
   * The showcase — one photograph, alone, at `?photo=<_id>`.
   *
   * ## Why this page needs a lookup and `/shots/<slug>` does not
   *
   * A gallery is unpaged, so its photographs are all in memory and the id always resolves out of
   * the array. This page holds 24 at a time out of a set that will be ~250, so a link someone
   * shared can name a photograph nobody on this device has scrolled to.
   *
   * The server resolves that case for a hard load — `deepLinked` — so a shared link paints the
   * photograph in the server HTML and costs no client request. This effect covers the other one: a
   * `pushState` open of an id that is not in the loaded list, which cannot happen from a tile
   * (those are all loaded) but can happen from Back and Forward across a filter change.
   *
   * The `fetched` map replaces the Nuxt version's single id-plus-comparison. A map cannot show the
   * previous photograph under the new address, which is the bug that comparison existed to prevent.
   */
  const showcase = useShowcase(photos)

  const [fetched, setFetched] = useState<Record<string, PhotoProjection | null>>(() =>
    deepLinked ? { [deepLinked._id]: deepLinked } : {},
  )
  const [pendingId, setPendingId] = useState<string | null>(null)

  const { photoId, inList } = showcase

  useEffect(() => {
    if (!photoId || inList || photoId in fetched) return

    let cancelled = false
    setPendingId(photoId)

    /*
      **Only a request that actually answered gets written to `fetched`.** The failure path
      clears `pendingId` and records nothing, so the lookup runs again if the visitor comes back
      to this id.

      The shape this replaces had `.catch(() => null)` *before* the write, which turned a dropped
      connection, a 500 or a malformed body into an entry meaning "no such photograph". The
      `photoId in fetched` guard above then blocked every retry for the rest of the session, and
      the showcase announced "That photo is not here — it may have been removed." about a
      photograph that exists. That is this project's oldest bug wearing new clothes: a request
      that did not happen must never look like a query that found nothing. `orThrow` makes the
      server side of that structural; this is the client side, and it has to be written by hand.

      One honest limit: `/api/photos/[id]` answers `null` on its *own* transport failure, so a
      Sanity outage still reaches here as a well-formed "not found". Fixing that means the route
      distinguishing the two in its status code, which is a change to a public endpoint's
      contract and out of scope for this.
    */
    fetch(`/api/photos/${encodeURIComponent(photoId)}`)
      .then((response) => {
        if (!response.ok) throw new Error(`/api/photos/${photoId} responded ${response.status}`)
        return response.json() as Promise<PhotoProjection | null>
      })
      .then((photo) => {
        if (cancelled) return
        setFetched(prev => ({ ...prev, [photoId]: photo }))
        setPendingId(current => (current === photoId ? null : current))
      })
      .catch(() => {
        if (cancelled) return
        setPendingId(current => (current === photoId ? null : current))
      })

    return () => {
      cancelled = true
    }
  }, [photoId, inList, fetched])

  const showcased = inList ?? (photoId ? fetched[photoId] ?? null : null)

  /**
   * True while a lookup for the id in the URL is still out.
   *
   * Without it the "not here" branch fires the moment a deep link opens — nothing is resolved yet —
   * so a perfectly good photograph announces itself as missing and then appears.
   */
  const showcasePending = Boolean(photoId) && !inList && pendingId === photoId

  return (
    <div className="space-y-10">
      {/*
        The heading and the filter row stay above the showcase, so the outline and the way back to a
        filtered view are the same whether one photograph is open or all of them are.
        `tabIndex={-1}` on the heading is where focus lands when the showcase closes and the tile
        that opened it cannot be found — a deep link, most often.
      */}
      <header className="max-w-read space-y-6">
        <h2 tabIndex={-1} className="type-display-lg text-ink outline-none">
          All Shots
        </h2>

        <FilterBar tags={tagsInUse} active={activeTags} />
      </header>

      {showcase.isOpen
        ? (
            /*
              Rendered instead of the grid, not over it, so "all other photos hidden" means not
              rendered. Hiding with a class would keep up to 200 `<li>` in the DOM, which is the
              weight the paging exists to bound; the scroll position it collapses is saved and
              restored by `useShowcase`.
            */
            <PhotoShowcase
              photo={showcased}
              pending={showcasePending}
              closeHref={showcase.closeHref}
              previousHref={showcase.previous ? showcase.openHref(showcase.previous._id) : null}
              nextHref={showcase.next ? showcase.openHref(showcase.next._id) : null}
              onNavigate={showcase.pushTo}
              onClose={showcase.close}
            />
          )
        : (
            <>
              {photos.length
                ? (
                    <GalleryGrid
                      photos={photos}
                      compact
                      renderPhoto={({ photo, sizes }) => (
                        <PhotoLink
                          photo={photo}
                          sizes={sizes}
                          href={showcase.openHref(photo._id)}
                          onOpen={showcase.open}
                        />
                      )}
                    />
                  )
                : (
                    <div className="max-w-read space-y-4">
                      <p className="type-body-serif-lg text-muted">No photos here.</p>

                      {/*
                        Only when a filter is what emptied the page. With nothing selected there is
                        nothing to clear, and a "show all shots" link on the unfiltered index would
                        point at the page you are already on.
                      */}
                      {activeTags.length > 0 && (
                        <Link
                          href="/shots/all"
                          prefetch={false}
                          className="type-body-sm-strong inline-block uppercase tracking-[0.1em] text-ink underline"
                        >
                          Show all shots
                        </Link>
                      )}
                    </div>
                  )}

              {/*
                The running count, announced. `role="status"` is an implicit `aria-live="polite"`,
                and the element is in the DOM from the first render — a live region added to the
                page at the moment it first has something to say is not announced by most screen
                readers. That is also why the accumulator is keyed rather than this subtree.
              */}
              <p role="status" className="type-caption text-muted">
                {photos.length > 0
                  && `Showing ${photos.length} of ${total} ${total === 1 ? 'photo' : 'photos'}`}
              </p>

              {/*
                Not behind `hasMore`; `loadMore` already refuses to do anything when there is
                nothing left, so that condition would buy nothing and cost the element the observer
                is watching.
              */}
              <div ref={sentinelRef} aria-hidden="true" />

              {/*
                The keyboard and assistive-tech path to the next batch, and the only one that exists
                before a scroll happens. It is a real control rather than a fallback that appears
                when something fails, because tabbing through a grid never fires a scroll observer.
              */}
              {hasMore && (
                <div>
                  <button
                    type="button"
                    className="type-body-sm-strong border border-ink px-5 py-3 uppercase tracking-[0.1em] text-ink transition-colors hover:bg-ink hover:text-canvas disabled:opacity-50"
                    disabled={loading}
                    onClick={() => void loadMore()}
                  >
                    {loading ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          )}
    </div>
  )
}
