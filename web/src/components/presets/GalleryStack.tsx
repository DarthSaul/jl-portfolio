import { SanityPhoto } from '@/components/SanityPhoto'

import type { GalleryPresetProps } from './types'

/**
 * The `stack` preset — "one photo at a time, down the page".
 *
 * RULE 2. The second of the two components `LAYOUT_PRESETS` points at. She picks the photos, the
 * order and this; nothing here is settable per photograph.
 *
 * Where `GalleryGrid` packs rows and lets shape decide width, this gives every photograph the full
 * reading measure and lets it be as tall as it is. That is the whole difference, and it is the
 * reason both exist: a set of portraits reads badly in rows and well in a column, and a set of
 * landscapes the other way round. She can try one, look, and switch.
 *
 * `max-w-read` rather than the full column width, and this is the one thing worth arguing about. A
 * photograph at 1120px is a lot of photograph, and a stack of them is a lot of scrolling; the
 * reading measure keeps a stacked gallery feeling like a sequence rather than a slideshow. It is a
 * property of the preset, not of any photograph, so it stays here.
 *
 * Captions render, and always have. The grid can now show them too — see the note there — so this
 * is no longer the difference between the two presets, only the place a caption has the most room:
 * at the foot of a full-measure photograph rather than in a packed column.
 *
 * It takes the same `renderPhoto` `GalleryGrid` does, and that identity is load-bearing rather
 * than tidy: `GalleryView` hands one render prop to `PRESETS[preset]`, so a stack gallery whose
 * photographs were not clickable would be the silent failure. `GalleryPresetProps` is what makes
 * the two agree by construction — see `./types`.
 */
const SIZES = '(min-width: 768px) 750px, 92vw'

export function GalleryStack({ photos, renderPhoto }: GalleryPresetProps) {
  return (
    <ul className="max-w-read space-y-16">
      {photos.map((photo, index) => (
        <li key={photo._id}>
          <figure>
            {/*
              `renderPhoto` wraps the photograph only, never the `<figure>`: the caption belongs
              outside whatever the caller puts around the image.
            */}
            {renderPhoto
              ? renderPhoto({ photo, index, sizes: SIZES })
              : <SanityPhoto photo={photo} sizes={SIZES} />}

            {photo.caption && (
              <figcaption className="type-caption mt-3 text-muted">{photo.caption}</figcaption>
            )}
          </figure>
        </li>
      ))}
    </ul>
  )
}
