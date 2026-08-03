<script setup lang="ts">
import type { PortableTextComponentProps } from '@portabletext/vue'
import type { PhotoProjection } from '~/queries/photo'

/**
 * A photograph between two paragraphs — the `postPhoto` member of a body, whether that body
 * is a writing post or the bio page. Rendered by `ProseBody`, which is the only caller.
 *
 * RULE 1 at the render layer. Everything shown here belongs to the photo document: the
 * caption below, and the alt text `SanityPhoto` reads for itself. Nothing is passed in by the
 * essay that contains it, so fixing a caption in the Studio fixes it in every post the
 * photograph appears in.
 *
 * RULE 2, and this is the component the rule is most likely to be broken in. `postPhoto`
 * carries a reference and nothing else — no width, no alignment, no full-bleed flag — and the
 * schema file says so at length. This component must stay equally bare: it renders at the
 * width of the column it is dropped into, at the photograph's own proportions. If a post ever
 * needs a photo to behave differently, that is a preset conversation, not a prop.
 *
 * The props type is imported rather than written out because Portable Text hands a type
 * component `index`, `isInline` and `renderNode` alongside `value`; declaring only the part we
 * use would make the component unassignable to `PortableTextComponents`. `ProseLink.vue` does
 * the same thing for the mark side.
 */
defineProps<PortableTextComponentProps<{ _type: 'postPhoto', photo: PhotoProjection }>>()
</script>

<template>
  <!-- Full width on a phone; from `md` up it becomes a 350px column that the prose wraps
       around. Which side it takes is decided by `WritingPostBody`, because alternating needs
       to know the figure's position among its siblings and this component cannot see that.

       `clear-both` is what keeps two photographs from landing side by side when they fall
       close together in the text — each one starts below the last. -->
  <figure class="w-full md:mb-4 md:w-[350px] md:clear-both">
    <!-- 350px from `md` up, full viewport below it. -->
    <SanityPhoto :photo="value.photo" sizes="(min-width: 768px) 350px, 100vw" />

    <figcaption class="mt-3 text-sm text-muted" v-if="value.photo.caption">
      {{ value.photo.caption }}
    </figcaption>
  </figure>
</template>
