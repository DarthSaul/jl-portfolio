<script setup lang="ts">
import { WRITING_QUERY } from '~/queries/writing'

/**
 * COPY — her writing, newest first, posts and links out interleaved.
 *
 * No page heading, matching joanatstake.com/copy/writing-list: the nav already says COPY, so a
 * second "Copy" directly under it is a heading that repeats the tab you just clicked.
 *
 * One list, two destinations. A post opens its page here; a link out opens the site that
 * published it. `WritingListItem` decides which from `_type`, and the ordering is done in GROQ
 * across both types rather than merged here — see `~/queries/writing`.
 *
 * `writingPage` is allowed to be missing, unlike `homePage` on the front page. That document
 * holds a tab title and an optional intro, and the page's actual content is the list beside
 * it: absent, the cost is a paragraph, not a page. It does not exist in `development` today.
 *
 * When it does exist, its `title` is used bare — `titleTemplate: '%s'`, the same override
 * `pages/index.vue` uses — because the field's initial value is already "Writing — Joan Lebow"
 * and the default template would append her name to it a second time.
 */
const { data: writing } = await useSanityQuery(WRITING_QUERY)

useHead(
  computed(() =>
    writing.value?.page
      ? { title: writing.value.page.title, titleTemplate: '%s' }
      : { title: 'Copy' },
  ),
)
</script>

<template>
  <div v-if="writing" class="max-w-read">
    <p v-if="writing.page?.intro" class="type-body-serif-lg mb-12">
      {{ writing.page.intro }}
    </p>

    <!-- The `<ul>` moved up here from `WritingListItem`, which used to declare its own
         `mx-auto max-w-[750px] px-5` per row. Seven rows are one list, so the measure belongs
         to the list.

         The hairlines under each row are gone, so space is the only thing separating them now
         and it has to do that job alone: `space-y-12` is wider than the gap a divider needed,
         because a rule can hold two rows apart at a distance that would otherwise read as one
         run-on block. Each row's own thumbnail is what anchors it. -->
    <ul class="space-y-12">
      <WritingListItem v-for="item in writing.items" :key="item._id" :item="item" />
    </ul>
  </div>
</template>
