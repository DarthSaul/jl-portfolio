'use client'

import type { ComponentType } from 'react'

import { GalleryGrid } from '@/components/presets/GalleryGrid'
import { GalleryStack } from '@/components/presets/GalleryStack'
import type { GalleryPresetProps } from '@/components/presets/types'
import type { GALLERY_QUERY_RESULT } from '~~/sanity.types'

import { PhotoLink } from './PhotoLink'
import { PhotoShowcase } from './PhotoShowcase'
import { useShowcase } from './useShowcase'

type Gallery = NonNullable<GALLERY_QUERY_RESULT>

/**
 * One gallery, rendered through its preset, with the showcase over it.
 *
 * A Client Component because the showcase is: `?photo=` moves by `pushState` and is read with
 * `useSearchParams`, and the keyboard, focus and scroll effects all need a browser. The page above
 * stays a Server Component and hands the resolved photographs down — so the gallery's data still
 * comes from one server request and nothing here fetches.
 *
 * ## `PRESETS` is RULE 2's enforcement point
 *
 * The gallery schema's `LAYOUT_PRESETS` is a fixed `options.list`, never a free-text field, and the
 * pair has to stay in step: **a preset value with no component must be impossible.** The
 * `satisfies` below is what makes that a typecheck failure rather than a convention. Adding a
 * preset is two changes, always together — a component in `components/presets/`, and a value in the
 * schema list — and this map is where forgetting either one is caught.
 *
 * It is typed against `GalleryPresetProps` rather than `unknown`, which is stricter than the Vue
 * version managed: the map now guarantees not just that a component exists for every preset but
 * that it takes the same `photos` and `renderPhoto`. A preset that quietly did not accept
 * `renderPhoto` would render a gallery whose photographs are not clickable — a silent failure, and
 * exactly the kind this guard is for.
 *
 * ## Why the showcase needs no second query here
 *
 * `GALLERY_QUERY` returns the whole array, so the id in `?photo=` always resolves with a `find`.
 * `/shots/all` pages, so it can be sent an id it has not loaded and needs a fallback; this cannot.
 * That is the whole difference between the two views.
 */
const PRESETS = {
  grid: GalleryGrid,
  stack: GalleryStack,
} satisfies Record<Gallery['preset'], ComponentType<GalleryPresetProps>>

export function GalleryView({
  title,
  preset,
  photos,
}: {
  title: string
  preset: Gallery['preset']
  photos: NonNullable<Gallery['photos']>
}) {
  const showcase = useShowcase(photos)
  const Preset = PRESETS[preset]

  return (
    <>
      {/*
        The heading stays above the showcase, so the outline and the way back are the same whether
        one photograph is open or all of them are. `tabIndex={-1}` is where focus lands when the
        showcase closes and the tile that opened it cannot be found — a deep link, most often.
      */}
      <h2 tabIndex={-1} className="type-display-lg text-ink outline-none">
        {title}
      </h2>

      {showcase.isOpen
        ? (
            <PhotoShowcase
              photo={showcase.inList}
              closeHref={showcase.closeHref}
              previousHref={showcase.previous ? showcase.openHref(showcase.previous._id) : null}
              nextHref={showcase.next ? showcase.openHref(showcase.next._id) : null}
              onNavigate={showcase.pushTo}
              onClose={showcase.close}
            />
          )
        : photos.length
          ? (
              <Preset
                photos={photos}
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
              /*
                A real and legitimate state: she can create a gallery, point it at a tag, and tag
                the photographs later. It is also what a mistyped tag looks like, and the two are
                indistinguishable from here — if that ever bites, the fix is a warning on
                `gallery.tag` in the Studio rather than anything on this page. See CLAUDE.md.
              */
              <p className="type-body-serif-lg max-w-read text-muted">No photos here yet.</p>
            )}
    </>
  )
}
