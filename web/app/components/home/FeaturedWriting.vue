<script setup lang="ts">
import { HOME } from '~/content/home'

/**
 * Three writing cards: photo, title, excerpt, "Read more".
 *
 * Every card links out. CLAUDE.md is firm that no article bodies live in this project, so
 * there is no in-site destination for these and there should never be one — /writing will
 * be a list of outbound links, not a blog.
 */
const { featuredWriting } = HOME
</script>

<template>
  <section>
    <h2 class="text-2xl font-normal text-muted sm:text-3xl">
      {{ featuredWriting.heading }}
    </h2>

    <!-- Straight from one column to three. Two columns orphans the third card into a row
         of its own with a half-page of white space beside it — there are always exactly
         three of these, so the awkward middle step is worth skipping. -->
    <ul class="mt-8 grid gap-10 md:grid-cols-3">
      <li v-for="item in featuredWriting.items" :key="item.href">
        <a :href="item.href" target="_blank" rel="noopener" class="group block">
          <SitePhoto
            v-bind="item.photo"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
          <h3 class="mt-5 text-xl leading-snug transition-colors group-hover:text-accent sm:text-2xl">
            {{ item.title }}
          </h3>
        </a>

        <RichParagraph :runs="item.excerpt" class="mt-3 text-base leading-relaxed text-ink" />

        <!-- "Read more" is meaningless out of context, and a screen reader can pull links
             out of context. The aria-label names the destination; the arrow is decorative. -->
        <a
          :href="item.href"
          target="_blank"
          rel="noopener"
          :aria-label="`Read more: ${item.title}`"
          class="mt-3 inline-block text-base text-muted transition-colors hover:text-accent"
        >
          Read more <span aria-hidden="true">&rarr;</span>
        </a>
      </li>
    </ul>
  </section>
</template>
