<script setup lang="ts">
import { ProseLink } from '#components'
import type { ProseText } from '~~/sanity.types'

/**
 * Renders a `proseText` field — the front page's introduction and blurb.
 *
 * The rendering is delegated to `SanityContent`, which `@nuxtjs/sanity` bundles and
 * auto-registers. That is not a new dependency and not a step towards long-form writing in the
 * CMS: `proseText` allows one style, two decorators and one annotation, and CLAUDE.md's ban is
 * on rich-text *article bodies*, which is what /writing links out to other sites for.
 *
 * It is worth saying why this is not hand-rolled, given how small the allowed subset is. Marks
 * in Portable Text are a flat array of ids on each span, and turning that back into correctly
 * nested elements — an italic inside a link, a link that spans a bold run — is the one genuinely
 * fiddly part of the format. `SanityContent` already does it, and is already installed.
 *
 * Only the pieces the schema can actually produce are overridden. Anything else — a heading, a
 * list, a code decorator — cannot appear, because `objects/proseText.ts` replaces Sanity's
 * defaults rather than extending them.
 */
defineProps<{ value: ProseText }>()

const components = {
  marks: {
    hyperlink: ProseLink,
  },
}
</script>

<template>
  <div class="space-y-6">
    <SanityContent :value="value" :components="components" />
  </div>
</template>
