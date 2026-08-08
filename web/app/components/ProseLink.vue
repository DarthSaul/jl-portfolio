<script setup lang="ts">
import type { PortableTextMarkComponentProps } from '@portabletext/vue'

/**
 * The `hyperlink` annotation from `proseText`, rendered.
 *
 * Named `hyperlink` in the schema rather than `link` so it cannot collide with the registered
 * `link` object type — see studio/schemaTypes/objects/proseText.ts. That name is what the mark
 * map in ProseText.vue keys on, so the two have to stay in step.
 *
 * The props type is imported rather than hand-written because a mark component is handed
 * `text`, `markType` and `renderNode` alongside the annotation itself, and declaring only the
 * bit we use makes the component unassignable to `PortableTextComponents`. `@portabletext/vue`
 * is not in package.json and does not need to be: it arrives with `@nuxtjs/sanity`, whose own
 * `SanityContent` types are declared in terms of it, so anything that types the `components`
 * prop at all already resolves it.
 *
 * Underline is deliberate here and deliberately absent from the editor's toolbar: the one
 * thing on the page allowed to look like a link is a link.
 *
 * ## The blue
 *
 * This is the only consumer of `--color-link`, and it should stay that way. DESIGN.md is a
 * strict black-and-white duet with exactly one chromatic exception, and it scopes that
 * exception tightly: the blue is "used only inside long-form article body copy, never on UI
 * buttons or navigation". So it lives on the annotation that only appears inside prose.
 *
 * `ProseHeading` is the one caller that can reach this from outside running prose — it renders
 * `homePage.featuredTitle`, which is `proseText` and can carry a link. That field is not
 * rendered anywhere at the moment; whatever component picks it up needs to neutralise both the
 * colour and the underline, the way `home/PhotoStrip.vue` used to.
 */
defineProps<PortableTextMarkComponentProps<{ _type: 'hyperlink', url?: string }>>()
</script>

<template>
  <a
    :href="value?.url"
    target="_blank"
    rel="noopener"
    class="text-link underline underline-offset-2 transition-colors hover:text-ink"
  ><slot /></a>
</template>
