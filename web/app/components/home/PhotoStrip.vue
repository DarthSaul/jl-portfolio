<script setup lang="ts">
import type { Photo } from '~/content/home'

/**
 * The edge-to-edge photo strip that closes the home page.
 *
 * Five across is right on a laptop and far too small on a phone. Wrapping into a grid was
 * the first attempt and it looked broken: five items into two or three columns always
 * leaves a ragged last row. So below `lg` this scrolls sideways instead — the photos stay
 * large, the strip stays a strip, and the partial photo at the right edge is what tells you
 * there is more to swipe.
 *
 * The horizontal scroll is contained by `overflow-x-auto` on the list, so the page itself
 * never scrolls sideways at any width.
 *
 * The caller passes photos and nothing else — no column count, no widths. This is the
 * closest thing here to a real layout preset, and the obvious candidate for promotion into
 * `components/presets/` once a gallery schema exists to register it against.
 */
defineProps<{ photos: Photo[] }>()
</script>

<template>
  <section aria-label="Recent photographs">
    <ul
      class="flex snap-x snap-mandatory gap-px overflow-x-auto lg:grid lg:grid-cols-5 lg:overflow-visible"
    >
      <li
        v-for="photo in photos"
        :key="photo.src"
        class="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-auto"
      >
        <SitePhoto
          v-bind="photo"
          sizes="(min-width: 1024px) 20vw, (min-width: 640px) 31vw, 46vw"
          class="h-full"
        />
      </li>
    </ul>
  </section>
</template>
