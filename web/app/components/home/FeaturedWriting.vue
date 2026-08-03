<script setup lang="ts">
import { NuxtLink } from '#components'
import type { HOME_QUERY_RESULT } from '~~/sanity.types'

type Home = NonNullable<HOME_QUERY_RESULT>

/**
 * Slot 6 — exactly three pieces of writing, posts and links out mixed.
 *
 * The heading is hardcoded rather than editable, which is the deliberate asymmetry with slot 7
 * directly below: that one has a title and subtitle she writes, this one does not. Three cards
 * of writing under the words "Featured Writing" needs no explanation, and a field she has to
 * fill in with the obvious answer is a field worth deleting.
 *
 * `post` and `article` are the same card with different destinations — that split is about
 * where the writing lives, not how it looks. A post goes to its page here; a link out goes to
 * the site that published it. The union discriminates cleanly because the query projects
 * `_type` and conditionally projects `slug` or `url` beside it.
 *
 * ## Why the card is a subgrid
 *
 * Cover photos are whole photo documents and keep their own proportions, so three cards can
 * hold a panorama, a square and a portrait. Left alone, each card stacks under its own photo
 * and the three headlines start at three different heights — measured at a 127px spread on the
 * current content, which reads as a broken row rather than a deliberate one.
 *
 * The fix that is *not* available is the usual one: crop all three to a common shape. Rule 2
 * forbids it and there is no hotspot to crop around. So the cards share row lines instead:
 * `subgrid` gives the row exactly **two** shared rows — the thumbnail area, and everything
 * else. The thumbnail row is one uniform height across all three cards, which is what makes
 * every headline start on the same line.
 *
 * Photos sit at the **top** of that row (`self-start`), so each card reads top-down from a
 * common edge. A photo shorter than the row leaves space beneath it before the headline, and
 * that gap is the honest cost of not cropping — it is most visible on the current content,
 * where one cover is 2.83:1 against another at 1.33:1.
 *
 * Everything below the headline is deliberately *not* aligned. It shares one grid row and
 * flows naturally inside it, so summaries of different lengths push their own "Read more" down
 * independently rather than being stretched to a common baseline.
 *
 * Below `md` the cards are one per row and none of this applies, which is why it is all
 * `md:`-prefixed. `md:gap-y-0` is part of that: the `gap-10` that separates stacked cards on a
 * phone would otherwise reappear as a 40px gutter between the two shared rows on desktop.
 */
const props = defineProps<{ items: Home['featuredWriting'] }>()

/**
 * Each card paired with everything its three links need — photo, headline and "Read more" all
 * point at the same place, so the binding is worked out once per card rather than three times
 * per render.
 *
 * NOTE: `/writing/[slug]` does not exist yet — CLAUDE.md's route table marks it "not built
 * yet". A post links to its eventual address rather than to nowhere, so the front page is
 * already right the day that route lands. Until then a featured post 404s, and Vue Router says
 * so in the dev log every render. That warning is pointing at real unfinished work and is left
 * to keep doing it.
 */
const cards = computed(() =>
  props.items.map(item => ({
    item,
    link:
      item._type === 'article'
        ? { is: 'a', href: item.url, target: '_blank', rel: 'noopener' }
        : { is: NuxtLink, to: `/writing/${item.slug}` },
  })),
)

/**
 * `publishedAt` is a plain `YYYY-MM-DD` date, which `new Date()` reads as UTC midnight.
 * Formatting it in the server's timezone and again in the visitor's would land on different
 * days for anyone west of Greenwich and trip a hydration mismatch, so the timezone is pinned.
 */
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
</script>

<template>
  <section>
    <h2 class="text-2xl font-normal text-muted sm:text-3xl">
      Featured Writing
    </h2>

    <!-- Straight from one column to three. Two columns orphans the third card into a row of
         its own with a half-page of white space beside it, and the schema guarantees there are
         always exactly three, so the awkward middle step is worth skipping.
         The two shared rows are: thumbnail area, then everything else. -->
    <ul class="mt-8 grid gap-10 md:grid-cols-3 md:grid-rows-[auto_auto] md:gap-y-0">
      <li
        v-for="{ item, link } in cards"
        :key="item._id"
        class="md:row-span-2 md:grid md:grid-rows-subgrid"
      >
        <!-- The photo, the headline and "Read more" are three hit areas for one destination.
             Only the headline carries an accessible name: the photo link is hidden from
             assistive tech and skipped by the keyboard, so a screen reader hears one
             meaningful link per card rather than three.

             The wrapper is rendered even when there is no cover photo, so the card still
             occupies the thumbnail row and its headline stays on the shared line. -->
        <component
          :is="link.is"
          v-bind="link"
          tabindex="-1"
          aria-hidden="true"
          class="block md:self-start"
        >
          <SanityPhoto
            v-if="item.coverPhoto"
            :photo="item.coverPhoto"
            sizes="(min-width: 768px) 33vw, 100vw"
          />
        </component>

        <!-- One grid row for the rest, flowing freely inside it. -->
        <div>
          <h3 class="mt-5 text-xl leading-snug sm:text-2xl">
            <component :is="link.is" v-bind="link" class="transition-colors hover:text-accent">
              {{ item.title }}
            </component>
          </h3>

          <!-- Back to `text-sm`, now carrying `font-medium`. It was bumped to `text-base` when
               the only face available was Thin and 14px grey was unreadable in a 100-weight;
               with the real family declared, 500 does that job without costing the size step
               that separates this line from the summary below it. -->
          <p class="mt-2 text-sm font-medium text-muted">
            <!-- A link out names its publication; a post is on this site and does not need to
                 say so. Both carry the date, which is what orders her writing everywhere. -->
            <template v-if="item._type === 'article'">{{ item.publication }} &middot; </template>
            <time :datetime="item.publishedAt">{{ formatDate(item.publishedAt) }}</time>
          </p>

          <p v-if="item.summary" class="mt-3 text-base leading-relaxed text-ink">
            {{ item.summary }}
          </p>

          <!-- "Read more" is meaningless out of context, and a screen reader can pull links
               out of context. The aria-label names the destination; the arrow is decorative. -->
          <component
            :is="link.is"
            v-bind="link"
            :aria-label="`Read more: ${item.title}`"
            class="mt-3 inline-block text-base font-medium text-muted transition-colors hover:text-accent"
          >
            Read more <span aria-hidden="true">&rarr;</span>
          </component>
        </div>
      </li>
    </ul>
  </section>
</template>
