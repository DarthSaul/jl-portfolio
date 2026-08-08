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
const props = defineProps<{
  photos: Home['featuredPhotos']
}>()

/**
 * The slots that actually have a photograph, and the only array anything below reads.
 *
 * `featuredPhoto.photo` is required in the schema, so typegen types it non-null and nothing
 * here forces this filter. The dataset can still disagree: a slot stored in the pre-migration
 * shape — a bare reference rather than a `featuredPhoto` object — has no `photo` field for
 * `photo->` to resolve, so the projection returns `null` and `SanityPhoto` is handed nothing to
 * read `asset` off. `production` is in exactly that state today (see the deployment note on the
 * PR), and the failure is a blank front page rather than four photographs and a gap.
 *
 * So: drop those slots and render the rest. Filtering here rather than in `GalleryGrid` keeps
 * the index alignment correct — the grid renders the array it is given, and `slots[index]`
 * below indexes that same array.
 */
const slots = computed(() => props.photos.filter(slot => slot.photo))
</script>

<template>
  <section>
    <PresetsGalleryGrid :photos="slots.map(slot => slot.photo)">
      <template #default="{ photo, index }">
        <!-- `slots[index]` rather than a lookup by `_id`: the grid renders the array it was
             given, in order, so the index is exact and a photograph appearing twice could not
             be told apart by id anyway. The schema forbids that duplication, but the index is
             correct whether or not the schema is. -->
        <NuxtLink
          v-if="slots[index]?.gallery"
          :to="`/shots/${slots[index].gallery.slug}`"
          :aria-label="`${slots[index].gallery.title} — see the photos`"
          class="group relative block"
        >
          <SanityPhoto
            :photo="photo"
            sizes="(min-width: 1024px) 560px, (min-width: 640px) 50vw, 92vw"
          />

          <!--
            The band that names where this photograph goes.

            `bg-ink/70` rather than a gradient or a solid fill: DESIGN.md has no overlay
            component to borrow and tells us not to invent chrome, so this is the ink it already
            uses at an opacity that keeps the photograph readable underneath. Square, like
            everything else. The type is `body-sm-strong` in caps — the same treatment the nav
            and READ MORE get, so a label appearing over a photo still reads as this site.

            **`group-focus-visible` is not optional.** A keyboard user tabs to this link and gets
            no hover, so without it the band is a mouse-only affordance and they are told nothing
            about where they are about to go.

            **`[@media(hover:none)]:opacity-100` is the other half.** Tailwind compiles `hover:`
            inside `@media (hover: hover)`, so on a touch screen `group-hover` never fires and the
            band would never appear at all — on the devices most of her visitors are using. There
            it is simply always visible, which is what the reference site does at every width.

            `aria-hidden`, because the link already carries an `aria-label` naming the same
            gallery; without it a screen reader announces the destination twice.
          -->
          <div
            aria-hidden="true"
            class="pointer-events-none absolute inset-x-0 bottom-0 bg-ink/70 px-4 py-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
          >
            <span class="type-body-sm-strong uppercase tracking-[0.12em] text-canvas">
              {{ slots[index].gallery.title }}
            </span>
          </div>
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
