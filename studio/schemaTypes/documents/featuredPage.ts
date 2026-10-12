import {StarIcon} from '@sanity/icons/Star'
import {defineField, defineType} from 'sanity'

import {galleryFillValidation, galleryPhotoFields} from '../galleryFields'

/**
 * The Featured page, at /featured. A singleton — pinned at document id `featuredPage` in
 * studio/structure.ts and kept out of the Create menu in sanity.config.ts.
 *
 * It is a gallery in every way that shows on the page: the same layout presets, the same two
 * fill modes, the same "Photo order" input, all from `../galleryFields.ts`, and the site renders
 * it through the same query projection and the same `GalleryView`. What it does not have is a
 * slug: its address is a route in the app, like /copy and /bio, so she cannot rename it out
 * from under the menu item that links to it. Its menu label is `siteSettings.navLabels.featured`.
 *
 * Why not just a gallery called "featured"? Because a gallery lives at /gallery/<slug>, is listed
 * under Galleries in the menu and can be deleted — and this page is none of those things.
 */
export default defineType({
  name: 'featuredPage',
  title: 'Featured page',
  type: 'document',
  icon: StarIcon,

  validation: (rule) => rule.custom(galleryFillValidation('page')),

  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description:
        'The heading at the top of the page, also used in the browser tab. The word in the ' +
        'menu is set separately, in Site settings → Menu labels.',
      initialValue: 'Featured',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'description',
      title: 'Short description',
      type: 'text',
      rows: 2,
      description:
        'Optional. Not shown on the page — this is the blurb that appears when someone ' +
        'shares a link to it.',
      validation: (rule) =>
        rule.max(160).warning('Sharing previews cut off after about 160 characters.'),
    }),

    ...galleryPhotoFields('page'),
  ],

  preview: {
    prepare: () => ({title: 'Featured page'}),
  },
})
