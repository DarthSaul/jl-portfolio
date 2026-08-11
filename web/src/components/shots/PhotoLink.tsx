'use client'

import { SanityPhoto } from '@/components/SanityPhoto'
import { isModifiedEvent } from '@/lib/showcase'
import type { PhotoProjection } from '@/sanity/queries/photo'

/**
 * One clickable photograph in a grid — the wrapper both `/shots/*` views drop into a preset's
 * `renderPhoto`.
 *
 * ## A real anchor with an intercepted left-click
 *
 * `href` is the genuine address of the showcase, so middle-click and Cmd-click open a tab the
 * server renders correctly, the link is copyable, and before hydration it simply navigates. Only
 * an unmodified left-click is taken over, to make the navigation a `pushState` — see `useShowcase`
 * for why that matters here.
 *
 * **Deliberately not `next/link`.** Next prefetches links as they enter the viewport, and these
 * routes are dynamic, so 200 tiles would mean 200 RSC renders of the same page as the visitor
 * scrolls. A plain `<a>` prefetches nothing.
 *
 * `data-showcase-id` exists for one reason: `PhotoShowcase` restores focus to the tile that opened
 * it, and by then the original node is gone — the grid is re-rendered by the same state change
 * that unmounts the showcase, so a saved element reference would point at a detached node. The
 * lookup is by id.
 */
export function PhotoLink({
  photo,
  href,
  sizes,
  onOpen,
}: {
  photo: PhotoProjection
  href: string
  sizes: string
  onOpen: (id: string) => void
}) {
  return (
    <a
      href={href}
      data-showcase-id={photo._id}
      aria-label={`View ${photo.alt}`}
      className="block transition-opacity hover:opacity-85"
      onClick={(event) => {
        if (event.defaultPrevented || isModifiedEvent(event)) return
        event.preventDefault()
        onOpen(photo._id)
      }}
    >
      <SanityPhoto photo={photo} sizes={sizes} />
    </a>
  )
}
