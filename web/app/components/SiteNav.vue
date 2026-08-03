<script setup lang="ts">
import { SITE } from '~/content/site'

/**
 * The horizontal nav.
 *
 * Her Squarespace collapses this to the active item plus a chevron dropdown on narrow
 * screens. With four short words there is no reason to: they fit a 390px viewport at
 * reduced size and tracking. Keeping all four visible means no JS, no open/closed state,
 * and nothing that can be left hanging open — a deliberate departure, not an oversight.
 *
 * NuxtLink sets `aria-current="page"` on the active route, so the crimson active colour
 * and the accessible state come from the same source rather than being tracked separately.
 */
</script>

<template>
  <nav aria-label="Main">
    <ul class="flex items-center justify-center gap-6 sm:gap-9">
      <li v-for="item in SITE.nav" :key="item.to">
        <NuxtLink
          :to="item.to"
          class="text-muted hover:text-ink aria-[current=page]:text-accent text-[0.8125rem] font-medium uppercase tracking-[0.2em] transition-colors sm:text-base"
        >
          {{ item.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
