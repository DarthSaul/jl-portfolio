<script setup lang="ts">
import type { FunctionalComponent } from 'vue'
import { ProseLink } from '#components'
import type { ProseText } from '~~/sanity.types'

/**
 * Renders a `proseText` field as a heading — the front page's photos-section title, and so far
 * the only editable heading on the site that can carry emphasis or a link.
 *
 * ## Why this is not just `ProseText`
 *
 * Portable Text renders one element per block, and for a `normal` block that element is a `<p>`.
 * Pointing `ProseText` at a heading would therefore produce a `<div>` wrapping a `<p>` styled to
 * look like a heading — no `<h2>` in the document outline, and nothing for a screen reader to
 * navigate by. So the `<h2>` below is the real element, and each block renders as nothing but
 * its children.
 *
 * That arrangement is forced by `SanityContent`, which sets `inheritAttrs: false` and returns
 * `PortableText` with no wrapper element of its own. A `class` handed to it is dropped on the
 * floor — which is why `ProseText` has that `<div>`, and why a heading needs its own root here
 * rather than a class passed through. With a single root, typography classes arrive by ordinary
 * attribute fallthrough and stay at the call site where they belong.
 *
 * `featuredTitle` is capped at one block in the schema, so "each block" is only ever one.
 */
defineProps<{ value: ProseText }>()

/** A block renders as its children alone; the heading element is the template's `<h2>`. */
const Unwrapped: FunctionalComponent = (_props, { slots }) => slots.default?.()

// Returning the children makes this a fragment, which has no single root to inherit attributes
// onto — without this, every render warns about the block props Portable Text passes down.
Unwrapped.inheritAttrs = false

const components = {
  block: { normal: Unwrapped },
  marks: { hyperlink: ProseLink },
}
</script>

<template>
  <h2>
    <SanityContent :value="value" :components="components" />
  </h2>
</template>
