import {ImageIcon} from '@sanity/icons/Image'
import {defineField, defineType} from 'sanity'

/**
 * How a photograph sits in a body of text. RULE 2's fixed list, applied to one photograph
 * rather than to a gallery.
 *
 * Two values, each with a component in `BodyPhoto.vue` that guarantees the result works at
 * every width. Adding a third is the same two changes a layout preset always takes — a value
 * here and a branch there, together — and a value with no branch must be impossible.
 */
export const BODY_PHOTO_LAYOUTS = [
  {title: 'Wrapped by the text', value: 'wrap'},
  {title: 'Full width', value: 'full'},
]

/**
 * A photograph sitting between two paragraphs of a body of text.
 *
 * Named for `post.body`, where it first appeared, and since shared with `aboutPage.body` —
 * the name records where it came from, not what is allowed to use it. It is deliberately not
 * renamed to something neutral: every photograph already inside a post is stored with
 * `_type: 'postPhoto'`, so a rename is a content migration in exchange for a tidier word.
 * Any body that wants prose with photographs in it should reuse this rather than declare a
 * second identical object.
 *
 * RULE 1. This holds a reference and nothing else about the photograph — no image, no alt
 * text, no caption. Those live on the photo document, so fixing a caption there fixes it
 * everywhere the photo appears.
 *
 * ## RULE 2, and why `layout` does not break it
 *
 * This comment used to end "Do not add a width, a size, an alignment or a 'full bleed' toggle
 * to it", and `layout` looks a great deal like the last of those. The line it was drawing is
 * worth restating precisely, because the rule is not "this object never grows a field".
 *
 * Rule 2 forbids *positioning*: a width, a column count, a crop offset, a breakpoint — numbers
 * she sets per photograph, which are how a page ends up broken at a size nobody checked. It
 * explicitly permits *presets*: "She picks which photos, in what order, and which preset", and
 * "presets are Vue components that guarantee the result works at every width. They are the
 * product, not a limitation of it."
 *
 * `layout` is the second thing. It is a fixed list of two, it carries no numbers, both values
 * render through components that are responsive on their own terms, and a value outside the
 * list is impossible. What it replaced was not restraint but a guess: every photograph was
 * floated at 350px whether or not the photograph suited it, and a panorama in a 350px column
 * beside a ribbon of text was the result. She could not say otherwise, which is not the same
 * as her not needing to.
 *
 * What must still never appear here: a width, a percentage, an alignment ("left"/"right" —
 * the side a wrapped photo takes is a consequence of document order, computed in
 * `ProseBody.vue`), a caption override, or anything that only makes sense at one screen size.
 */
export default defineType({
  name: 'postPhoto',
  title: 'Photo',
  type: 'object',
  icon: ImageIcon,

  fields: [
    defineField({
      name: 'photo',
      title: 'Photo',
      type: 'reference',
      to: [{type: 'photo'}],
      // No `excludeAlreadyChosen` here, unlike every other photo picker in this schema.
      // That helper reads its `parent` as the surrounding array; inside this object the
      // parent is the object itself, so it would quietly resolve to "exclude nothing" —
      // a filter that looks like a guarantee and is not one. Repeating a photograph
      // within one essay is legitimate anyway, which is the same reason body has no
      // `unique()`. See post.ts.
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'layout',
      title: 'How it sits',
      type: 'string',
      description:
        'Wrapped: the photo takes half the column and the writing flows around it, ' +
        'alternating sides down the page. Full width: the photo takes the whole column with ' +
        'the writing above and below. Wide photos usually want full width.',
      options: {list: BODY_PHOTO_LAYOUTS, layout: 'radio'},
      initialValue: 'wrap',
      // Deliberately not `required()`. Every photograph already inside a body predates this
      // field and has no value, and requiring one would mark her existing posts invalid for a
      // choice she never got to make. `BodyPhoto.vue` reads a missing value as 'wrap', which
      // is what those photographs already do — so nothing moves until she says so.
    }),
  ],

  preview: {
    select: {
      // preview.select follows references, so these resolve the photo document and read
      // its own caption and image. Nothing is copied onto this object.
      caption: 'photo.caption',
      alt: 'photo.alt',
      layout: 'layout',
      media: 'photo.image',
    },
    prepare({caption, alt, layout, media}) {
      return {
        title: caption || alt || 'Photo',
        subtitle: BODY_PHOTO_LAYOUTS.find((option) => option.value === (layout ?? 'wrap'))?.title,
        media,
      }
    },
  },
})
