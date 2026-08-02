import {ImagesIcon} from '@sanity/icons/Images'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {excludeAlreadyChosen} from '../photoPicker'

/**
 * /shots — the curated set, plus the list of galleries.
 *
 * A singleton. See homePage.ts for how that is enforced.
 */
export default defineType({
  name: 'shotsPage',
  title: 'Shots page',
  type: 'document',
  icon: ImagesIcon,

  fields: [
    defineField({
      name: 'title',
      title: 'Browser tab title',
      type: 'string',
      description: 'Shown in the browser tab and in search results. Not shown on the page.',
      initialValue: 'Shots — Joan Lebow',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'intro',
      title: 'Introduction',
      type: 'text',
      rows: 3,
      description: 'Optional. A line or two at the top of the page. Leave blank for none.',
      validation: (rule) => rule.max(300).warning('A line or two is plenty here.'),
    }),

    defineField({
      name: 'photos',
      title: 'Photos',
      type: 'array',
      description:
        'The photos on this page, in the order they appear. Drag to reorder. A photo can ' +
        'be here and in a gallery at the same time — it is the same photo either way.',
      options: {layout: 'grid'},
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'photo'}],
          options: {filter: excludeAlreadyChosen},
        }),
      ],
      validation: (rule) => [
        rule.required().min(1).error('This page needs at least one photo.'),
        rule.unique().error('That photo is already on this page.'),
      ],
    }),

    defineField({
      name: 'galleries',
      title: 'Galleries listed on this page',
      type: 'array',
      description:
        'A gallery only appears here if you add it — nothing is listed automatically. ' +
        'Remove one to take it off the site without deleting anything. Drag to reorder.',
      options: {layout: 'list'},
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'gallery'}],
          options: {filter: excludeAlreadyChosen},
        }),
      ],
      // Deliberately not required: an empty list is a legitimate state, and it is also
      // the "not ready to show these yet" control. That is why no gallery has its own
      // publish toggle to explain.
      validation: (rule) => rule.unique().error('That gallery is already listed.'),
    }),
  ],

  preview: {
    prepare: () => ({title: 'Shots page'}),
  },
})
