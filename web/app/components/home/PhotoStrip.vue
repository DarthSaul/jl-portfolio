<script setup lang="ts">
import type { HOME_QUERY_RESULT } from '~~/sanity.types'

type Home = NonNullable<HOME_QUERY_RESULT>

/**
 * Slot 7 — the title, the subtitle under it, and the row of five photographs that closes the
 * front page. One section, because the schema treats them as one: `featuredTitle` is described
 * to her as "the heading over the row of photos".
 *
 * ## Why the row is built the way it is
 *
 * Five photographs of different shapes in one row, and CLAUDE.md forbids cropping any of them
 * to match. Equal widths would leave a ragged bottom edge, which is what a cropped-to-uniform
 * grid exists to avoid — so instead every photo gets the **same height** and a width in
 * proportion to its own shape. Landscapes come out wide, portraits narrow, the row has one
 * straight top edge and one straight bottom edge, and not a pixel is cropped.
 *
 * That is one line of CSS per photo: `flex-grow` set to the photograph's aspect ratio against a
 * `flex-basis` of zero distributes the row's width in proportion to shape, and `SanityPhoto`'s
 * own aspect-ratio box then resolves every height to the same number.
 *
 * Below `lg` the same rule runs against a fixed height instead and the row scrolls sideways.
 * Five across is right on a laptop and far too small on a phone; wrapping into a grid was the
 * first attempt and looked broken, because five items into two or three columns always leaves
 * a ragged last row. The partial photo at the right edge is what tells you there is more to
 * swipe, and `overflow-x-auto` on the list keeps the page itself from ever scrolling sideways.
 *
 * This is the closest thing on the site to a real layout preset and the obvious candidate for
 * promotion into `components/presets/` — but not yet. CLAUDE.md is explicit that a preset is a
 * component *and* an option in the gallery schema's fixed list, always together, and that what
 * a preset guarantees at narrow widths is a design conversation rather than something settled
 * inside a component. Today this is a fixed composition belonging to one page.
 */
defineProps<{
  title: Home['featuredTitle']
  subtitle: Home['featuredSubtitle']
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
  <section class="space-y-10">
    <div class="mx-auto max-w-[1080px] space-y-6 px-5">
      <ProseHeading
        :value="title"
        class="text-2xl font-normal text-muted sm:text-3xl"
      />
      <ProseText
        :value="subtitle"
        class="text-lg leading-relaxed sm:text-xl"
      />
    </div>

    <ul class="flex snap-x snap-mandatory gap-px overflow-x-auto lg:overflow-visible">
      <li
        v-for="photo in photos"
        :key="photo._id"
        :style="{ '--r': ratio(photo) }"
        class="h-56 shrink-0 basis-[calc(14rem*var(--r))] snap-start sm:h-72 sm:basis-[calc(18rem*var(--r))] lg:h-auto lg:shrink lg:grow-[var(--r)] lg:basis-0"
      >
        <SanityPhoto
          :photo="photo"
          sizes="(min-width: 1024px) 20vw, 45vw"
        />
      </li>
    </ul>
  </section>
</template>
