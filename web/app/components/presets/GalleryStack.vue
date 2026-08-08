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
 * Captions render, unlike in the grid. A stack is the slow read of the two, and a caption at
 * the foot of a full-width photograph has room to be read; in a packed row it would sit in a
 * column narrower than the sentence.
 */
defineProps<{
  photos: PhotoProjection[]
}>()
</script>

<template>
  <ul class="max-w-read space-y-16">
    <li v-for="photo in photos" :key="photo._id">
      <figure>
        <SanityPhoto :photo="photo" sizes="(min-width: 768px) 750px, 92vw" />

        <figcaption v-if="photo.caption" class="type-caption mt-3 text-muted">
          {{ photo.caption }}
        </figcaption>
      </figure>
    </li>
  </ul>
</template>
