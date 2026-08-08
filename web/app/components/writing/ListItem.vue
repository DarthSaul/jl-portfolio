<script setup lang="ts">
import { NuxtLink } from '#components'
import type { WRITING_QUERY_RESULT } from '~~/sanity.types'

/**
 * One row of the COPY list: a circular thumbnail on the left, everything else in a column
 * beside it — title, summary, date, READ MORE.
 *
 * Renders both halves of her writing. A `post` lives here and links to its own page; an
 * `article` lives on the site that published it and opens there. The union discriminates on
 * `_type` because the query projects `slug` or `url` conditionally beside it — the same shape
 * `HomeFeaturedWriting` reads, deliberately, since the two lists render the same content and a
 * difference between them would be a difference to maintain rather than a decision.
 *
 * ## The circle, and why it is allowed to crop
 *
 * The thumbnail is a centred square crop, which the rest of the site does not do. CLAUDE.md
 * carries the scoped exception and the reasoning; the short version is that the size is fixed
 * here, the crop is always centred, and she has no control over either — it is a preset that
 * happens to crop, not a framing control. The cost is that a cover whose subject sits near an
 * edge loses it at this size, and the only remedy is a different photo.
 *
 * The row previously led with a full-width cover at its native proportions, which is what
 * made the page heavy: seven ~1200px JPEGs to fill what is now a 128px circle. `square` on
 * `SanityPhoto` asks the CDN for the small square directly rather than scaling one down in
 * CSS.
 *
 * ## The empty rail
 *
 * Three of the six posts have no cover photo. The thumbnail column is rendered either way, so
 * every title in the list starts on the same left edge — without it the rows with photos are
 * indented and the rows without are not, and a list of seven ragged left edges reads as a
 * mistake. An empty circle would be worse: it is a placeholder for nothing, on nearly half the
 * rows.
 *
 * The photo, the title and READ MORE are three hit areas for one destination. Only the title
 * carries an accessible name: the photo link is hidden from assistive tech and skipped by the
 * keyboard, and READ MORE gets an `aria-label` naming the piece, so a screen reader hears one
 * meaningful link per row rather than three, one of which says "Read more" about nothing.
 */
const props = defineProps<{ item: WRITING_QUERY_RESULT['items'][number] }>()

const link = computed(() =>
  props.item._type === 'article'
    ? { is: 'a', href: props.item.url, target: '_blank', rel: 'noopener' }
    : { is: NuxtLink, to: `/writing/${props.item.slug}` },
)
</script>

<template>
  <!-- An `<li>`, because /writing wraps these in a `<ul>` — seven rows are a list and the
       reading measure that used to be declared here now belongs to that list, not to each row
       of it.

       `story-row` is DESIGN.md's row for exactly this: a hairline under each entry, which is
       what separates them. It is the only line the spec allows and the only one the site
       uses — "surface contrast and hairline borders carry all visual hierarchy". -->
  <li class="story-row flex items-start gap-5 sm:gap-7">
    <!-- Reserved whether or not there is a photo — see the note above. `shrink-0` keeps the
         circle circular when a long title tries to take the row's width. -->
    <div class="w-20 shrink-0 sm:w-32">
      <component
        :is="link.is"
        v-if="item.coverPhoto"
        v-bind="link"
        tabindex="-1"
        aria-hidden="true"
        class="block overflow-hidden rounded-full"
      >
        <SanityPhoto
          :photo="item.coverPhoto"
          square
          sizes="(min-width: 640px) 128px, 80px"
        />
      </component>
    </div>

    <!-- `min-w-0` so a long unbroken title wraps instead of pushing the circle off the row. -->
    <div class="min-w-0 flex-1">
      <h2 class="type-display-sm text-ink">
        <component :is="link.is" v-bind="link" class="transition-opacity hover:opacity-60">
          {{ item.title }}
        </component>
      </h2>

      <p class="type-byline text-muted">
        <!-- A link out names its publication; a post is on this site and does not need to say
             so. Both carry the date, which is what orders her writing everywhere. -->
        <template v-if="item._type === 'article'">{{ item.publication }} &middot; </template>
        <time :datetime="item.publishedAt">{{ formatDate(item.publishedAt) }}</time>
      </p>

      <p v-if="item.summary" class="type-body-serif-md mt-2">
        {{ item.summary }}
      </p>

      <component
        :is="link.is"
        v-bind="link"
        :aria-label="`Read more: ${item.title}`"
        class="type-body-sm-strong mt-4 inline-block uppercase tracking-[0.12em] text-ink hover:underline"
      >
        Read More
      </component>
    </div>
  </li>
</template>
