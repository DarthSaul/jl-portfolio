<script setup lang="ts">
import type { PortableTextComponentProps } from '@portabletext/vue'
import type { FunctionalComponent } from 'vue'
import { BodyPhoto, ProseLink } from '#components'
import type { POST_QUERY_RESULT } from '~~/sanity.types'

type Body = NonNullable<POST_QUERY_RESULT>['body']

/**
 * A body of prose with photographs in it, rendered. Shared by `post.body` and
 * `aboutPage.body`, which are the same shape in the schema and get the same treatment here.
 *
 * It sits at the root of `components/` rather than under `writing/` for exactly that reason —
 * it was `WritingPostBody` while a post was the only thing with a body, and the bio page made
 * that name wrong. The prop is still typed off `POST_QUERY_RESULT`: the two bodies generate
 * structurally identical types, and picking the one that allows the most styles means the
 * renderer is checked against the widest input either caller can hand it.
 *
 * Like `ProseText`, this delegates to `SanityContent` rather than walking the blocks by hand.
 * Marks in Portable Text are a flat array of ids on each span, and turning that back into
 * correctly nested elements — an italic inside a link, a link spanning a bold run — is the
 * genuinely fiddly part of the format. That is also why `@portabletext/vue` is not in
 * package.json: `SanityContent` ships with `@nuxtjs/sanity` and already does this.
 *
 * Only what the schema can actually produce is overridden. `post.body` allows three styles,
 * two decorators, one annotation and one block type, because `objects/proseText.ts` replaces
 * Sanity's defaults rather than extending them — there are no lists, no h1, no code decorator
 * to write a component for. A partial map merges with the library's defaults, which is what
 * leaves `normal` as an ordinary paragraph and `strong`/`em` as `<strong>`/`<em>`.
 *
 * ## Why the "Subheading" style renders as an `<h3>`
 *
 * The style is *stored* as `h2` — that is the value in the schema, and Sanity's convention is
 * to name block styles after the element they resemble. It is not an instruction about depth.
 * On this site `SiteSidebar` puts the wordmark in an `<h1>` on every page and the post's own
 * title is the `<h2>`, so rendering a subheading as a literal `<h2>` would put it level with
 * the title of the piece it sits inside. `<h3>` is what the outline actually calls for.
 *
 * `inheritAttrs = false` on both: Portable Text passes each block component its block props,
 * and without this they land on the element as junk attributes and warn on every render. Same
 * reason `ProseHeading` sets it.
 */
const props = defineProps<{ value: Body }>()

const Subheading: FunctionalComponent = (_props, { slots }) =>
  h('h3', { class: 'type-display-sm mt-12' }, slots.default?.())
Subheading.inheritAttrs = false

/**
 * A hairline in the margin, which is the only elevation cue DESIGN.md gives — "surface contrast
 * and hairline borders carry all visual hierarchy", and there are no shadows and no fills to
 * reach for.
 *
 * The italic is a real one: Lora ships an italic face and it is loaded, so the browser is not
 * shearing an upright into an oblique.
 */
const Quote: FunctionalComponent = (_props, { slots }) =>
  h(
    'blockquote',
    { class: 'border-l border-hairline pl-6 italic text-muted' },
    slots.default?.(),
  )
Quote.inheritAttrs = false

/**
 * Which way each *wrapped* photograph floats, keyed by `_key`.
 *
 * The alternation used to be pure CSS — `md:[&>figure:nth-of-type(odd)]:float-right` and its
 * even twin on the wrapper — and that stopped working the day a photograph could be full
 * width. `nth-of-type` counts every figure, so a full-width one in the middle consumes a turn
 * and the two wrapped photographs on either side of it both float the same way. There is no
 * selector for "odd among those that are wrapped" that is safe at this project's browser floor,
 * so the count moves here, where it can simply skip the ones that do not participate.
 *
 * It stays a *derived* value rather than a field: which side a photograph takes is a
 * consequence of how many wrapped ones precede it, and Rule 2 keeps that out of her hands.
 * `?? 'wrap'` matches `BodyPhoto` — a photograph placed before the field existed alternates
 * exactly as it always did.
 */
const floatSides = computed(() => {
  const sides = new Map<string, 'left' | 'right'>()
  let wrapped = 0

  for (const block of props.value ?? []) {
    if (block._type === 'postPhoto' && (block.layout ?? 'wrap') === 'wrap') {
      sides.set(block._key, wrapped % 2 === 0 ? 'right' : 'left')
      wrapped++
    }
  }

  return sides
})

/**
 * `BodyPhoto` with the side it cannot work out for itself.
 *
 * A functional wrapper rather than provide/inject: the map is read during render, so Vue
 * tracks the dependency and the `components` object below can stay a plain constant. Passing
 * a prop also keeps `BodyPhoto` a component you can render in isolation with no ambient state.
 */
const BodyPhotoWithSide: FunctionalComponent<
  PortableTextComponentProps<Extract<Body[number], { _type: 'postPhoto' }>>
> = portableTextProps =>
  // Spread rather than picking `value`: Portable Text also hands down `index`, `isInline` and
  // `renderNode`, and `BodyPhoto`'s props type is `PortableTextComponentProps<…>` — so
  // forwarding only `value` fails to typecheck against the component it is rendering.
  h(BodyPhoto, {
    ...portableTextProps,
    side: floatSides.value.get(portableTextProps.value._key),
  })

const components = {
  block: {
    h2: Subheading,
    blockquote: Quote,
  },
  marks: {
    hyperlink: ProseLink,
  },
  types: {
    postPhoto: BodyPhotoWithSide,
  },
}
</script>

<template>
  <!-- The wrapper carries the vertical rhythm and the typography classes handed down by the
       page. `SanityContent` sets `inheritAttrs: false` and returns `PortableText` with no
       wrapper of its own, so a class passed to it is dropped on the floor — see ProseText.

       ## The alternating float used to live here, in CSS

       It was `md:[&>figure:nth-of-type(odd)]:float-right` and an even twin, which worked
       perfectly while every photograph was floated: `nth-of-type` counts figures among their
       siblings and ignores the paragraphs between them, so the first went right, the second
       left, however much prose separated them.

       A full-width photograph breaks that, and quietly. It is still a figure, so it still
       consumes an ordinal, and the two wrapped photographs on either side of it both come out
       on the same side. The count moved into the script above, where it can skip the ones that
       do not participate; the float classes now sit on the figure itself. See `BodyPhoto.vue`.

       The `after:` clearfix stays and still earns its place — it stops the last float escaping
       the bottom of the article. -->
  <div class="space-y-6 after:block after:clear-both after:content-['']">
    <SanityContent :value="value" :components="components" />
  </div>
</template>
