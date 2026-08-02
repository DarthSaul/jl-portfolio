import {ImagesIcon} from '@sanity/icons/Images'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {excludeAlreadyChosen} from '../photoPicker'

/**
 * RULE 2. Every value here must have a matching component in
 * web/app/components/presets/. Adding a preset is two changes, always together: the
 * component, and a line in this list. A preset value with no component must be
 * impossible, which is why this is a fixed list and never a free-text field.
 *
 * She picks which photos, in what order, and which of these. She never sets a width, a
 * column count, a crop, or a breakpoint — the component guarantees the result works at
 * every screen size. That guarantee is the product.
 */
export const LAYOUT_PRESETS = [
  {title: 'Grid — several photos across, in rows', value: 'grid'},
  {title: 'Stack — one photo at a time, down the page', value: 'stack'},
]

export default defineType({
  name: 'gallery',
  title: 'Gallery',
  type: 'document',
  icon: ImagesIcon,

  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'slug',
      title: 'Web address',
      type: 'slug',
      description:
        'The end of this gallery’s address, e.g. “iceland” makes /shots/iceland. ' +
        'Press Generate to make one from the title. Changing it later breaks any link ' +
        'someone has already shared.',
      options: {source: 'title', maxLength: 96},
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'description',
      title: 'Short description',
      type: 'text',
      rows: 2,
      description:
        'Optional. Not shown on the page — this is the blurb that appears when someone ' +
        'shares a link to this gallery.',
      validation: (rule) =>
        rule.max(160).warning('Sharing previews cut off after about 160 characters.'),
    }),

    defineField({
      name: 'preset',
      title: 'Layout',
      type: 'string',
      description: 'How the photos are arranged. Both work on a phone.',
      options: {list: LAYOUT_PRESETS, layout: 'radio'},
      initialValue: 'grid',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'photos',
      title: 'Photos',
      type: 'array',
      description:
        'Drag to reorder — this is the order they appear on the page. The first photo is ' +
        'also the one used as this gallery’s cover on the Shots page.',
      options: {layout: 'grid'},
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'photo'}],
          // Ergonomics only: it narrows what the picker offers. `unique()` below is the
          // actual guarantee, and it also catches a paste or a duplicated document.
          // Both, always. Note this goes on the array MEMBER — on the array it does
          // nothing at all, silently.
          options: {filter: excludeAlreadyChosen},
        }),
      ],
      validation: (rule) => [
        rule.required().min(1).error('A gallery needs at least one photo.'),
        rule.unique().error('That photo is already in this gallery.'),
      ],
    }),
  ],

  orderings: [
    {
      name: 'titleAsc',
      title: 'Title, A–Z',
      by: [{field: 'title', direction: 'asc'}],
    },
  ],

  preview: {
    select: {
      title: 'title',
      preset: 'preset',
      photos: 'photos',
      // preview.select follows references, so this resolves the first referenced photo
      // document and reads its image off it. Rule 1 holds: the gallery still stores
      // nothing but references.
      media: 'photos.0.image',
    },
    prepare({title, preset, photos, media}) {
      const count = Array.isArray(photos) ? photos.length : 0
      const presetTitle = LAYOUT_PRESETS.find((option) => option.value === preset)?.title

      return {
        title,
        subtitle: [
          `${count} ${count === 1 ? 'photo' : 'photos'}`,
          // Just the word before the em dash — "Grid", not the whole explanation.
          presetTitle?.split(' — ')[0],
        ]
          .filter(Boolean)
          .join(' · '),
        media,
      }
    },
  },
})
