import {ImageIcon} from '@sanity/icons/Image'
import {defineField, defineType} from 'sanity'

/**
 * One slot in the row of photographs on the front page: the photograph, optionally the
 * gallery it links to, and whether pointing at it peeks into that gallery.
 *
 * RULE 1. This holds two references and one switch, and nothing else — no image, no alt text, no caption, no
 * title. All of those live on the photo document, so fixing a caption there fixes it
 * everywhere the photograph appears. The `gallery` reference is a *destination*, not a copy of
 * anything: nothing about the gallery is duplicated here, and the address it resolves to is
 * read from the gallery's own slug at query time.
 *
 * RULE 2. This carries a photograph, a link and `showPeek`, and the line it draws is deliberate.
 * `showPeek` is a *behaviour* switch — whether hovering a linked card cross-fades into its
 * gallery — and changes nothing about the card's shape: every card is the same square, in the
 * same grid slot, whether it peeks or not. A size, a span, a "make this one big" toggle, an
 * offset or a crop is still never added here; every one of those is a per-photo layout
 * control. If a slot needs to *look* different, that is a preset conversation.
 *
 * A wrapper rather than a named reference member, for the reason `postPhoto` gives at length:
 * typegen extracts a *named* reference member as `_type: "reference"` while the editor writes
 * the name, so the generated types and the stored documents silently disagree. A wrapper's
 * stored `_type` is reliably `featuredPhoto`.
 *
 * ## Why the link is a reference and not a path
 *
 * The obvious shape is a text field she types `/gallery/mexico-2022` into, and it is the one to
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

    defineField({
      name: 'showPeek',
      title: 'Peek at the gallery on hover',
      type: 'boolean',
      description:
        'On a computer, pointing at this photo opens it into four squares: this photo, then ' +
        'the first three others from its gallery. Off, the photo stays as it is.',
      initialValue: false,
      // A peek needs a gallery to peek into. Hidden, not disabled, so the switch only exists
      // when it can do something.
      hidden: ({parent}) => !(parent as {gallery?: {_ref?: string}} | undefined)?.gallery?._ref,
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
      showPeek: 'showPeek',
    },
    prepare({caption, alt, galleryTitle, media, showPeek}) {
      return {
        title: caption || alt || 'Photo',
        subtitle: galleryTitle
          ? `Links to ${galleryTitle}${showPeek ? ' · peeks' : ''}`
          : 'No link',
        media,
      }
    },
  },
})
