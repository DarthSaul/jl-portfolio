import {HomeIcon} from '@sanity/icons/Home'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {excludeAlreadyChosen} from '../photoPicker'

/**
 * The front page. A singleton — there is exactly one of these, at document id
 * `homePage`, pinned in studio/structure.ts and kept out of the Create menu in
 * sanity.config.ts.
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
      name: 'intro',
      title: 'Introduction',
      type: 'text',
      rows: 4,
      description: 'A short paragraph at the top of the page. A few sentences is plenty.',
      validation: (rule) => [
        rule.required(),
        rule.max(400).warning('The front page reads better short.'),
      ],
    }),

    defineField({
      name: 'featured',
      title: 'Featured photos',
      type: 'array',
      description:
        'The photos on the front page, in the order they appear. Five to ten works well. ' +
        'Drag to reorder.',
      options: {layout: 'grid'},
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'photo'}],
          options: {filter: excludeAlreadyChosen},
        }),
      ],
      validation: (rule) => [
        rule.required().min(1).max(10).error('Pick between one and ten photos.'),
        rule.min(5).warning('Five or more photos fills out the page nicely.'),
        rule.unique().error('That photo is already featured.'),
      ],
    }),
  ],

  preview: {
    prepare: () => ({title: 'Home page'}),
  },
})
