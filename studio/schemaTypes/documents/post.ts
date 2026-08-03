import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {proseBlock} from '../objects/proseText'

/**
 * A piece of writing that lives on this site.
 *
 * The counterpart to `article`, and the distinction is the whole point: an article is a
 * link out to something someone else published, a post is something she published herself.
 * Her Squarespace site holds about fifteen of these, and they die with it — there is no
 * other site to link to, which is why this type exists at all.
 *
 * Called "Writing post" in the Studio so it sits next to "Writing link" and the difference
 * reads as what it is: lives here, or lives elsewhere.
 */
export default defineType({
  name: 'post',
  title: 'Writing post',
  type: 'document',
  icon: DocumentTextIcon,

  fields: [
    defineField({
      name: 'title',
      title: 'Headline',
      type: 'string',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'slug',
      title: 'Web address',
      type: 'slug',
      description:
        'The end of this post’s address, e.g. “sweet-15” makes /writing/sweet-15. ' +
        'Press Generate to make one from the headline. Changing it later breaks any link ' +
        'someone has already shared.',
      options: {source: 'title', maxLength: 96},
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'summary',
      title: 'One-line summary',
      type: 'text',
      rows: 2,
      description:
        'Optional. Shown under the headline on the post itself, and again wherever the ' +
        'post is listed.',
      validation: (rule) => rule.max(200).warning('A line or two reads best in a list.'),
    }),

    defineField({
      name: 'coverPhoto',
      title: 'Cover photo',
      type: 'reference',
      to: [{type: 'photo'}],
      description:
        'Optional. The small photo shown beside this post where it is listed — on the ' +
        'front page, for instance. Not shown on the post itself; put photos in the ' +
        'writing below for that.',
    }),

    defineField({
      name: 'publishedAt',
      title: 'Date published',
      type: 'date',
      description: 'Writing is listed newest first, so this decides the order.',
      initialValue: () => new Date().toISOString().slice(0, 10),
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'body',
      title: 'The writing',
      type: 'array',
      description:
        'Use the Insert button to put a photo between paragraphs. Its caption comes from ' +
        'the photo itself, so fixing it there fixes it everywhere.',
      of: [
        // Three styles, because her essays use three: paragraphs, the occasional
        // subheading, and a pulled-out quote. Everything else about the toolbar — and why
        // it is this short — is in objects/proseText.ts.
        proseBlock([
          {title: 'Normal', value: 'normal'},
          {title: 'Subheading', value: 'h2'},
          {title: 'Quote', value: 'blockquote'},
        ]),

        // RULE 1 at the block level. A photo between two paragraphs is a reference to a
        // photo document, exactly like a gallery's. See objects/postPhoto.ts for why it is
        // wrapped in an object rather than dropped in here as a bare reference.
        defineArrayMember({type: 'postPhoto'}),
      ],
      // Note there is no `unique()` here, which is the one place this repo's "filter on the
      // member AND unique() on the array, both, always" rule does not apply. `unique()`
      // compares members ignoring `_key`, so on an array that is mostly prose it would
      // reject a post that happens to use the same short sentence twice.
      validation: (rule) => rule.required().min(1).error('A post needs something in it.'),
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
      publishedAt: 'publishedAt',
      body: 'body',
      // preview.select follows references, so this resolves the cover photo document and
      // reads its image off it. Rule 1 holds: the post still stores nothing but a
      // reference.
      media: 'coverPhoto.image',
    },
    prepare({title, publishedAt, body, media}) {
      const count = Array.isArray(body)
        ? body.filter((member) => member._type === 'postPhoto').length
        : 0

      return {
        title,
        subtitle: [publishedAt, count > 0 && `${count} ${count === 1 ? 'photo' : 'photos'}`]
          .filter(Boolean)
          .join(' · '),
        media,
      }
    },
  },
})
