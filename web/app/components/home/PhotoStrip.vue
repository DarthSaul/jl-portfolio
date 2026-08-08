<script setup lang="ts">
import type { HOME_QUERY_RESULT } from '~~/sanity.types'

type Home = NonNullable<HOME_QUERY_RESULT>

/**
 * Slot 7 — the featured photographs, as a grid. It opens the front page now rather than
 * closing it.
 *
 * ## How the grid works, and why it is not a crop
 *
 * Photographs wrap into rows, and **every photograph in a row shares one height while taking a
 * width proportional to its own shape**. Landscapes come out wide, portraits narrow, each row
 * has a straight top edge and a straight bottom edge, and not a pixel is cropped. All the
 * variation in size is the photographs' own proportions — which is what makes this Rule 2
 * shaped rather than Rule 2 breaking. A uniform-tile grid would need every photo cropped to a
 * common shape, and `photo.image` has no hotspot by design.
 *
 * It is two declarations per photo, and the maths is worth writing down because it is not
 * obvious that it works:
 *
 *   flex-basis: calc(var(--r) * K)   flex-grow: var(--r)
 *
 * For items on one line, the final width is `basis + grow/Σgrow × free`. With both terms
 * proportional to the ratio `r`, that comes out as `w = r × (K + free/Σr)` — so `w ∝ r`, and
 * therefore `h = w/r = K + free/Σr`, **the same number for every item on the line**. The
 * browser decides how many fit; the row heights fall out.
 *
 * `K` is the only knob, and it sets roughly how tall a row wants to be before wrapping. It is
 * not a size control on any individual photograph — nothing here can be set per photo, which is
 * the property Rule 2 actually cares about.
 *
 * ## Why not the two obvious alternatives
 *
 * **CSS multi-column** (`columns-3`) is the mechanism the reference site uses and was the first
 * thing tried here. It balances columns by *total* height, which works beautifully for the ~16
 * photographs that site has and badly for the five this field holds: measured, it put one photo
 * in the first column and two in each of the others, leaving a ~500px hole under the first.
 * Dropping to two columns made it worse, not better. It also flows items *down* each column, so
 * her chosen order would read 1, 3, 5 across the top.
 *
 * **A grid with `row-span` computed per photo** needs the row unit expressed in the same pixels
 * as the rendered column width. The column width changes with the viewport and the row unit
 * cannot follow it, so the packing comes apart at every size except the one it was tuned for.
 *
 * The wrap-and-fill above has neither problem: it packs at every width with no breakpoints at
 * all, and it fills **left to right, top to bottom**, so her order survives.
 *
 * The honest cost is the last row. It grows whatever is left to fill the width, so a row of two
 * is taller than a row of three above it. That is the same trade the row-of-five made before
 * it, and here it reads as part of the varying-size grid rather than as a mistake.
 *
 * ## This is still not a preset
 *
 * It is the closest thing on the site to one and the obvious candidate for promotion into
 * `components/presets/`, but CLAUDE.md is explicit that a preset is a component *and* an option
 * in the gallery schema's fixed list, always together. Today this is a fixed composition
 * belonging to one page. Promoting it is the conversation to have when /shots needs a gallery —
 * and it is the same maths, which is the point.
 *
 * ## The title and subtitle used to live here
 *
 * `featuredTitle` and `featuredSubtitle` were rendered above the row, through `ProseHeading` and
 * `ProseText`. Both are still in the schema and still fetched by `HOME_QUERY`; neither is
 * rendered anywhere at the moment, pending a decision about where they belong now that the
 * photographs open the page instead of closing it. `ProseHeading` has no other caller and is
 * waiting on the same decision — it is not dead code yet.
 */
defineProps<{
  photos: Home['featuredPhotos']
}>()

/**
 * The photograph's shape as a bare number, for the flex maths above.
 *
 * Falls back to 3:2 when an asset has no dimensions — Sanity computes metadata at upload and
 * never backfills it, so anything imported around the Studio could be missing it. A wrong-ish
 * width beats a zero-width column.
 */
const ratio = (photo: Home['featuredPhotos'][number]) => {
  const { width, height } = photo.asset
  return width && height ? width / height : 1.5
}
</script>

<template>
  <section>
    <!--
      `bleed` plus `px-(--gutter)` is the edge-to-edge-scroller idiom doing something quieter
      here: it lets the row reach the main column's edges while keeping the first photograph
      aligned with the text above and below it.

      `gap-4` applies to both axes on a wrapping flex container, so rows and columns are spaced
      the same 1rem.
    -->
    <ul class="bleed flex flex-wrap gap-4 px-(--gutter)">
      <li
        v-for="photo in photos"
        :key="photo._id"
        :style="{ '--r': ratio(photo) }"
        class="min-w-full grow-[var(--r)] basis-[calc(var(--r)*22rem)] sm:min-w-0 sm:max-w-[55%]"
      >
        <!--
          `min-w-full` below `sm` forces one photograph per row on a phone, where two landscapes
          side by side are too small to be worth showing. From `sm` the basis takes over and the
          browser decides how many fit.

          Row height is ~224px (`K` above) plus its share of the leftover, so a photograph is
          never much wider than half the main column. The `sizes` steps track that rather than
          the viewport, which the 1440px shell and the 240px sidenav would make wrong.
        -->
        <SanityPhoto
          :photo="photo"
          sizes="(min-width: 1024px) 560px, (min-width: 640px) 50vw, 92vw"
        />
      </li>
    </ul>
  </section>
</template>
