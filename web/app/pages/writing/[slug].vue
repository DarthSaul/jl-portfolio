<script setup lang="ts">
import { POST_QUERY } from '~/queries/writing'

/**
 * One post — writing that lives here rather than on someone else's site.
 *
 * This is the route `post.slug` exists for, and the one `HomeFeaturedWriting` has been linking
 * at since the front page landed. An `article` never reaches this page: it has no slug and no
 * body by design, because copying a publication's text here would be republishing their page.
 *
 * The cover photo is deliberately not fetched or shown. `post.ts` tells her it is "the small
 * photo shown beside this post where it is listed... Not shown on the post itself; put photos
 * in the writing below for that" — so showing it here would contradict the field's own
 * description, and the photos in the body are the ones she chose for the piece.
 *
 * The title is an `<h2>`: `SiteHeader` renders the wordmark as the page's `<h1>`. Subheadings
 * inside the body land on `<h3>` for the same reason — see `WritingPostBody`.
 */
const route = useRoute()

const { data: post } = await useSanityQuery(POST_QUERY, { slug: String(route.params.slug) })

/**
 * A slug with no post is a genuine 404, not a server error. Unlike the singletons, nothing
 * guarantees this document exists — the address may be one she changed, or one someone
 * mistyped, and the schema warns her that changing a slug breaks links already shared.
 */
const doc = post.value
if (!doc) {
  throw createError({
    statusCode: 404,
    statusMessage: 'No writing found at this address.',
    fatal: true,
  })
}

useHead({ title: doc.title })

// Most posts have no summary, and an empty description tag is worse than none.
useSeoMeta({ description: doc.summary || undefined })
</script>

<template>
  <article v-if="post" class="mx-auto max-w-[750px] px-5 py-4 pb-16">
    <h2 class="text-center text-2xl font-light leading-snug sm:text-[2rem]">
      {{ post.title }}
    </h2>

    <p class="mt-3 text-center text-base text-muted">
      <time :datetime="post.publishedAt">{{ formatDate(post.publishedAt) }}</time>
    </p>

    <p
      v-if="post.summary"
      class="mt-6 text-center text-lg font-light leading-relaxed text-muted sm:text-xl"
    >
      {{ post.summary }}
    </p>

    <ProseBody
      :value="post.body"
      class="mt-12 text-lg font-light leading-relaxed sm:text-xl"
    />
  </article>
</template>
