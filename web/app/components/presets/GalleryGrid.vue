<script setup lang="ts">
import type { PhotoProjection } from '~/queries/photo'

/**
 * The `grid` preset — "several photos across, in rows".
 *
 * RULE 2. This is one of the two components the gallery schema's `LAYOUT_PRESETS` list points
 * at, and the pair has to stay in step: a value with no component here must be impossible.
 * She picks which photos, in what order, and which preset. Nothing below is settable per
 * photograph, and nothing should become settable — the two numbers in the class list are
 * properties of the grid, not of any photograph in it.
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
 * `K` (the `22rem`) sets roughly how tall a row wants to be before wrapping. `sm:max-w-[55%]`
 * is a guard for the degenerate case: a row left with one item grows it to the full width, and
 * a portrait at full width was measured at 765px tall before this was added.
 *
 * The last row is shorter or taller than the ones above it depending on what is left over.
 * That is inherent to filling rows without cropping, and it reads as part of the varying-size
 * grid rather than as a mistake.
 *
 * ## The slot
 *
 * Rendering one photograph is the caller's business, so the front page can wrap each in a link
 * and a gallery page can leave them plain. The default is a bare `SanityPhoto`, so a caller
 * that wants nothing special passes no slot. Sharing the component rather than the CSS is
 * deliberate: the maths above is the kind of thing that drifts silently if it exists twice.
 */
const props = withDefaults(
  defineProps<{
    photos: PhotoProjection[]
    /** Only ever the grid's own measurement — never a per-photo size. */
    sizes?: string
    /**
     * Smaller rows, for an index rather than a reading page.
     *
     * A boolean and not a number, for the reason `SanityPhoto.square` is a boolean: on or off
     * cannot become a per-photo dimension, and a `rowHeight` prop could. It changes `K` — how
     * tall a row wants to be before wrapping — which is a property of the grid and applies to
     * every photograph in it equally. /shots/everything sets it because ~200 photographs at
     * reading size is a very long page; a gallery of fifty does not.
     */
    compact?: boolean
  }>(),
  { sizes: undefined, compact: false },
)

/**
 * Defaulted here rather than in `withDefaults` because it depends on `compact`. A compact tile
 * is roughly half the width, so asking for the reading ladder would download twice the pixels
 * the layout can show — which on an index of 200 is the whole cost that matters.
 */
const resolvedSizes = computed(
  () =>
    props.sizes
    ?? (props.compact
      ? '(min-width: 1024px) 300px, (min-width: 640px) 33vw, 46vw'
      : '(min-width: 1024px) 560px, (min-width: 640px) 50vw, 92vw'),
)

/**
 * The photograph's shape as a bare number, for the flex maths above.
 *
 * Falls back to 3:2 when an asset has no dimensions — Sanity computes metadata at upload and
 * never backfills it, so anything imported around the Studio could be missing it. A wrong-ish
 * width beats a zero-width column.
 */
const ratio = (photo: PhotoProjection) => {
  const { width, height } = photo.asset
  return width && height ? width / height : 1.5
}
</script>

<template>
  <!-- `bleed` plus `px-(--gutter)` lets the grid reach the main column's edges while keeping
       the first photograph aligned with the text above and below it. `gap-4` applies to both
       axes on a wrapping flex container, so rows and columns are spaced alike. -->
  <ul class="bleed flex flex-wrap gap-4 px-(--gutter)">
    <li
      v-for="(photo, index) in photos"
      :key="photo._id"
      :style="{ '--r': ratio(photo), '--k': compact ? '13rem' : '22rem' }"
      class="grow-[var(--r)] basis-[calc(var(--r)*var(--k))] sm:min-w-0 sm:max-w-[55%]"
      :class="compact ? 'min-w-[46%]' : 'min-w-full'"
    >
      <!-- Below `sm` a reading grid gives each photograph the full width, where two landscapes
           side by side would be too small to be worth showing. A compact grid keeps two up
           even on a phone — that is what makes it an index you can scan rather than scroll. -->
      <slot :photo="photo" :index="index">
        <SanityPhoto :photo="photo" :sizes="resolvedSizes" />
      </slot>
    </li>
  </ul>
</template>
