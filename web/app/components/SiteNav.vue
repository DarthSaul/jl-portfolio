<script setup lang="ts">
import { SITE } from '~/content/site'
import { NAV_QUERY } from '~/queries/nav'

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

/**
 * Prefix matching, with `/` as the one exception.
 *
 * The general rule exists because `/writing/<slug>` should light WRITING — vue-router only sets
 * `aria-current` on an exact match, so a post page would otherwise highlight nothing.
 *
 * `/` is exact for the obvious reason: every path starts with it.
 *
 * `/shots` used to need the same treatment, because it was a top-level item whose children were
 * all listed separately under START — so a prefix match lit two entries in two groups for one
 * page. That item is gone, and with it the exception; the `/shots/*` pages are now *only* in the
 * sub-nav, where each matches itself exactly.
 */
const isActive = (to: string) =>
  to === '/'
    ? route.path === '/'
    : route.path === to || route.path.startsWith(`${to}/`)

/**
 * The galleries listed under START — the one part of this nav that is content rather than
 * route table. See `~/queries/nav` for why that split exists and why it stops where it does.
 *
 * `error` is swallowed on purpose, and it is the only place on the site that does that. Every
 * route that queries Sanity throws on failure, because a page with no content is a broken page.
 * This is chrome on *every* page: a Sanity outage taking down the whole site because the nav
 * could not list four galleries would be a worse failure than the one it reports. So a failed
 * query means no sub-items, the four hardcoded links still work, and the page the visitor
 * actually came for still renders.
 *
 * `useSanityQuery` is `useAsyncData` underneath and keys on the query, so the sidebar living in
 * the layout means this is fetched once and reused across client-side navigations rather than
 * re-run per page.
 */
const { data } = await useSanityQuery(NAV_QUERY)

/**
 * The gallery this nav pins to the top, by slug.
 *
 * This is app code naming one of her documents, which is a coupling worth being explicit
 * about rather than burying. It is here because "Life" is her ongoing body of work and the
 * trips are episodes of it, so alphabetical order — which would drop it between Chile and
 * Mexico — reads as a list of equals when it is not one.
 *
 * It fails softly in every direction. Rename the gallery and the pin still works, because it
 * matches on slug rather than title. Change the slug, or delete the gallery, and the pin
 * simply finds nothing and the rest of the list is unaffected; nothing breaks and no page
 * disappears.
 *
 * The shaped fix, if the order ever needs to be hers rather than ours, is an explicit ordering
 * field on `gallery` — which is a schema change and a new knob, and not worth it for one pin.
 */
const PINNED_FIRST = 'life'

/**
 * The sub-nav under START: the pinned gallery, then the rest, then the index.
 *
 * EVERYTHING is added in code rather than fetched, because it is a route we ship and not
 * content she made — the same reason the four top-level items live in `content/site.ts`. It is
 * also why it survives a Sanity outage along with them: `data` failing empties the galleries
 * and leaves this one standing.
 *
 * It sits last. The galleries above it are the curated views and this is the unfiltered pile
 * behind them, so the list reads as her selections first and the catch-all at the bottom —
 * which is also the order someone browsing wants them in.
 *
 * `data` is null both while loading and on failure, and `?? []` collapses the two into "no
 * galleries" — the same rendering either way, and the only reason the swallowed error above is
 * safe.
 */
const subNav = computed(() => {
  const galleries = (data.value ?? []).map(gallery => ({
    key: gallery._id,
    title: gallery.title,
    to: `/shots/${gallery.slug}`,
    slug: gallery.slug,
  }))

  // A stable partition rather than a comparator: the query already returns title A–Z, and
  // `sort` with a "pinned first" comparator would only preserve the rest of that order because
  // V8's sort happens to be stable. Splitting the list says what is meant and does not depend
  // on that.
  const pinned = galleries.filter(g => g.slug === PINNED_FIRST)
  const rest = galleries.filter(g => g.slug !== PINNED_FIRST)

  return [
    ...pinned,
    ...rest,
    { key: 'everything', title: 'Everything', to: '/shots/everything', slug: 'everything' },
  ]
})

/**
 * Open by default, and kept in a plain `ref` on purpose.
 *
 * `SiteNav` is rendered once, inside the sidebar, inside the layout — so it does not unmount on
 * a route change and this survives client-side navigation without any storage. It resets on a
 * full reload, which is the right default for a nav: the list is how these pages are found, so
 * a visitor arriving fresh should see it.
 *
 * It is deliberately *not* forced open when one of its items is the current page. That would
 * re-open the group under someone who had just collapsed it and then clicked something in it,
 * which reads as the control being broken rather than helpful.
 */
const subNavOpen = ref(true)
</script>

<template>
  <nav aria-label="Main">
    <ul class="flex flex-col gap-4">
      <template v-for="item in SITE.nav" :key="item.to">
        <li :class="item.to === '/' && 'flex items-center gap-2'">
          <NuxtLink
            :to="item.to"
            :aria-current="isActive(item.to) ? 'page' : 'false'"
            class="type-body-sm-strong inline-block uppercase tracking-[0.16em] text-muted transition-colors hover:text-ink aria-[current=page]:text-ink"
          >
            {{ item.label }}
          </NuxtLink>

          <!--
            A separate control rather than making START itself the toggle. START is a link to a
            real page and has to stay one; an element that both navigates and expands is the
            classic dropdown-nav trap, where a keyboard user can reach the section and never the
            page, or the reverse.

            `aria-controls` names the list, `aria-expanded` states which way it is, and the
            `aria-label` changes with it so a screen reader hears what the button will do rather
            than only what it is. The chevron is `aria-hidden` — it repeats the state visually
            and would otherwise be announced as a second, wordless thing.
          -->
          <button
            v-if="item.to === '/'"
            type="button"
            class="-m-1 p-1 text-muted transition-colors hover:text-ink"
            :aria-expanded="subNavOpen"
            aria-controls="site-subnav"
            :aria-label="subNavOpen ? 'Hide photo pages' : 'Show photo pages'"
            @click="subNavOpen = !subNavOpen"
          >
            <svg
              class="size-3.5 transition-transform"
              :class="{ '-rotate-90': !subNavOpen }"
              viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </li>

        <!--
          The galleries, nested under START.

          A real nested `<ul>` inside START's own `<li>` would be the textbook markup, and it is
          wrong here: these pages are not children of `/`, they are `/shots/<slug>`. Nesting
          them under START would tell a screen reader they are sub-pages of the front page,
          which is a claim about structure that is not true. They are a flat sibling group that
          happens to sit under START visually — hence the indent, the smaller type, and the
          `aria-label` naming what the group is.

          `-mt-2` is doing real work, not nudging. This group is a sibling `<li>` inside a
          `gap-4` column, so it inherits the same 16px that separates two top-level items —
          which reads as a fifth peer rather than as START's children. Pulling it back 8px
          halves that, so the gap above the group is visibly tighter than the gap between the
          items around it, which is the whole signal that they belong to START.

          `v-show`, not `v-if`, and that is an accessibility requirement rather than a
          preference: `aria-controls` on the button above points at this list by id, and `v-if`
          would remove the element it names, leaving the attribute referencing nothing whenever
          the group is closed — which is exactly when it is being read.
        -->
        <li v-if="item.to === '/'" v-show="subNavOpen" class="-mt-2">
          <ul id="site-subnav" aria-label="Photos" class="flex flex-col gap-2 pl-3">
            <li v-for="sub in subNav" :key="sub.key">
              <NuxtLink
                :to="sub.to"
                :aria-current="isActive(sub.to) ? 'page' : 'false'"
                class="type-body-sm inline-block uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink aria-[current=page]:text-ink"
              >
                {{ sub.title }}
              </NuxtLink>
            </li>
          </ul>
        </li>
      </template>
    </ul>
  </nav>
</template>
