import {ImageIcon} from '@sanity/icons/Image'
import {defineField, defineType} from 'sanity'

/**
 * One slot in the row of photographs on the front page: the photograph, and optionally the
 * gallery it links to.
 *
 * RULE 1. This holds two references and nothing else — no image, no alt text, no caption, no
 * title. All of those live on the photo document, so fixing a caption there fixes it
 * everywhere the photograph appears. The `gallery` reference is a *destination*, not a copy of
 * anything: nothing about the gallery is duplicated here, and the address it resolves to is
 * read from the gallery's own slug at query time.
 *
 * RULE 2. This carries a photograph and a link, and that is all it will ever carry. A wrapper
 * on a front-page array is exactly where a size, a span, a "make this one big" toggle or a
 * crop gets added by accident, and every one of those is a per-photo layout control. The grid
 * decides shape from the photograph's own proportions; if a slot needs to look different, that
 * is a preset conversation.
 *
 * A wrapper rather than a named reference member, for the reason `postPhoto` gives at length:
 * typegen extracts a *named* reference member as `_type: "reference"` while the editor writes
 * the name, so the generated types and the stored documents silently disagree. A wrapper's
 * stored `_type` is reliably `featuredPhoto`.
 *
 * ## Why the link is a reference and not a path
 *
 * The obvious shape is a text field she types `/shots/mexico-2022` into, and it is the one to
 * avoid. Nothing validates a string: a typo is a silent 404, and renaming a gallery's address
 * breaks every string that pointed at it with no warning in any of them. A reference cannot
 * point at a gallery that does not exist, Sanity refuses to delete a document something else
 * still references, and the address is resolved from the gallery at query time — so renaming
 * one updates every link to it for free.
 */
export default defineType({
  name: 'featuredPhoto',
  title: 'Featured photo',
  type: 'object',
  icon: ImageIcon,

  fields: [
    defineField({
      name: 'photo',
      title: 'Photo',
      type: 'reference',
      to: [{type: 'photo'}],
      // No `excludeAlreadyChosen`, for the same reason `postPhoto` omits it: that helper
      // reads its `parent` as the surrounding array, and inside this object the parent is
      // the object, so it would quietly resolve to "exclude nothing" — a filter that looks
      // like a guarantee and is not one. The real guard is the custom rule on
      // `homePage.featuredPhotos`, which can see every slot at once.
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'gallery',
      title: 'Links to',
      type: 'reference',
      to: [{type: 'gallery'}],
      description:
        'Optional. Clicking this photo opens the gallery you pick here. ' +
        'Leave it empty and the photo is just a photo.',
    }),
  ],

  preview: {
    select: {
      // preview.select follows references, so these resolve the photo and gallery documents
      // and read their own fields. Nothing is copied onto this object.
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
