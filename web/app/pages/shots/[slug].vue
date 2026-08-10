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
 * A slug with no gallery is a genuine 404, like `/copy/[slug]`. Nothing guarantees this
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
    statusMessage: 'Bad Gateway',
    message: 'Could not reach Sanity — see the logged cause. If this appears only after '
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

/**
 * The showcase — one photograph, alone, at `?photo=<_id>`.
 *
 * A gallery needs no second query for it. `GALLERY_QUERY` returns the whole `photos` array in
 * both fill modes, unpaged, so the id always resolves out of the list already on the page and
 * previous/next are simply its neighbours. `/shots/all` is the one that has to fetch, because
 * it pages.
 *
 * `photos` is a `computed` rather than `gallery.value.photos` directly, because the composable
 * takes a ref and reads it on every navigation.
 */
const photos = computed(() => gallery.value?.photos ?? [])
const showcase = usePhotoShowcase(photos)

useHead({
  // A showcased photograph titles the page, so a link someone shares says what it is rather
  // than repeating the gallery. `caption || alt` is the fallback chain `photo.ts`'s Studio
  // preview already uses, so no new naming rule is invented here.
  title: computed(() =>
    showcase.inList.value
      ? showcase.inList.value.caption || showcase.inList.value.alt
      : doc.title,
  ),
})

// `description` is the share blurb, which the schema tells her is not shown on the page.
useSeoMeta({
  description: doc.description || undefined,
  // The same photograph is showcasable from every gallery it appears in and from the index, so
  // indexing them would be a set of near-duplicates competing with each other. Same reason
  // `/shots/all` noindexes its filtered views.
  robots: computed(() => (showcase.isOpen.value ? 'noindex, follow' : null)),
})
</script>

<template>
  <div v-if="gallery" class="space-y-10">
    <!-- The heading stays above the showcase, so the outline is the same whether one photograph
         is open or all of them are. `tabindex="-1"` is not decoration: it is where focus lands
         when the showcase closes and the tile that opened it cannot be found. -->
    <header class="max-w-read">
      <h2 tabindex="-1" class="type-display-lg text-ink outline-none">
        {{ gallery.title }}
      </h2>
    </header>

    <!-- `v-if`/`v-else`, so "all other photos hidden" means what it says. A `v-show` would leave
         the whole gallery in the DOM behind `display: none`, and the scroll position it collapses
         is restored by the composable either way. -->
    <ShotsPhotoShowcase
      v-if="showcase.isOpen.value"
      :photo="showcase.inList.value"
      :close-to="showcase.closeTo.value"
      :previous-to="showcase.previous.value ? showcase.openTo(showcase.previous.value._id) : null"
      :next-to="showcase.next.value ? showcase.openTo(showcase.next.value._id) : null"
    />

    <template v-else>
      <!-- One slot for either preset — both declare it, which is what makes `<component :is>`
           safe here. Each photograph becomes a link to itself; the caption the preset renders
           stays outside that link. -->
      <component :is="PRESETS[gallery.preset]" :photos="photos">
        <template #default="{ photo, sizes }">
          <ShotsPhotoLink :photo="photo" :sizes="sizes" :to="showcase.openTo(photo._id)" />
        </template>
      </component>

      <!-- A gallery pointed at a tag nothing carries yet is a real and temporary state — she can
           make the page before she has tagged the photographs for it. Saying so beats a heading
           floating over nothing, and it is not an error. -->
      <p v-if="!photos.length" class="type-body-serif-lg max-w-read text-muted">
        No photos here yet.
      </p>
    </template>
  </div>
</template>
