<script setup lang="ts">
import { SITE } from '~/content/site'

/**
 * The nav, stacked. Lives inside `SiteSidebar` at every width — a column on desktop, the body
 * of the drawer on a phone.
 *
 * Labels are stored sentence case in `SITE.nav` and uppercased in CSS, so assistive tech reads
 * "Copy" rather than spelling it out. That is why `uppercase` is a class here and deliberately
 * not baked into the `type-*` token.
 *
 * ## Active state, and the bug this fixes
 *
 * This used to be `aria-[current=page]:text-accent` and nothing else, leaning on NuxtLink to
 * set `aria-current`. It does — but only on an *exact* path match. `/writing/:slug()` is a
 * sibling route record rather than a child of `/writing`, so on a post page **no nav item was
 * highlighted at all**. Under a centred horizontal bar that was easy to miss; under a sidenav
 * that sits beside the reader the whole time, it reads as broken.
 *
 * So the active test is computed here: exact match for `/`, prefix match for everything else.
 * Active is ink against the muted grey of the rest — DESIGN.md is a strict black-and-white
 * duet, so weight and value carry the state and there is no accent colour to reach for.
 *
 * `aria-current` is bound to the string `'false'` rather than left undefined when inactive.
 * An explicit `aria-current="false"` is valid ARIA meaning "not the current item", and binding
 * it unconditionally keeps this attribute ours rather than half ours and half whatever
 * RouterLink computed and merged.
 */
const route = useRoute()

const isActive = (to: string) =>
  to === '/'
    ? route.path === '/'
    : route.path === to || route.path.startsWith(`${to}/`)
</script>

<template>
  <nav aria-label="Main">
    <ul class="flex flex-col gap-4">
      <li v-for="item in SITE.nav" :key="item.to">
        <NuxtLink
          :to="item.to"
          :aria-current="isActive(item.to) ? 'page' : 'false'"
          class="type-body-sm-strong inline-block uppercase tracking-[0.16em] text-muted transition-colors hover:text-ink aria-[current=page]:text-ink"
        >
          {{ item.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
