import {LinkIcon} from '@sanity/icons/Link'
import {defineField, defineType} from 'sanity'

/**
 * A link out to something published elsewhere.
 *
 * There is deliberately no body field. /writing is a list of links; the articles live
 * on the sites that published them. Adding a body here would make this a CMS for
 * long-form writing, which is an explicit non-goal — see CLAUDE.md.
 *
 * Called "Writing link" in the Studio so it reads as what it is: a link, not an essay
 * she is expected to write here.
 */
export default defineType({
  name: 'article',
  title: 'Writing link',
  type: 'document',
  icon: LinkIcon,

  fields: [
    defineField({
      name: 'title',
      title: 'Headline',
      type: 'string',
      description: 'As it appears on the site that published it.',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'publication',
      title: 'Published in',
      type: 'string',
      description: 'The publication’s name, e.g. “The Guardian”.',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'url',
      title: 'Link',
      type: 'url',
      description: 'The full address, starting with https://',
      validation: (rule) => rule.required().uri({scheme: ['http', 'https']}),
    }),

    defineField({
      name: 'publishedAt',
      title: 'Date published',
      type: 'date',
      description: 'The Writing page lists the newest first, so this decides the order.',
      initialValue: () => new Date().toISOString().slice(0, 10),
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'summary',
      title: 'One-line summary',
      type: 'text',
      rows: 2,
      description: 'Optional. Shown under the headline on the Writing page.',
      validation: (rule) => rule.max(200).warning('A line or two reads best in a list.'),
    }),
  ],

  orderings: [
    {
      name: 'publishedAtDesc',
      title: 'Newest first',
      by: [{field: 'publishedAt', direction: 'desc'}],
    },
  ],

  preview: {
    select: {
      title: 'title',
      publication: 'publication',
      publishedAt: 'publishedAt',
    },
    prepare({title, publication, publishedAt}) {
      return {
        title,
        subtitle: [publication, publishedAt].filter(Boolean).join(' · '),
      }
    },
  },
})
