import type { CSSProperties } from 'react'

import { SanityPhoto } from '@/components/SanityPhoto'
import { photoRatio } from '@/lib/photo'

import type { GalleryPresetProps } from './types'

/**
 * The `grid` preset — "several photos across, in rows".
 *
 * RULE 2. This is one of the two components the gallery schema's `LAYOUT_PRESETS` list points at,
 * and the pair has to stay in step: a value with no component here must be impossible. She picks
 * which photos, in what order, and which preset. Nothing below is settable per photograph, and
 * nothing should become settable — the two numbers in the class list are properties of the grid,
 * not of any photograph in it.
 *
 * ## How it packs, and why that is not a crop
 *
 * Every photograph in a row shares one height and takes a width proportional to its own shape.
 * Landscapes come out wide, portraits narrow, each row has a straight top and bottom edge, and
 * not a pixel is cropped — which is what lets this exist at all, given `photo.image` has no
 * hotspot by design.
 *
 * Two declarations per photo do it:
 *
 *   flex-basis: calc(var(--r) * K)   flex-grow: var(--r)
 *
 * For items on one line the final width is `basis + grow/Σgrow × free`. With both terms
 * proportional to the ratio `r` that comes out as `w = r × (K + free/Σr)`, so `w ∝ r`, and
 * therefore `h = w/r = K + free/Σr` — the same number for every item on the line. The browser
 * decides how many fit; the row heights fall out. No breakpoints, no JS, no measurement.
 *
 * `K` (the `22rem`) sets roughly how tall a row wants to be before wrapping.
 *
 * ## The growth cap, and what it trades away
 *
 * `max-w-[calc(var(--r)*var(--k)*1.5)]` caps how far the justification above may stretch any one
 * item: 1.5× its natural width, which is the same as 1.5× the row height it was sized for.
 *
 * The case it was added for is the degenerate one — a row left holding a single photograph, which
 * `flex-grow` stretches to the full width of the column. That used to be capped at
 * `sm:max-w-[55%]`, and 55% of a ~1100px column is still a 600px photograph sitting alone on a
 * row of otherwise 300px tiles, which reads as a mistake rather than as a varying grid.
 *
 * The cap is stated against the item's own basis rather than as a percentage of the viewport
 * because that is what it is actually about: how much larger than its neighbours a photograph may
 * get. A percentage moves with the screen and says nothing about the row.
 *
 * **What it costs is real and applies to every row, not only the last.** A row whose items all hit
 * the cap cannot absorb the remaining space, so its right edge is ragged instead of flush. That is
 * the honest trade for never seeing one photograph balloon, and `1.5` is the one number to turn if
 * the balance is wrong. Both numbers are properties of the grid and apply to every photograph in
 * it equally, so neither is a Rule 2 control.
 *
 * The last row is still shorter or taller than the ones above it depending on what is left over.
 * That is inherent to filling rows without cropping.
 *
 * ## Fixed rows: `perRow`
 *
 * The front page asks for rows of exactly three, and that is a different packing question:
 * wrap-and-fill lets the browser decide how many photographs share a row, and a composition
 * with a recommended count (six — two even desktop rows) wants that decision made for it. With
 * `perRow` set the photographs are chunked into rows of that many, and each cell switches to
 * `flex-basis: 0` + `flex-grow: var(--r)`: width becomes r/Σr × (row width − gaps), so every
 * photograph in a row still shares one height at its own ratio — the same justified-row look,
 * with the row breaks fixed instead of found. 5 photos → 3+2, 6 → 3+3, 7 → 3+3+1.
 *
 * `K` no longer decides where rows break in this mode; it survives in the growth cap, which
 * applies unchanged per cell — a row left holding one photograph stops at 1.5× its natural
 * width instead of stretching across the column. Below `sm` the cells are `min-w-full`, one
 * per row, exactly as the reading grid; from `sm` up it is three-up — one breakpoint, and a
 * ~190px cell at 640px is the density the compact index already accepts two-up.
 *
 * Until this prop existed the front page and a gallery page packed identically by
 * construction, and this file said so. They no longer do — the front page fixes its row
 * breaks — but the maths, the ratio variable and the cap still live only in this file, so the
 * two cannot drift in *how* a photograph is sized, only in where its row ends.
 *
 * ## Captions
 *
 * Off by default on the front page, on for the gallery pages. `GalleryStack` used to be the only
 * preset that showed them, and the argument was that a caption in a packed row sits in a column
 * narrower than the sentence. That is still true and it is no longer the deciding fact: an
 * uncaptioned photograph on a photography site is missing the thing its photographer wrote about
 * it, and a narrow column wraps. The front page does not set it — a caption under each
 * featured photograph would compete with the writing directly below them.
 *
 * The caption is rendered by the grid rather than inside `renderPhoto`, so a caller that wraps
 * each photograph in a link does not have to re-implement it, and the caption stays outside the
 * link where it belongs.
 *
 * No `'use client'`: dual-use, like `SanityPhoto`. `/` renders it from a Server Component;
 * `AllShotsView` renders it from a client one. Because it is never marked, the `renderPhoto`
 * function never crosses a boundary in either direction — which is the whole reason a render prop
 * is legal here at all.
 */
type Props = GalleryPresetProps & {
  /** Only ever the grid's own measurement — never a per-photo size. */
  sizes?: string
  /**
   * Smaller rows, for an index rather than a reading page.
   *
   * A boolean and not a number, for the reason `crop` is a name: on or off cannot become a
   * per-photo dimension, and a `rowHeight` prop could. It changes `K` — how tall a row wants to
   * be before wrapping — which is a property of the grid and applies to every photograph in it
   * equally. /shots/all sets it because ~200 photographs at reading size is a very long page; a
   * gallery of fifty does not.
   */
  compact?: boolean
  /**
   * Show each photograph's caption beneath it. On by default.
   *
   * A boolean for the same reason `compact` is one: on or off is a property of the page, and
   * nothing about it can become a per-photograph setting. A photograph with no caption renders
   * none — there is no placeholder and no empty row, so a half-captioned gallery simply has
   * captions where she wrote them.
   *
   * The default is `true` rather than `false` because this is a gallery preset and a gallery shows
   * what she wrote about the photographs. It also keeps `GalleryView` from having to pass it: that
   * component renders `PRESETS[preset]` through the shared `GalleryPresetProps` contract, which
   * does not include this. The front page is the one caller that opts out.
   */
  captions?: boolean
  /**
   * Fixed rows of exactly this many photographs from `sm` up; omit for browser packing.
   *
   * A count of slots per row, never a size — every cell still takes its width from its own
   * ratio, so nothing about it is settable per photograph and Rule 2 is unbothered. The front
   * page sets 3 because its photographs are a composition with a recommended count; a gallery
   * never sets it, because a gallery's photo count is open-ended and the wrap-and-fill packing
   * exists exactly for that. See "Fixed rows" in the header.
   */
  perRow?: number
}

export function GalleryGrid({
  photos,
  renderPhoto,
  sizes,
  compact = false,
  captions = true,
  perRow,
}: Props) {
  /**
   * Defaulted here rather than in the parameter list because it depends on `compact`. A compact
   * tile is roughly half the width, so asking for the reading ladder would download twice the
   * pixels the layout can show — which on an index of 200 is the whole cost that matters.
   */
  const resolvedSizes
    = sizes
      ?? (compact
        ? '(min-width: 1024px) 300px, (min-width: 640px) 33vw, 46vw'
        : '(min-width: 1024px) 560px, (min-width: 640px) 50vw, 92vw')

  if (perRow) {
    const rows: (typeof photos)[] = []
    for (let start = 0; start < photos.length; start += perRow) {
      rows.push(photos.slice(start, start + perRow))
    }

    return (
      /* A list of rows rather than of photographs — the row is the layout unit here. */
      <ul className="bleed flex flex-col gap-4 px-(--gutter)">
        {rows.map((row, rowIndex) => {
          /*
            A full row splits the column three ways; a 2-up short row measures about what a
            packed row does, so it takes the wrap-and-fill ladder. A row left holding ONE
            photograph can grow all the way to the cap, so below lg its hint stays near full
            width rather than claiming the two-up 50vw. Decided here and not by the caller
            because only the chunker knows a row's occupancy.
          */
          const rowSizes
            = sizes
              ?? (row.length === perRow
                ? '(min-width: 1024px) 370px, (min-width: 640px) 33vw, 92vw'
                : row.length === 1
                  ? '(min-width: 1024px) 560px, 92vw'
                  : '(min-width: 1024px) 560px, (min-width: 640px) 50vw, 92vw')

          return (
            /* Keyed by the first photo — a chunk is never empty, but the index type cannot
               know that, hence the fallback. */
            <li key={row[0]?._id ?? rowIndex} className="flex flex-wrap gap-4">
              {row.map((photo, columnIndex) => (
                <figure
                  key={photo._id}
                  style={{ '--r': photoRatio(photo), '--k': compact ? '13rem' : '22rem' } as CSSProperties}
                  className="min-w-full grow-[var(--r)] basis-0 sm:min-w-0 sm:max-w-[calc(var(--r)*var(--k)*1.5)]"
                >
                  {/* The GLOBAL index — PhotoStrip's `slots[index]` depends on it. */}
                  {renderPhoto
                    ? renderPhoto({ photo, index: rowIndex * perRow + columnIndex, sizes: rowSizes })
                    : <SanityPhoto photo={photo} sizes={rowSizes} />}

                  {captions && photo.caption && (
                    <figcaption className="type-caption mt-2 text-muted">{photo.caption}</figcaption>
                  )}
                </figure>
              ))}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    /*
      `bleed` plus `px-(--gutter)` lets the grid reach the main column's edges while keeping the
      first photograph aligned with the text above and below it. `gap-4` applies to both axes on a
      wrapping flex container, so rows and columns are spaced alike.
    */
    <ul className="bleed flex flex-wrap gap-4 px-(--gutter)">
      {photos.map((photo, index) => (
        <li
          key={photo._id}
          style={{ '--r': photoRatio(photo), '--k': compact ? '13rem' : '22rem' } as CSSProperties}
          className={`grow-[var(--r)] basis-[calc(var(--r)*var(--k))] sm:min-w-0 sm:max-w-[calc(var(--r)*var(--k)*1.5)] ${
            compact ? 'min-w-[46%]' : 'min-w-full'
          }`}
        >
          {/*
            Below `sm` a reading grid gives each photograph the full width, where two landscapes
            side by side would be too small to be worth showing. A compact grid keeps two up even
            on a phone — that is what makes it an index you can scan rather than scroll. The cap
            above is `sm:` for the same reason `min-w-0` is: below it a `min-width` wins over a
            `max-width` anyway, so stating it there would be a rule that never applies.
          */}
          <figure>
            {renderPhoto
              ? renderPhoto({ photo, index, sizes: resolvedSizes })
              : <SanityPhoto photo={photo} sizes={resolvedSizes} />}

            {/*
              Outside `renderPhoto`, so a caller that makes the photograph a link does not put the
              caption inside it — a link whose accessible name is the alt text *and* the caption
              reads twice as long for no gain.
            */}
            {captions && photo.caption && (
              <figcaption className="type-caption mt-2 text-muted">{photo.caption}</figcaption>
            )}
          </figure>
        </li>
      ))}
    </ul>
  )
}
