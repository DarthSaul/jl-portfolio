<script setup lang="ts">
import { ABOUT_QUERY } from '~/queries/about'

/**
 * BIO — a few paragraphs about her, with photographs among them.
 *
 * The same body renderer as a writing post, because it is the same field shape: `ProseBody`
 * handles the prose, the links inside it, and the photographs that wrap text around
 * themselves. The page adds nothing but the column it sits in.
 *
 * No page heading, for the reason /writing has none: the nav already says BIO, and a heading
 * repeating the tab you just clicked is a heading worth deleting. The `title` field is the
 * browser tab only, which is what the Studio tells her it is — and it is used bare, because
 * its initial value already ends in her name and the default template would append it twice.
 *
 * `aboutPage` is a singleton the Studio will not let her delete, so a missing document means
 * the dataset is wrong — the wrong name, or one never seeded. It throws rather than rendering
 * an empty page, the same call `pages/index.vue` makes and for the same reason. That is the
 * difference from /writing, where the missing singleton only costs an optional intro.
 */
const { data: about } = await useSanityQuery(ABOUT_QUERY)

const doc = about.value
if (!doc) {
  throw createError({
    statusCode: 500,
    statusMessage: 'No aboutPage document found in this dataset.',
    fatal: true,
  })
}

useHead({ title: doc.title, titleTemplate: '%s' })
</script>

<template>
  <div v-if="about" class="mx-auto max-w-[750px] px-5 py-4 pb-16">
    <ProseBody :value="about.body" class="text-lg font-light leading-relaxed sm:text-xl" />
  </div>
</template>
