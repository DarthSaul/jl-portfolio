<script setup lang="ts">
import { SITE } from '~/content/site'

/**
 * Wordmark, tagline, nav — centred, matching joanatstake.com.
 *
 * The wordmark sits on the page background with no block behind it. It is black at rest and
 * takes the site accent on hover, which is the same treatment every other link on the site
 * gets — one hover colour, not a second one invented for the header.
 */
</script>

<template>
  <header class="px-5 pt-10 pb-8 text-center sm:pt-14">
    <h1 class="leading-tight">
      <NuxtLink
        to="/"
        class="hover:text-accent inline-block text-[2.75rem] font-medium tracking-tight text-ink transition-colors sm:text-6xl lg:text-[4.3rem]"
      >
        {{ SITE.title }}
      </NuxtLink>
    </h1>

    <p
      class="mt-3 text-[0.8125rem] uppercase italic tracking-[0.3em] text-faint sm:text-[1.0625rem] sm:tracking-[0.35em]"
    >
      {{ SITE.tagline }}
    </p>

    <SiteNav class="mt-8 sm:mt-12" />
  </header>
</template>
