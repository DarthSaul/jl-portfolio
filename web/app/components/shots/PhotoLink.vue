<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

import type { PhotoProjection } from '~/queries/photo'

/**
 * A photograph in a gallery, made clickable.
 *
 * The one template both `/shots/all` and `/shots/<slug>` drop into a preset's slot, so the two
 * pages do not each write a `NuxtLink` around a `SanityPhoto` and then drift on the accessible
 * name. `sizes` comes from the preset's slot scope rather than from the caller — the ladder is
 * the grid's or the stack's decision and must not exist twice.
 *
 * ## `data-showcase-id`, and why focus needs it
 *
 * The pages render the index behind a `v-if`, so opening the showcase destroys every tile and
 * closing it builds new ones. An element reference captured on the way in is stale on the way
 * out. `PhotoShowcase` therefore finds its way back by *id* — `[data-showcase-id="…"]` — and
 * this attribute is the other half of that. Removing it does not break anything visibly; it
 * just silently drops keyboard focus to the top of the page on every close.
 *
 * ## The accessible name
 *
 * `aria-label` rather than letting the link take its name from the image's `alt`. A link whose
 * content is one image is announced as that alt text with no hint it goes anywhere, which is
 * the same problem `home/PhotoStrip.vue` solves the same way. The alt still describes the
 * photograph; this says what clicking does. Both come off the photo document — a caller cannot
 * pass either — so Rule 1 holds: one photograph, one description.
 */
defineProps<{
  photo: PhotoProjection
  to: RouteLocationRaw
  sizes: string
}>()
</script>

<template>
  <!-- `block` so the anchor is exactly the photograph's box. An inline anchor around a block
       image leaves a few pixels of line-height below it, which shows up as a hairline of canvas
       inside the focus ring. -->
  <NuxtLink
    :to="to"
    :data-showcase-id="photo._id"
    :aria-label="`View ${photo.alt}`"
    class="block transition-opacity hover:opacity-85"
  >
    <SanityPhoto :photo="photo" :sizes="sizes" />
  </NuxtLink>
</template>
