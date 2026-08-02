<script setup lang="ts">
import { SITE } from '~/content/site'

/**
 * The title template lives here rather than in `nuxt.config.ts` because Nuxt cannot
 * serialise a function into `app.head` — the function form has to be set at runtime.
 *
 * A page sets its own `title` and gets " · Joan Lebow" appended; the home page sets none
 * and gets the bare wordmark, matching how her current site titles itself.
 */
useHead({
  titleTemplate: title => (title ? `${title} · ${SITE.title}` : SITE.title),
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
