<script setup lang="ts">
import type { PhotoProjection } from '~/queries/photo'

/**
 * The `stack` preset — "one photo at a time, down the page".
 *
 * RULE 2. The second of the two components `LAYOUT_PRESETS` points at. She picks the photos,
 * the order and this; nothing here is settable per photograph.
 *
 * Where `GalleryGrid` packs rows and lets shape decide width, this gives every photograph the
 * full reading measure and lets it be as tall as it is. That is the whole difference, and it
 * is the reason both exist: a set of portraits reads badly in rows and well in a column, and a
 * set of landscapes the other way round. She can try one, look, and switch.
 *
 * `max-w-read` rather than the full column width, and this is the one thing worth arguing
 * about. A photograph at 1120px is a lot of photograph, and a stack of them is a lot of
 * scrolling; the reading measure keeps a stacked gallery feeling like a sequence rather than a
 * slideshow. It is a property of the preset, not of any photograph, so it stays here.
 *
 * Captions render, and always have. The grid can now show them too — see the note there — so
 * this is no longer the difference between the two presets, only the place a caption has the
 * most room: at the foot of a full-measure photograph rather than in a packed column.
 */
defineProps<{
  photos: PhotoProjection[]
}>()

/**
 * The same slot `GalleryGrid` declares, so `pages/shots/[slug].vue` can hand one template to
 * `<component :is="PRESETS[preset]">` and have it work whichever preset she picked. Without it
 * a stack gallery's photographs would silently not be clickable — the `PRESETS` map guarantees
 * a component exists for every preset value, and this is what guarantees it takes the slot.
 *
 * `sizes` travels with the photograph for the reason it does in the grid: the ladder is the
 * preset's decision, and a caller overriding the slot must not have to restate it.
 */
const SIZES = '(min-width: 768px) 750px, 92vw'

defineSlots<{
  default?: (props: { photo: PhotoProjection, index: number, sizes: string }) => unknown
}>()
</script>

<template>
  <ul class="max-w-read space-y-16">
    <li v-for="(photo, index) in photos" :key="photo._id">
      <figure>
        <!-- The slot wraps the photograph only, never the `<figure>`: the caption belongs
             outside whatever the caller puts around the image. -->
        <slot :photo="photo" :index="index" :sizes="SIZES">
          <SanityPhoto :photo="photo" :sizes="SIZES" />
        </slot>

        <figcaption v-if="photo.caption" class="type-caption mt-3 text-muted">
          {{ photo.caption }}
        </figcaption>
      </figure>
    </li>
  </ul>
</template>
