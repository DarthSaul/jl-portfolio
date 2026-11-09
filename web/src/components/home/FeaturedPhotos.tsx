import Link from 'next/link'

import { SanityPhoto } from '@/components/SanityPhoto'
import type { HOME_QUERY_RESULT } from '~~/sanity.types'

type Home = NonNullable<HOME_QUERY_RESULT>

/**
 * The featured photographs, as equal square cards — three across from `md` up, two on a phone.
 * Six (the recommended count) make two even rows of three. It opens the front page.
 *
 * ## A crop, and the Rule 2 decision behind it
 *
 * Every card is the same size, so a photograph is cropped to fit its card: `crop="square"`, the
 * existing `CROPS` entry, centred. This used to be the `grid` preset in a fixed-rows mode, where
 * each photograph kept its own ratio and the row heights fell out of the maths; the top-nav
 * redesign asked for a uniform grid of equal cards instead, with cropping accepted explicitly.
 *
 * What keeps it inside Rule 2 is the same thing that keeps the /copy ledger thumbnail inside it:
 * the shape is fixed by its `CROPS` entry, the crop is always centred, and she has no control over
 * it — no knob in the Studio, none at the call site. **The cost lands on her**: with no hotspot, a
 * subject near the edge of a photograph can be cropped out, and her remedy is picking a different
 * photograph for the slot. If that starts to bite, the conversation is `hotspot` on `photo.image`.
 *
 * This is the front page only. Gallery pages keep their uncropped presets.
 *
 * Any count works — CSS grid fills row by row, so five cards are 3 + 2 with the gap on the right,
 * and nothing about the page breaks.
 *
 * ## The links
 *
 * A featured slot optionally points at a gallery, resolved from that gallery's own slug at query
 * time — see `objects/featuredPhoto.ts`. A slot with no gallery renders an unlinked photograph.
 *
 * The photograph is the whole hit area and the only one. `aria-label` carries the destination,
 * because a link whose only content is an image would otherwise be announced as the photograph's
 * alt text with no hint that it goes anywhere.
 *
 * ## The preview: one photograph becomes four
 *
 * On hover or keyboard focus, a linked card's photograph cross-fades into the gallery's first four
 * photographs as the card's four quadrants — a look inside before the click. The top-left quadrant
 * is always the card's own photograph; the other three are the gallery's first three, skipping it. A plain fade, no
 * movement: it was a shrink-and-bloom first, and read as too much. The card keeps its size; the quadrants are `crop="square"` too, so this adds
 * no framing (Rule 2). The three come with the page in `HOME_QUERY` (`gallery.preview`, filtered
 * and sliced in GROQ — see `GALLERY_PREVIEW_PROJECTION`), so there is no request on hover.
 *
 * **The top-left quadrant downloads nothing.** It renders the card's photograph with the card's
 * own `sizes`, so the browser picks the same srcset candidate — the same URL — as the full-size
 * photograph above it and serves it from cache. Given the quadrant's smaller `sizes` it would
 * fetch a second, smaller copy of an image already on screen.
 *
 * **Performance.** The quadrants are lazy and sized at half a card, so they ride the `square`
 * ladder's small rungs and queue behind the eager first row. On a touch screen there is no hover
 * — the gallery band shows permanently instead — so the whole preview is `display: none` under
 * `(hover: none)`, and browsers never fetch a lazy image that isn't rendered: phones download
 * nothing for it. A card whose gallery has fewer than three photographs besides the card's own
 * gets no preview.
 *
 * Opacity only, so there is nothing for `prefers-reduced-motion` to take away. The quadrants are
 * `aria-hidden` — the link's `aria-label` already names the gallery,
 * and four more alt texts would bury it.
 */
export function FeaturedPhotos({ photos }: { photos: Home['featuredPhotos'] }) {
  /**
   * The slots that actually have a photograph. `featuredPhoto.photo` is required in the schema,
   * so typegen types it non-null — but a slot stored in a pre-migration shape has no `photo` for
   * `photo->` to resolve, and the projection returns `null`. Drop those and render the rest,
   * rather than handing `SanityPhoto` nothing to read `asset` off.
   */
  const slots = photos.filter(slot => slot.photo)

  /**
   * Two-up on a phone (half the viewport, less a gutter), three-up from `md` (a third), and
   * capped at a third of the 1440px shell less its gutters. `square`'s ladder tops out at 1200,
   * which covers a 3x phone at half width.
   */
  const sizes = '(min-width: 90rem) 440px, (min-width: 48rem) 33vw, 50vw'

  /** A quadrant is half a card each way. */
  const quadrantSizes = '(min-width: 90rem) 220px, (min-width: 48rem) 17vw, 25vw'

  return (
    <section aria-label="Featured photographs">
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        {slots.map((slot, index) => {
          /*
            Above the fold on every screen, so the first row loads eagerly. Six cards on a phone
            is three rows; the first two of those are in view.
          */
          const priority = index < 3
          const gallery = slot.gallery
          const preview = gallery?.preview?.length === 3 ? gallery.preview : null

          return (
            <li key={`${slot.photo._id}-${index}`}>
              {gallery
                ? (
                    <Link
                      href={`/gallery/${gallery.slug}`}
                      aria-label={`${gallery.title} — see the photos`}
                      className="group relative block overflow-hidden"
                    >
                      <div
                        className={preview
                          ? 'transition-opacity duration-300 ease-out group-hover:opacity-0 group-focus-visible:opacity-0 [@media(hover:none)]:opacity-100'
                          : undefined}
                      >
                        <SanityPhoto photo={slot.photo} crop="square" sizes={sizes} priority={priority} />
                      </div>

                      {preview && (
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:hidden"
                        >
                          <div className="overflow-hidden">
                            <SanityPhoto photo={slot.photo} crop="square" sizes={sizes} />
                          </div>
                          {preview.map(thumb => (
                            <div key={thumb._id} className="overflow-hidden">
                              <SanityPhoto photo={thumb} crop="square" sizes={quadrantSizes} />
                            </div>
                          ))}
                        </div>
                      )}

                      {/*
                        The band that names where this photograph goes. Ink at an opacity that
                        keeps the photograph readable, square like everything else, and the same
                        `body-sm-strong` caps treatment the nav gets.

                        **`group-focus-visible` is not optional** — a keyboard user gets no hover.
                        **`[@media(hover:none)]:opacity-100` is the other half**: Tailwind compiles
                        `hover:` inside `@media (hover: hover)`, so on a touch screen the band would
                        otherwise never appear. `aria-hidden`, because the link's `aria-label`
                        already names the gallery.
                      */}
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 bottom-0 bg-ink/70 px-3 py-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 md:px-4 md:py-3 [@media(hover:none)]:opacity-100"
                      >
                        <span className="type-body-sm-strong uppercase tracking-[0.12em] text-canvas">
                          {gallery.title}
                        </span>
                      </div>
                    </Link>
                  )
                : <SanityPhoto photo={slot.photo} crop="square" sizes={sizes} priority={priority} />}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
