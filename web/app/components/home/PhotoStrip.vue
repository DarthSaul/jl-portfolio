<script setup lang="ts">
import type { HOME_QUERY_RESULT } from '~~/sanity.types'

type Home = NonNullable<HOME_QUERY_RESULT>

/**
 * Slot 7 — the featured photographs, as a grid. It opens the front page now rather than
 * closing it.
 *
 * ## The layout is the `grid` preset, not a copy of it
 *
 * `presets/GalleryGrid.vue` owns the wrap-and-fill maths and the two numbers that tune it; the
 * long explanation of how photographs of different shapes share a row height without being
 * cropped lives there. This page uses it through its slot so each photograph can become a link.
 *
 * That is a deliberate reuse rather than a copy. The maths is four non-obvious lines of CSS,
 * and the front page and a gallery page packing photographs *differently* would be a bug
 * nobody would notice for months. It also means the front-page row and `/shots/<slug>` look
 * like the same site by construction rather than by matching numbers twice.
 *
 * Rule 2 is unbothered by a fixed composition reusing a preset. What the rule cares about is
 * that no photograph carries its own size, and none does here — the slot changes what wraps a
 * photograph, never how big it is.
 *
 * ## The links
 *
 * A featured slot optionally points at a gallery, and the destination is resolved from that
 * gallery's own slug at query time rather than stored as a path — see `objects/featuredPhoto.ts`
 * for why a reference beats a typed-in address. A slot with no gallery renders an unlinked
 * photograph, which is the common case and needs no placeholder.
 *
 * The photograph is the whole hit area, and it is the *only* one: there is no caption or title
 * beside it to also link, so unlike the writing cards there is no duplicate-link problem to
 * solve. `aria-label` carries the destination, because a link whose only content is an image
 * would otherwise be announced as the photograph's alt text with no hint that it goes anywhere.
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
</script>

<template>
  <section>
    <PresetsGalleryGrid :photos="photos.map(slot => slot.photo)">
      <template #default="{ photo, index }">
        <!-- `photos[index]` rather than a lookup by `_id`: the grid renders the array it was
             given, in order, so the index is exact and a photograph appearing twice could not
             be told apart by id anyway. The schema forbids that duplication, but the index is
             correct whether or not the schema is. -->
        <NuxtLink
          v-if="photos[index]?.gallery"
          :to="`/shots/${photos[index].gallery.slug}`"
          :aria-label="`${photos[index].gallery.title} — see the photos`"
          class="group block"
        >
          <!-- The only hover affordance on a photograph anywhere on the site. DESIGN.md has no
               hover state to borrow and says not to invent chrome, so it is a slight lift in
               opacity rather than a caption card or a zoom — the latter would be a crop. -->
          <SanityPhoto
            :photo="photo"
            class="transition-opacity group-hover:opacity-85"
            sizes="(min-width: 1024px) 560px, (min-width: 640px) 50vw, 92vw"
          />
        </NuxtLink>

        <SanityPhoto
          v-else
          :photo="photo"
          sizes="(min-width: 1024px) 560px, (min-width: 640px) 50vw, 92vw"
        />
      </template>
    </PresetsGalleryGrid>
  </section>
</template>
