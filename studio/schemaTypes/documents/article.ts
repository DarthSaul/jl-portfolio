import {LinkIcon} from '@sanity/icons/Link'
import {defineField, defineType} from 'sanity'

/**
 * A link out to something published elsewhere.
 *
 * There is deliberately no body field, and that is still true now that `post` exists.
 * The two types split her writing by where it lives: this one points at a piece on the
 * site that published it — the New York Times, HuffPost — and copying that text here
 * would be republishing someone else's page. `post` is for writing that lives here.
 *
 * Called "Copy link" in the Studio so it reads as what it is: a link, not an essay
 * she is expected to write here.
 */
export default defineType({
  name: 'article',
  title: 'Copy link',
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
      description: 'The Copy page lists the newest first, so this decides the order.',
      initialValue: () => new Date().toISOString().slice(0, 10),
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'summary',
      title: 'One-line summary',
      type: 'text',
      rows: 2,
      description:
        'Recommended. Shown under the headline on the Copy page — it is what tells ' +
        'someone whether to follow the link.',
      // Warning, never an error, and a `custom()` rather than `required().warning()` — the
      // latter would make typegen type this field non-optional. The full reasoning is on the
      // same field in `post.ts`; keep the two in step.
      validation: (rule) => [
        rule
          .custom((value) =>
            value ? true : 'Worth adding — without it a list entry is a headline and a date.',
          )
          .warning(),
        rule.max(200).warning('A line or two reads best in a list.'),
      ],
    }),

    defineField({
      name: 'coverPhoto',
      title: 'Cover photo',
      type: 'reference',
      to: [{type: 'photo'}],
      description:
        'Optional, and a landscape (wide) photo works best — the Copy page crops it from ' +
        'the centre, so a tall photo loses its top and bottom. Shown beside this link where ' +
        'it is listed. Leave it empty if none of your photos suit it; the headline and date ' +
        'show on their own.',
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
      // preview.select follows references, so this resolves the cover photo document and
      // reads its image off it. Rule 1 holds: the article stores nothing but a reference.
      media: 'coverPhoto.image',
    },
    prepare({title, publication, publishedAt, media}) {
      return {
        title,
        subtitle: [publication, publishedAt].filter(Boolean).join(' · '),
        media,
      }
    },
  },
})
