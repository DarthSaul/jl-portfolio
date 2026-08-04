<script setup lang="ts">
import type { FunctionalComponent } from 'vue'
import { BodyPhoto, ProseLink } from '#components'
import type { POST_QUERY_RESULT } from '~~/sanity.types'

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
 * On this site `SiteHeader` puts the wordmark in an `<h1>` on every page and the post's own
 * title is the `<h2>`, so rendering a subheading as a literal `<h2>` would put it level with
 * the title of the piece it sits inside. `<h3>` is what the outline actually calls for.
 *
 * `inheritAttrs = false` on both: Portable Text passes each block component its block props,
 * and without this they land on the element as junk attributes and warn on every render. Same
 * reason `ProseHeading` sets it.
 */
defineProps<{ value: NonNullable<POST_QUERY_RESULT>['body'] }>()

const Subheading: FunctionalComponent = (_props, { slots }) =>
  h('h3', { class: 'text-xl font-medium leading-snug sm:text-2xl' }, slots.default?.())
Subheading.inheritAttrs = false

const Quote: FunctionalComponent = (_props, { slots }) =>
  h(
    'blockquote',
    { class: 'border-l-2 border-neutral-200 pl-5 italic text-muted' },
    slots.default?.(),
  )
Quote.inheritAttrs = false

const components = {
  block: {
    h2: Subheading,
    blockquote: Quote,
  },
  marks: {
    hyperlink: ProseLink,
  },
  types: {
    postPhoto: BodyPhoto,
  },
}
</script>

<template>
  <!-- The wrapper carries the vertical rhythm and the typography classes handed down by the
       page. `SanityContent` sets `inheritAttrs: false` and returns `PortableText` with no
       wrapper of its own, so a class passed to it is dropped on the floor — see ProseText.

       ## The alternating float

       Photographs in a body sit in a 350px column that the prose wraps around, and they
       alternate sides down the page — the arrangement her Squarespace posts already use,
       where each image is a `span-6` float, half the text column, right then left.

       `nth-of-type` counts figures among their siblings, ignoring the paragraphs between
       them, which is exactly the ordinal wanted: the first photograph in the post goes right,
       the second left, however much prose separates them. Portable Text renders every block
       as a direct child of this div, so the `>` combinator holds. Doing it in CSS is what
       keeps `postPhoto` free of an alignment field — the side is a consequence of document
       order, not something she sets. See the Rule 2 note in `objects/postPhoto.ts`.

       The `after:` clearfix stops the last float escaping the bottom of the article. Below
       `md` none of this applies: a 350px float in a phone viewport leaves an unreadable
       ribbon of text beside it, so the figure goes full width and the floats are not set. -->
  <div
    class="space-y-6 after:block after:clear-both after:content-['']
           md:[&>figure:nth-of-type(odd)]:float-right md:[&>figure:nth-of-type(odd)]:ml-8
           md:[&>figure:nth-of-type(even)]:float-left md:[&>figure:nth-of-type(even)]:mr-8"
  >
    <SanityContent :value="value" :components="components" />
  </div>
</template>
