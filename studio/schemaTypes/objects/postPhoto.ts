import {ImageIcon} from '@sanity/icons/Image'
import {defineField, defineType} from 'sanity'

/**
 * A photograph sitting between two paragraphs of a body of text.
 *
 * Named for `post.body`, where it first appeared, and since shared with `aboutPage.body` —
 * the name records where it came from, not what is allowed to use it. It is deliberately not
 * renamed to something neutral: every photograph already inside a post is stored with
 * `_type: 'postPhoto'`, so a rename is a content migration in exchange for a tidier word.
 * Any body that wants prose with photographs in it should reuse this rather than declare a
 * second identical object.
 *
 * RULE 1. This holds a reference and nothing else — no image, no alt text, no caption.
 * Those live on the photo document, so fixing a caption there fixes it everywhere the
 * photo appears.
 *
 * RULE 2. This object exists to carry a reference into a body of text, and that is all it
 * will ever carry. Do not add a width, a size, an alignment or a "full bleed" toggle to
 * it — a wrapper like this one is exactly where those knobs get added by accident, and
 * every one of them is a per-photo positioning control. If a post needs a photo to look
 * different, that is a preset conversation.
 *
 * A wrapper rather than a bare reference member on the body array, for two reasons. The
 * stored `_type` is reliably `postPhoto`, so the renderer and GROQ can tell it apart from
 * a text block — a *named* reference member does not do this, because typegen extracts it
 * as `_type: "reference"` while the editor writes the name, and the two silently disagree.
 * And an object can carry the preview below, so the editor shows the actual photograph
 * inline in the essay rather than a reference chip.
 */
export default defineType({
  name: 'postPhoto',
  title: 'Photo',
  type: 'object',
  icon: ImageIcon,

  fields: [
    defineField({
      name: 'photo',
      title: 'Photo',
      type: 'reference',
      to: [{type: 'photo'}],
      // No `excludeAlreadyChosen` here, unlike every other photo picker in this schema.
      // That helper reads its `parent` as the surrounding array; inside this object the
      // parent is the object itself, so it would quietly resolve to "exclude nothing" —
      // a filter that looks like a guarantee and is not one. Repeating a photograph
      // within one essay is legitimate anyway, which is the same reason body has no
      // `unique()`. See post.ts.
      validation: (rule) => rule.required(),
    }),
  ],

  preview: {
    select: {
      // preview.select follows references, so these resolve the photo document and read
      // its own caption and image. Nothing is copied onto this object.
      caption: 'photo.caption',
      alt: 'photo.alt',
      media: 'photo.image',
    },
    prepare({caption, alt, media}) {
      return {
        title: caption || alt || 'Photo',
        media,
      }
    },
  },
})
