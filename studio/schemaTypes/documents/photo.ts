import {ImageIcon} from '@sanity/icons/Image'
import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * The tag vocabulary. Fixed on purpose — see Rule 2 in CLAUDE.md for why the Studio
 * has no free-text taxonomy.
 *
 * PLACEHOLDER VALUES. These exist so the field can be built and typed before the real
 * photographs are in view. Replace them before the Studio is deployed to `production`.
 *
 * Adding a value later is free. Renaming or removing one is not: the old string stays
 * on every photo already using it, no longer matches the list, and the checkbox for it
 * silently disappears. Add freely; change with care.
 */
export const PHOTO_TAGS = [
  {title: 'Street', value: 'street'},
  {title: 'Portrait', value: 'portrait'},
  {title: 'Landscape', value: 'landscape'},
  {title: 'Architecture', value: 'architecture'},
  {title: 'Water', value: 'water'},
  {title: 'Night', value: 'night'},
]

/**
 * RULE 1. A photograph is one document, with one image asset and one alt text.
 * Galleries hold references to these; they never embed an image of their own.
 *
 * An image field appears exactly once in the whole schema — the one below. Grepping
 * schemaTypes/ for an image type declaration is the mechanical check on Rule 1, and a
 * second hit means something has grown an image of its own. The pattern is described
 * rather than quoted here so this comment isn't itself the second hit.
 */
export default defineType({
  name: 'photo',
  title: 'Photo',
  type: 'document',
  icon: ImageIcon,

  groups: [
    {name: 'photo', title: 'Photo', default: true},
    {name: 'details', title: 'Details'},
  ],

  fields: [
    defineField({
      name: 'image',
      title: 'The photograph',
      type: 'image',
      group: 'photo',
      options: {
        // An explicit metadata array REPLACES Sanity's defaults, it does not extend
        // them — which is why the defaults are restated here. `exif` adds capture date
        // and camera. `location` is deliberately absent: it is GPS, and the production
        // dataset is readable by anyone with the project id.
        //
        // Metadata is computed at upload time and is never backfilled. Changing this
        // list does nothing to photos already uploaded.
        metadata: ['lqip', 'blurhash', 'thumbhash', 'palette', 'exif'],
        // hotspot is intentionally NOT enabled. It is a per-photo focal point and crop,
        // which Rule 2 forbids — she picks photos and order, never framing. Every preset
        // preserves the native aspect ratio, so nothing needs a focal point.
      },
      validation: (rule) => rule.required().assetRequired(),
    }),

    defineField({
      name: 'alt',
      title: 'Describe the photo',
      type: 'string',
      group: 'photo',
      description:
        'For people using a screen reader, and shown if the image fails to load. ' +
        'Say what is in the frame — “Two swimmers at the edge of a harbour pool at dusk”.',
      validation: (rule) => [
        rule.required().min(5).error('Every photo needs a description.'),
        rule.max(160).warning('Long descriptions get cut off by some screen readers.'),
      ],
    }),

    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'text',
      rows: 2,
      group: 'photo',
      description: 'Optional. Shown under the photo on the site. Leave blank for no caption.',
      validation: (rule) => rule.max(280).warning('Captions read better short.'),
    }),

    defineField({
      name: 'place',
      title: 'Place',
      type: 'string',
      group: 'details',
      description:
        'Optional, and only for you — this is not shown on the site. It is the fastest ' +
        'way to find a photo again months from now.',
    }),

    defineField({
      name: 'dateTaken',
      title: 'Date taken',
      type: 'date',
      group: 'details',
      description: 'Optional, and only for you — used for sorting here, never shown on the site.',
    }),

    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      group: 'details',
      description:
        'Optional. Tags group photos in the sidebar here so they are easier to find. ' +
        'They are not shown on the site and do not affect any page.',
      // The list on the ARRAY is what renders the checkbox grid in the Studio.
      options: {list: PHOTO_TAGS, layout: 'grid'},
      // The same list on the ARRAY MEMBER is what makes typegen emit
      // Array<"street" | "portrait" | …> instead of Array<string>. Both are required.
      of: [defineArrayMember({type: 'string', options: {list: PHOTO_TAGS}})],
      validation: (rule) => rule.unique(),
    }),
  ],

  orderings: [
    {
      name: 'createdAtDesc',
      title: 'Recently added',
      by: [{field: '_createdAt', direction: 'desc'}],
    },
    {
      name: 'dateTakenDesc',
      title: 'Date taken, newest first',
      // nulls: 'last' is not optional here. Sanity sorts nulls first on `desc`, and
      // dateTaken is an optional field — without this every undated photo pins to the
      // top and the sort looks broken.
      by: [{field: 'dateTaken', direction: 'desc', nulls: 'last'}],
    },
    {
      name: 'dateTakenAsc',
      title: 'Date taken, oldest first',
      by: [{field: 'dateTaken', direction: 'asc', nulls: 'last'}],
    },
    {
      name: 'placeAsc',
      title: 'Place, A–Z',
      by: [{field: 'place', direction: 'asc', nulls: 'last'}],
    },
  ],

  preview: {
    select: {
      caption: 'caption',
      alt: 'alt',
      place: 'place',
      dateTaken: 'dateTaken',
      media: 'image',
    },
    prepare({caption, alt, place, dateTaken, media}) {
      // There is deliberately no `title` field on a photo. Inventing a third name for a
      // photograph, 250 times, is work she would never finish — so the preview borrows
      // the caption, then the description.
      return {
        title: caption || alt || 'Untitled photo',
        subtitle: [place, dateTaken].filter(Boolean).join(' · '),
        media,
      }
    },
  },
})
