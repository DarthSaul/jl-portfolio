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
      name: 'introHeading',
      title: 'Heading over the introduction',
      type: 'string',
      description:
        'Optional. Leave it empty and no heading is shown — the introduction simply ' +
        'starts on its own.',
      initialValue: 'Welcome',
    }),

    defineField({
      name: 'introPhoto',
      title: 'Photo behind the introduction',
      type: 'reference',
      to: [{type: 'photo'}],
      description:
        'The introduction is printed over this photo. It is shown at its own shape, so ' +
        'the photo’s proportions decide how tall this part of the page is, and a photo ' +
        'with a calm area in it is easiest to read words over.',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'intro',
      title: 'Introduction',
      type: 'proseText',
      description: 'A few sentences, over the photo above.',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'blurb',
      title: 'Blurb',
      type: 'proseText',
      description:
        'The short paragraph below the introduction. Three or four sentences, and the ' +
        'place for a link out to something.',
      validation: (rule) => rule.required(),
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

    defineField({
      name: 'featuredTitle',
      title: 'Photos section title',
      type: 'string',
      description: 'The heading over the row of photos, e.g. “Getting a Handle on @joanatstake”.',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'featuredSubtitle',
      title: 'Photos section subtitle',
      type: 'text',
      rows: 4,
      description: 'The text under that heading. A short paragraph is fine.',
      // 500, not the 200 used for one-line summaries elsewhere. Hers already runs to 357
      // characters and reads exactly as intended, and a warning that fires on correct
      // content only teaches her to ignore warnings. This is a runaway-paste guard, not a
      // style guide.
      validation: (rule) => [
        rule.required(),
        rule.max(500).warning('That is longer than this section is designed to hold.'),
      ],
    }),

    defineField({
      name: 'featuredPhotos',
      title: 'Featured photos',
      type: 'array',
      description:
        'The row of photos at the bottom of the front page, in the order they appear. ' +
        'Exactly five — the row is built for five. Drag to reorder.',
      options: {layout: 'grid'},
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'photo'}],
          options: {filter: excludeAlreadyChosen},
        }),
      ],
      validation: (rule) => [
        rule.required().length(5).error('The front page row holds exactly five photos.'),
        rule.unique().error('That photo is already featured.'),
      ],
    }),
  ],

  preview: {
    prepare: () => ({title: 'Home page'}),
  },
})
