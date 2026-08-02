import {DocumentsIcon} from '@sanity/icons/Documents'
import {defineField, defineType} from 'sanity'

/**
 * /writing — the wrapper around the list of links.
 *
 * There is no list of articles here on purpose. The page queries every Writing link
 * and shows them newest first, so adding one is a single step: create the link.
 *
 * A singleton. See homePage.ts for how that is enforced.
 */
export default defineType({
  name: 'writingPage',
  title: 'Writing page',
  type: 'document',
  icon: DocumentsIcon,

  fields: [
    defineField({
      name: 'title',
      title: 'Browser tab title',
      type: 'string',
      description: 'Shown in the browser tab and in search results. Not shown on the page.',
      initialValue: 'Writing — Joan Lebow',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'intro',
      title: 'Introduction',
      type: 'text',
      rows: 3,
      description:
        'Optional. A line or two at the top of the page. The links themselves are added ' +
        'under “Writing links” in the sidebar — everything there appears here, newest first.',
      validation: (rule) => rule.max(300).warning('A line or two is plenty here.'),
    }),
  ],

  preview: {
    prepare: () => ({title: 'Writing page'}),
  },
})
