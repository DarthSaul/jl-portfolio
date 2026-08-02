<script setup lang="ts">
import type { Article } from '~/content/writing'

/**
 * One row of the COPY list: circular photo, centred title, subtitle, left-aligned teaser,
 * centred READ MORE.
 *
 * Sizes come from measuring joanatstake.com/copy/writing-list: 250px circle, 750px text
 * column, 28px between blocks. The circle shrinks on a phone; nothing else changes, because
 * the layout is already one column.
 *
 * Every link points at the same outbound URL — the photo, the title and READ MORE are three
 * hit areas for one destination. Only the title carries an accessible name; the photo link is
 * `aria-hidden` and READ MORE gets an `aria-label` that names the article, so a screen reader
 * hears one meaningful link rather than three, one of which says "Read more" about nothing.
 */
defineProps<{ article: Article }>()
</script>

<template>
  <article class="mx-auto max-w-[750px] px-5">
    <a
      :href="article.href"
      target="_blank"
      rel="noopener"
      tabindex="-1"
      aria-hidden="true"
      class="mx-auto block size-44 overflow-hidden rounded-full sm:size-[15.625rem]"
    >
      <SitePhoto v-bind="article.photo" sizes="250px" />
    </a>

    <h2 class="mt-7 text-center text-2xl font-light leading-snug sm:text-[1.5625rem]">
      <a
        :href="article.href"
        target="_blank"
        rel="noopener"
        class="hover:text-accent transition-colors"
      >
        {{ article.title }}
      </a>
    </h2>

    <p class="mt-2 text-center text-base text-muted">
      {{ article.subtitle }}
    </p>

    <div class="mt-7 space-y-7 text-lg font-light leading-relaxed sm:text-xl">
      <RichParagraph v-for="(para, i) in article.content" :key="i" :runs="para" />
    </div>

    <p class="mt-7 text-center">
      <a
        :href="article.href"
        target="_blank"
        rel="noopener"
        :aria-label="`Read more: ${article.title}`"
        class="hover:text-accent text-sm uppercase tracking-[0.2em] text-muted transition-colors"
      >
        Read More
      </a>
    </p>
  </article>
</template>
