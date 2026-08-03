<script setup lang="ts">
import { WRITING } from '~/content/writing'

/**
 * COPY — the list of articles, every one of them linking out.
 *
 * No page heading, matching joanatstake.com/copy/writing-list: the nav already says COPY, so
 * a second "Copy" directly under it is a heading that repeats the tab you just clicked.
 *
 * No article bodies live in this project — that is a stated non-goal in CLAUDE.md — so there
 * is no /writing/[slug] route to add later. Each item's `href` is the whole destination.
 */
useHead({ title: 'Copy' })
</script>

<template>
  <div class="space-y-20 py-4 pb-16 sm:space-y-24">
    <!-- Keyed by index: the placeholders are six copies of one object and have no id to key
         on. Becomes `_id` when these come from Sanity. -->
    <WritingArticleListItem
      v-for="(article, i) in WRITING.items"
      :key="i"
      :article="article"
    />
  </div>
</template>
