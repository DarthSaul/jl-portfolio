<script setup lang="ts">
import { tagLabel } from '~/content/tags'

/**
 * The tag filter row on /shots/everything.
 *
 * DESIGN.md has no filter component, so this is built from the two it does define, used at
 * their stated polarity: `button-outline` (canvas fill, 1px ink border, ink text) for the
 * inactive state and `button-primary` (ink fill, canvas text) for the active one. Square
 * corners, because the spec calls `{rounded.none}` non-negotiable and a pill would be the one
 * shape on the site that is neither square nor a social icon.
 *
 * The type is `body-sm-strong` rather than the spec's `button-md`. `button-md` is 16px/700 and
 * sized for a CTA someone clicks once; a row of six of them is a wall. 14px/700 uppercase is
 * what every other small structural label on this site already uses — the nav, READ MORE, the
 * eyebrow — so the row reads as navigation, which is what it is.
 *
 * ## Links, not buttons
 *
 * Each filter is a `NuxtLink` and the state lives in the query string. That makes a filtered
 * view shareable and bookmarkable, gives back/forward the behaviour a visitor expects for
 * free, and means the filtered page server-renders — the alternative, a `<button>` mutating
 * local state, would leave the URL describing a page nobody is looking at.
 *
 * `aria-current="page"` marks the active filter rather than `aria-pressed`, because these are
 * links to locations and not toggles. It also means the active styling and the accessible
 * state come from the same attribute rather than being tracked twice.
 */
defineProps<{
  /** Only tags actually carried by visible photographs — see `tagsInUse` in the query. */
  tags: string[]
  /** The active tag, or '' for everything. */
  active: string
}>()

const BASE
  = 'type-body-sm-strong inline-block border border-ink px-4 py-2 uppercase tracking-[0.1em] '
    + 'transition-colors text-ink hover:bg-ink hover:text-canvas '
    + 'aria-[current=page]:bg-ink aria-[current=page]:text-canvas'
</script>

<template>
  <nav aria-label="Filter photos">
    <ul class="flex flex-wrap gap-2">
      <li>
        <!-- No query param at all rather than `?tag=`, so the unfiltered page has one
             canonical address instead of two that render identically. -->
        <NuxtLink
          :to="{ path: '/shots/everything' }"
          :aria-current="active === '' ? 'page' : 'false'"
          :class="BASE"
        >
          All
        </NuxtLink>
      </li>

      <li v-for="tag in tags" :key="tag">
        <NuxtLink
          :to="{ path: '/shots/everything', query: { tag } }"
          :aria-current="active === tag ? 'page' : 'false'"
          :class="BASE"
        >
          {{ tagLabel(tag) }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
