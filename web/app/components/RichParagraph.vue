<script setup lang="ts">
import type { Paragraph } from '~/content/home'

/**
 * Renders a paragraph made of text runs, so an inline link or italic survives the trip
 * from the content file to the page.
 *
 * Deliberately tiny. CLAUDE.md rules out long-form writing in the CMS, so this must never
 * grow into a portable-text renderer — links and emphasis are the whole feature set.
 */
defineProps<{ runs: Paragraph }>()
</script>

<template>
  <p>
    <template v-for="(run, i) in runs" :key="i">
      <template v-if="typeof run === 'string'">{{ run }}</template>
      <a
        v-else-if="run.href"
        :href="run.href"
        target="_blank"
        rel="noopener"
        class="underline underline-offset-2 transition-colors hover:text-accent"
      >{{ run.text }}</a>
      <em v-else-if="run.em">{{ run.text }}</em>
      <template v-else>{{ run.text }}</template>
    </template>
  </p>
</template>
