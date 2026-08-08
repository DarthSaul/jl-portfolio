<script setup lang="ts">
// Auto-import names, which carry the directory: `presets/GalleryGrid.vue` is
// `PresetsGalleryGrid`. Imported explicitly rather than used bare in the template because the
// map below has to reference them as values.
import { PresetsGalleryGrid, PresetsGalleryStack } from '#components'
import { GALLERY_QUERY } from '~/queries/shots'

/**
 * One gallery — a trip, a body of work, whatever she has grouped.
 *
 * The page does not know or care how the gallery filled itself. `GALLERY_QUERY` resolves both
 * modes into one `photos` array, so there is no branch here on `tag` — see the note in
 * `~/queries/shots` for the GROQ and the two scoping traps it avoids.
 *
 * The title is an `<h2>`: `SiteSidebar` renders the wordmark as the page's `<h1>`.
 *
 * A slug with no gallery is a genuine 404, like `/writing/[slug]`. Nothing guarantees this
 * document exists — the address may be one she changed, and the schema warns her that changing
 * a slug breaks links already shared.
 */
const route = useRoute()

const { data: gallery, error } = await useSanityQuery(GALLERY_QUERY, {
  slug: String(route.params.slug),
})

/**
 * `error` before `data`, for the reason `pages/index.vue` spells out at length: a failed
 * request also leaves `data` null, and the two mean opposite things. The CORS case is the one
 * that is invisible from the symptom, so the message names it.
 */
if (error.value) {
  throw createError({
    statusCode: 502,
    statusMessage: 'Could not reach Sanity — see the logged cause. If this appears only after '
      + 'navigating between pages, this origin is missing from the project\'s CORS allowlist.',
    fatal: true,
    cause: error.value,
  })
}

const doc = gallery.value
if (!doc) {
  throw createError({
    statusCode: 404,
    statusMessage: 'No gallery found at this address.',
    fatal: true,
  })
}

/**
 * RULE 2 at the render layer, and the only place the preset list is read.
 *
 * The map is exhaustive over `preset`, which typegen types as `'grid' | 'stack'` from the
 * schema's own list. That is what makes a preset value with no component impossible rather
 * than merely discouraged: add a value to `LAYOUT_PRESETS` without adding a component here and
 * `npm run typecheck` fails on this object, at the point the pair was broken.
 */
const PRESETS = {
  grid: PresetsGalleryGrid,
  stack: PresetsGalleryStack,
} satisfies Record<NonNullable<typeof doc>['preset'], unknown>

useHead({ title: doc.title })

// `description` is the share blurb, which the schema tells her is not shown on the page.
useSeoMeta({ description: doc.description || undefined })
</script>

<template>
  <div v-if="gallery" class="space-y-10">
    <header class="max-w-read">
      <h2 class="type-display-lg text-ink">
        {{ gallery.title }}
      </h2>
    </header>

    <component :is="PRESETS[gallery.preset]" :photos="gallery.photos ?? []" />

    <!-- A gallery pointed at a tag nothing carries yet is a real and temporary state — she can
         make the page before she has tagged the photographs for it. Saying so beats a heading
         floating over nothing, and it is not an error. -->
    <p v-if="!gallery.photos?.length" class="type-body-serif-lg max-w-read text-muted">
      No photos here yet.
    </p>
  </div>
</template>
