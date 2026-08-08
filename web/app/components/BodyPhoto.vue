<script setup lang="ts">
import type { PortableTextComponentProps } from '@portabletext/vue'
import type { POST_QUERY_RESULT } from '~~/sanity.types'

/** The `postPhoto` member of a body, read off the generated result rather than restated. */
type PostPhoto = Extract<NonNullable<POST_QUERY_RESULT>['body'][number], { _type: 'postPhoto' }>

/**
 * A photograph between two paragraphs — the `postPhoto` member of a body, whether that body
 * is a writing post or the About page. Rendered by `ProseBody`, which is the only caller.
 *
 * RULE 1 at the render layer. Everything shown here belongs to the photo document: the
 * caption below, and the alt text `SanityPhoto` reads for itself. Nothing is passed in by the
 * essay that contains it, so fixing a caption in the Studio fixes it in every post the
 * photograph appears in.
 *
 * RULE 2. `layout` is a preset, not a positioning control — a fixed list of two, no numbers,
 * each branch responsive on its own terms. `objects/postPhoto.ts` argues that distinction at
 * length; the short version is that she chooses *which arrangement*, never a measurement, and
 * both arrangements work at every width without her checking.
 *
 * A third value would be a value in that list and a branch here, always together. Note the
 * `satisfies` on the class map below: it is exhaustive over the schema's own union, so adding
 * a value in the Studio and forgetting the branch is a typecheck failure rather than a photo
 * that silently renders as something else. Same guarantee `PRESETS` gives in
 * `pages/shots/[slug].vue`.
 *
 * ## Two things this component still does not decide
 *
 * **Which side a wrapped photograph takes.** That alternates down the page and therefore
 * depends on how many wrapped photographs came before it, which this component cannot see.
 * `ProseBody` counts and passes `side`. It is a consequence of document order, not a field.
 *
 * **What a missing `layout` means.** Every photograph placed before the field existed has no
 * value, and `?? 'wrap'` is what keeps those rendering exactly as they always did rather than
 * silently rearranging her published posts. The schema leaves the field optional for the same
 * reason.
 */
const props = defineProps<
  PortableTextComponentProps<PostPhoto> & {
    /** Which way a wrapped photo floats. Ignored when the layout is full width. */
    side?: 'left' | 'right'
  }
>()

const layout = computed(() => props.value.layout ?? 'wrap')

/**
 * `md:` throughout, because none of this applies on a phone. A 350px float in a 390px viewport
 * leaves an unreadable ribbon of text beside it, so below `md` every photograph is full width
 * whatever she picked — which is the one place the preset is overridden, and it is overridden
 * towards the arrangement that always works.
 *
 * `md:clear-both` on the wrapped variant is what stops two photographs landing side by side
 * when they fall close together in the text: each one starts below the last.
 */
const LAYOUTS = {
  wrap: 'w-full md:mb-4 md:w-[350px] md:clear-both',
  full: 'w-full',
} satisfies Record<NonNullable<PostPhoto['layout']>, string>

const FLOAT = { right: 'md:float-right md:ml-8', left: 'md:float-left md:mr-8' }

// `sizes` follows the layout, not the viewport: a wrapped photo never exceeds 350px, while a
// full-width one fills the 750px reading measure. Asking for the larger ladder in both cases
// would download roughly four times the pixels a wrapped photo can show.
const sizes = computed(() =>
  layout.value === 'full'
    ? '(min-width: 768px) 750px, 100vw'
    : '(min-width: 768px) 350px, 100vw',
)
</script>

<template>
  <figure :class="[LAYOUTS[layout], layout === 'wrap' && side && FLOAT[side]]">
    <SanityPhoto :photo="value.photo" :sizes="sizes" />

    <figcaption v-if="value.photo.caption" class="type-caption mt-3 text-muted">
      {{ value.photo.caption }}
    </figcaption>
  </figure>
</template>
