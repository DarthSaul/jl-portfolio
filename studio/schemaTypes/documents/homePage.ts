import {HomeIcon} from '@sanity/icons/Home'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {excludeAlreadyChosen} from '../photoPicker'

/**
 * The front page. A singleton — there is exactly one of these, at document id
 * `homePage`, pinned in studio/structure.ts and kept out of the Create menu in
 * sanity.config.ts.
 *
 * The fields are in the order the page reads, top to bottom, and each description says
 * where that field lands. There are deliberately no field groups: photo.ts uses tabs to
 * keep image apart from metadata, but here a single scrolling form mirrors the page
 * itself, and tabs would hide half the page behind a click.
 *
 * The site name and the byline above this page are not here — they are on siteSettings,
 * because they sit in the header of every page, not just this one.
 */
export default defineType({
  name: 'homePage',
  title: 'Home page',
  type: 'document',
  icon: HomeIcon,

  fields: [
    defineField({
      name: 'title',
      title: 'Browser tab title',
      type: 'string',
      description: 'Shown in the browser tab and in search results. Not shown on the page.',
      initialValue: 'Joan Lebow',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'featuredPhotos',
      title: 'Featured photos',
      type: 'array',
      description:
        'The photos at the top of the front page, in the order they appear. On a desktop they ' +
        'sit three to a row, so six photos make two even rows — six is the number to aim for. ' +
        'Drag to reorder. Each one can link to a gallery — open a photo to set that.',
      options: {layout: 'grid'},
      // A `featuredPhoto` object, not a bare reference: each slot carries the photograph and
      // optionally the gallery it links to. See objects/featuredPhoto.ts for why the link is
      // a reference rather than a typed-in address, and why a wrapper beats a named
      // reference member.
      of: [defineArrayMember({type: 'featuredPhoto'})],
      validation: (rule) => [
        // Any count, six recommended. This was `length(5)` while the grid packed by the
        // browser's own wrapping; the rows are chunks of three now, so every count produces
        // a working page and the only wrong number is zero.
        rule.required().min(1).error('The front page needs at least one photo.'),
        // `unique()` cannot do this job any more. It compares whole members ignoring `_key`,
        // and now that a member is an object, the same photograph pointed at two different
        // galleries reads as two different members and passes. The rule below compares the
        // part that actually has to be unique.
        rule.custom((slots) => {
          const refs = (Array.isArray(slots) ? slots : [])
            .map((slot) => (slot as {photo?: {_ref?: string}})?.photo?._ref)
            .filter(Boolean)

          return new Set(refs).size === refs.length
            ? true
            : 'The same photo is featured more than once.'
        }),
      ],
    }),

    defineField({
      name: 'featuredWriting',
      title: 'Featured writing',
      type: 'array',
      description:
        'Exactly three, in the order they appear. Posts and links can be mixed — each one ' +
        'shows its cover photo, headline, summary and date. Drag to reorder.',
      options: {layout: 'list'},
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'post'}, {type: 'article'}],
          options: {filter: excludeAlreadyChosen},
        }),
      ],
      validation: (rule) => [
        rule.required().length(3).error('The front page shows exactly three pieces of writing.'),
        rule.unique().error('That piece is already featured.'),
      ],
    }),
  ],

  preview: {
    prepare: () => ({title: 'Home page'}),
  },
})
