<script setup lang="ts">
import { WRITING_QUERY } from '~/queries/writing'

/**
 * Her writing — the newest piece led, the rest a ledger beneath it.
 *
 * One list, two destinations. A post opens its page here; a link out opens the site that
 * published it. `useWritingLink` decides which from `_type`, and the ordering is done in GROQ
 * across both types rather than merged here — see `~/queries/writing`.
 *
 * ## The heading came back
 *
 * This file used to argue against one: the nav already says COPY, so a second "Copy"
 * directly under it repeats the tab you just clicked. That is still true and it is no longer the
 * deciding fact. The page is now a composition rather than a stack — a lead story, a heavy rule,
 * a ledger — and a composition needs something to start at. Without the heading the eyebrow
 * LATEST is the first thing on the page, which reads as a label floating above nothing.
 * `shots/all.vue` sets the same precedent for the same reason.
 *
 * It is an `<h2>`: `SiteSidebar` renders the wordmark as the page's `<h1>`, so a piece's own
 * title is an `<h3>` below this.
 *
 * ## The lead is hers to choose, and by default it is the newest
 *
 * `page.featured` if she has set one, `items[0]` — the most recently published — otherwise.
 * This file used to say the lead was chosen by date and that there was deliberately no toggle;
 * she asked for the choice, and `writingPage.featured` is it. The default did not move, and
 * that is what makes the reversal safe: an empty field *means* automatic, so there is no mode
 * to set inconsistently and nothing new to remember on a publish.
 *
 * The lead is filtered out of the ledger by `_id` rather than by position, because a featured
 * piece can sit anywhere in the list. `items[0]` and `page.featured` project to the same shape
 * through `WRITING_ITEM_PROJECTION`, so `writing/Lead.vue` takes either without a branch.
 *
 * ## `writingPage` is allowed to be missing
 *
 * Unlike `homePage` on the front page. That document holds a tab title and an optional intro,
 * and the page's actual content is the list beside it: absent, the cost is a paragraph, not a
 * page. It does not exist in `development` today.
 *
 * When it does exist, its `title` is used bare — `titleTemplate: '%s'`, the same override
 * `pages/index.vue` uses — because the field's initial value is already "Copy — Joan Lebow"
 * and the default template would append her name to it a second time.
 */
const { data: writing, error } = await useSanityQuery(WRITING_QUERY)

/**
 * `error` is checked before `writing`, because a failed request also leaves `writing` null and
 * the two mean opposite things. CLAUDE.md requires this of any route that runs a query, and this
 * page was the last one without it — a rejected origin here rendered an empty page identical to
 * an empty dataset.
 *
 * The CORS hint is in the message because it is the one cause invisible from the symptom: SSR
 * sends no `Origin` header, so a hard load always works and only navigating away and back fails.
 * See the CORS note in CLAUDE.md, and the longer version of this comment in `pages/index.vue`.
 */
if (error.value) {
  throw createError({
    statusCode: 502,
    statusMessage: 'Bad Gateway',
    message:
      'Could not reach Sanity — see the logged cause. If this appears only after ' +
      "navigating between pages, this origin is missing from the project's CORS allowlist.",
    fatal: true,
    cause: error.value,
  })
}

const lead = computed(() => writing.value?.page?.featured ?? writing.value?.items[0])

const ledger = computed(() =>
  (writing.value?.items ?? []).filter(item => item._id !== lead.value?._id),
)

/**
 * What the lead calls itself. LATEST is a claim about the date and stops being true the moment
 * she picks something older, so the word follows the reason rather than the position.
 */
const leadLabel = computed(() => (writing.value?.page?.featured ? 'Featured' : 'Latest'))

useHead(
  computed(() =>
    writing.value?.page
      ? { title: writing.value.page.title, titleTemplate: '%s' }
      : { title: 'Copy' },
  ),
)
</script>

<template>
  <!-- `max-w-read` and not the full column: the design's own measure is ~740px, which is what
       this token already is, and it keeps /copy in step with `writing/[slug].vue` and
       /bio. -->
  <div v-if="writing" class="max-w-read">
    <h2 class="type-display-lg text-ink">Copy</h2>

    <!-- Subordinate to the lead's summary on purpose — `body-serif-md` against its
         `body-serif-lg`. The design has no intro line here, but the field is hers and editable,
         and quietly dropping what she wrote into it is the wrong trade in a project where the
         editor wins. -->
    <p v-if="writing.page?.intro" class="type-body-serif-md mt-3 text-muted">
      {{ writing.page.intro }}
    </p>

    <WritingLead v-if="lead" :item="lead" :label="leadLabel" class="mt-8" />

    <!-- No `space-y`. `story-row` gives each row its own padding and the hairline that separates
         it from the next, so a gap set here would double up against the padding and pull the
         rules away from the rows they belong to. -->
    <ul>
      <WritingRow v-for="item in ledger" :key="item._id" :item="item" />
    </ul>
  </div>
</template>
