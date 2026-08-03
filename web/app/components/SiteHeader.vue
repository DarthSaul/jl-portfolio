<script setup lang="ts">
import { SITE } from '~/content/site'

/**
 * Wordmark, tagline, nav — centred, matching joanatstake.com.
 *
 * The wordmark sits on the page background with no block behind it. It is black at rest and
 * takes the site accent on hover, which is the same treatment every other link on the site
 * gets — one hover colour, not a second one invented for the header.
 *
 * Tracking is `em`, not `rem`, and that is the whole reason it is 0.05 rather than 0.2:
 * letter-spacing in `rem` is a fixed pixel gap that does not scale, so a value tuned for the
 * 68.8px desktop wordmark would look blown apart at the 44px phone size. In `em` it stays
 * proportional at every step of the ladder, and 0.05em is ~0.2rem at the desktop size.
 *
 * Weights are real again — the full Typekit family is declared, not just Thin — so the
 * wordmark's 500 renders as Proxima Nova Medium instead of collapsing onto the 100 face.
 *
 * The byline's weight has exactly three settings below bold, and that is worth knowing before
 * reaching for a fourth: the kit licenses italics at 100, 300, 400 and 700 with **no 500**.
 * CSS weight matching resolves a requested 500 down to 400, so `font-medium` here would be
 * indistinguishable from `font-normal`. 400 is the middle of what actually exists — 300 and
 * 100 are the steps down, 700 is the only step up. Anything between 400 and 700 needs the
 * upright face, which would mean dropping the italic. See app/assets/css/tailwind.css.
 */
</script>

<template>
  <header class="px-5 pt-10 pb-8 text-center sm:pt-14">
    <h1 class="leading-tight">
      <NuxtLink
        to="/"
        class="hover:text-accent inline-block text-[2.75rem] font-medium tracking-[0.05em] text-ink transition-colors sm:text-6xl lg:text-[4.3rem]"
      >
        {{ SITE.title }}
      </NuxtLink>
    </h1>

    <p
      class="mt-3 text-[0.8125rem] font-normal uppercase italic tracking-[0.3em] text-faint sm:text-[1.0625rem] sm:tracking-[0.35em]"
    >
      {{ SITE.tagline }}
    </p>

    <SiteNav class="mt-8 sm:mt-12" />
  </header>
</template>
