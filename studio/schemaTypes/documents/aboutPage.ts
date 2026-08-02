import {UserIcon} from '@sanity/icons/User'
import {defineField, defineType} from 'sanity'

/**
 * /about — short text and one photo.
 *
 * A singleton. See homePage.ts for how that is enforced.
 */
export default defineType({
  name: 'aboutPage',
  title: 'About page',
  type: 'document',
  icon: UserIcon,

  fields: [
    defineField({
      name: 'title',
      title: 'Browser tab title',
      type: 'string',
      description: 'Shown in the browser tab and in search results. Not shown on the page.',
      initialValue: 'About — Joan Lebow',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'body',
      title: 'About you',
      type: 'text',
      rows: 8,
      description: 'A few paragraphs. Press Enter twice to start a new one.',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'portrait',
      title: 'Photo',
      type: 'reference',
      to: [{type: 'photo'}],
      description:
        'Pick one from your photos. If it is not there yet, add it under Photos first — ' +
        'photos always live in one place, so the description you write there is the one ' +
        'used everywhere.',
      validation: (rule) => rule.required(),
    }),
  ],

  preview: {
    prepare: () => ({title: 'About page'}),
  },
})
