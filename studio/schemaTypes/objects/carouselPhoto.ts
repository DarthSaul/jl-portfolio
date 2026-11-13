import {ImageIcon} from '@sanity/icons/Image'
import {defineField, defineType} from 'sanity'

/**
 * One slide in the front-page carousel: the photograph, and optionally the gallery it links to.
 *
 * `featuredPhoto` without `showPeek`. The carousel's hover is only ever the gallery's title, so a
 * peek switch here would be a knob that does nothing. A separate type rather than `featuredPhoto`
 * with the switch hidden: a hidden field still stores and validates, and the stored `_type` then
 * says which list a slot belongs to.
 *
 * RULE 1. Two references and nothing else. The image, alt text and caption stay on the photo
 * document, and the gallery's address is read from its own slug at query time. See
 * `featuredPhoto.ts` for why the link is a reference and not a typed-in path, and why this is a
 * wrapper rather than a named reference member.
 *
 * RULE 2. No size, offset, crop or position, ever. Every slide is fitted whole into the same
 * frame (`HeroCarousel.tsx`).
 */
export default defineType({
  name: 'carouselPhoto',
  title: 'Carousel photo',
  type: 'object',
  icon: ImageIcon,

  fields: [
    defineField({
      name: 'photo',
      title: 'Photo',
      type: 'reference',
      to: [{type: 'photo'}],
      // No `excludeAlreadyChosen`: inside an object its `parent` is the object, not the array, so
      // it would exclude nothing. The duplicate guard is the custom rule on
      // `homePage.carouselPhotos`, as for `featuredPhotos`.
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'gallery',
      title: 'Links to',
      type: 'reference',
      to: [{type: 'gallery'}],
      description:
        'Optional. Clicking this picture opens the gallery you pick here, and pointing at it ' +
        'shows the gallery’s name. Leave it empty and the picture is just a picture.',
    }),
  ],

  preview: {
    select: {
      caption: 'photo.caption',
      alt: 'photo.alt',
      galleryTitle: 'gallery.title',
      media: 'photo.image',
    },
    prepare({caption, alt, galleryTitle, media}) {
      return {
        title: caption || alt || 'Photo',
        subtitle: galleryTitle ? `Links to ${galleryTitle}` : 'No link',
        media,
      }
    },
  },
})
