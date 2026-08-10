<script setup lang="ts">
import type { TagOption } from '~/queries/allShots'

/**
 * The tag filter row on /shots/all.
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
 * ## Many at once, and no ALL
 *
 * Each chip toggles its own tag in or out of the selection, and the selection is a **union**:
 * a photograph carrying any selected tag is shown. Adding a filter therefore always widens the
 * set, which is what makes ticking a second one safe — with roughly one trip tag per
 * photograph, an intersection would empty the page on the second click.
 *
 * The ALL chip is gone. It existed to express "no filter" as something to click, and under
 * multiple selection that state has a better name: nothing is selected. What replaces it is
 * CLEAR, which appears only when there is something to clear — a control present exactly when
 * it does something, rather than one permanently on screen and usually already active.
 *
 * ## Links, not buttons
 *
 * Each filter is a `NuxtLink` and the state lives in the query string. That makes a filtered
 * view shareable and bookmarkable, gives back/forward the behaviour a visitor expects for
 * free, and means the filtered page server-renders — the alternative, a `<button>` mutating
 * local state, would leave the URL describing a page nobody is looking at.
 *
 * `aria-current="page"` marks each active filter rather than `aria-pressed`, because these are
 * links to locations and not toggles. It also means the active styling and the accessible
 * state come from the same attribute rather than being tracked twice. That reading survives
 * multi-select: each chip still names a location, and several of them can be part of where you
 * currently are.
 */
const props = defineProps<{
  /**
   * Only tags actually carried by visible photographs — see `tagsInUse` in the query, which
   * also does the ordering now.
   *
   * `TagOption[]` is read off the generated query result. It used to be `PhotoTag[]`, a union
   * of string literals from the schema's hardcoded vocabulary, paired with a `TAG_LABELS` map
   * in the app that the compiler kept exhaustive. Both are gone: a tag is a document, so its
   * name arrives with the query and there is no second copy to keep honest.
   */
  tags: TagOption[]
  /**
   * The slugs currently selected. Empty means unfiltered.
   *
   * Plain `string[]`, deliberately not narrowed — for the reason the single `active` string was
   * not: it comes off the query string, where a visitor can type anything, and narrowing it
   * would mean asserting a union over input nothing validates. It is only ever compared.
   */
  active: string[]
}>()

const BASE
  = 'type-body-sm-strong inline-block border border-ink px-4 py-2 uppercase tracking-[0.1em] '
    + 'transition-colors text-ink hover:bg-ink hover:text-canvas '
    + 'aria-[current=page]:bg-ink aria-[current=page]:text-canvas'

const isActive = (slug: string) => props.active.includes(slug)

/**
 * Where a chip goes: the current selection with this tag added or removed.
 *
 * Sorted, so `?tag=a&tag=b` and `?tag=b&tag=a` are one address rather than two that render
 * identically — the same instinct that keeps the unfiltered page free of an empty parameter.
 *
 * The `tag` key is dropped rather than set to `[]` when nothing is left, so clearing the last
 * chip lands on the canonical `/shots/all`.
 */
const toggleTo = (slug: string) => {
  const next = isActive(slug)
    ? props.active.filter(value => value !== slug)
    : [...props.active, slug].sort()

  return next.length ? { path: '/shots/all', query: { tag: next } } : { path: '/shots/all' }
}
</script>

<template>
  <nav aria-label="Filter photos">
    <ul class="flex flex-wrap gap-2">
      <li v-for="tag in tags" :key="tag.slug">
        <NuxtLink
          :to="toggleTo(tag.slug)"
          :aria-current="isActive(tag.slug) ? 'page' : 'false'"
          :class="BASE"
        >
          {{ tag.title }}
        </NuxtLink>
      </li>

      <!-- Only when there is something to clear. Underlined text rather than a bordered chip,
           so it reads as an action on the row instead of a seventh tag in it — the same
           treatment the empty state's way back already uses. -->
      <li v-if="active.length">
        <NuxtLink
          :to="{ path: '/shots/all' }"
          class="type-body-sm-strong inline-block px-2 py-2 uppercase tracking-[0.1em] text-muted underline transition-colors hover:text-ink"
        >
          Clear
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
