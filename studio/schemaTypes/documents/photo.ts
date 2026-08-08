import {ImageIcon} from '@sanity/icons/Image'
import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * The tag vocabulary. Fixed on purpose — see Rule 2 in CLAUDE.md for why the Studio
 * has no free-text taxonomy.
 *
 * Adding a value later is free. Renaming or removing one is not: the old string stays
 * on every photo already using it, no longer matches the list, and the checkbox for it
 * silently disappears. Add freely; change with care.
 *
 * ## A tag value can become a web address, so it is now doubly hard to change
 *
 * A `gallery` can point at a tag instead of listing photos by hand, and when it does,
 * every photo carrying that tag appears on that gallery's page. The *value* below is
 * what the gallery stores, which is why the values are slug-shaped — `mexico-2022`
 * rather than `mexico2022` or `Mexico 2022`.
 *
 * The consequence: renaming a value already used by a published gallery breaks two
 * things at once, in different places, silently. Every photo keeps the old string and
 * drops out of the list; and the gallery's `tag` no longer matches anything, so its
 * page goes empty rather than erroring. The `title` is free to change at any time —
 * it is only ever a label in the Studio. Change titles; leave values alone.
 *
 * The two kinds of tag below are deliberate and are not distinguished in the schema.
 * The first six group photographs by what is in them; the rest are the trips and
 * bodies of work she is likely to want a page for. Nothing marks which is which,
 * because "does this tag have a page" is answered by whether a gallery points at it —
 * one fact in one place, rather than a flag here that could disagree with reality.
 */
export const PHOTO_TAGS = [
  {title: 'Street', value: 'street'},
  {title: 'Portrait', value: 'portrait'},
  {title: 'Landscape', value: 'landscape'},
  {title: 'Architecture', value: 'architecture'},
  {title: 'Water', value: 'water'},
  {title: 'Night', value: 'night'},
  {title: 'Mexico 2022', value: 'mexico-2022'},
  {title: 'Chile 2021', value: 'chile-2021'},
  {title: 'USA 2020', value: 'usa-2020'},
  {title: 'South Africa', value: 'south-africa'},
  {title: 'Life', value: 'life'},
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
        // which Rule 2 forbids — she picks photos and order, never framing. Every photo
        // shown at reading size keeps its native aspect ratio, so nothing needs one.
        //
        // The one place the site does crop is the preview thumbnail on /writing, which is a
        // fixed centred square. That is a knob-free preset rather than a framing control,
        // and it is the reason to revisit this line rather than a contradiction of it: if
        // centred crops start losing the subject of her covers, hotspot is the fix, and
        // turning it on is a Rule 2 decision taken with her — not a component's to make.
        // See the thumbnail note in CLAUDE.md.
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
      // This description used to end "They are not shown on the site and do not affect
      // any page." That stopped being true the day a gallery could point at a tag, and a
      // field description that lies to her is worse than no description at all.
      description:
        'Optional. Tags group photos here so they are easier to find — and a gallery can ' +
        'be set to show everything with a given tag, in which case adding that tag to a ' +
        'photo puts it on that gallery’s page. The tags themselves are never shown on the site.',
      // The list on the ARRAY is what renders the checkbox grid in the Studio.
      options: {list: PHOTO_TAGS, layout: 'grid'},
      // The same list on the ARRAY MEMBER is what makes typegen emit
      // Array<"street" | "portrait" | …> instead of Array<string>. Both are required.
      of: [defineArrayMember({type: 'string', options: {list: PHOTO_TAGS}})],
      validation: (rule) => rule.unique(),
    }),

    /**
     * A visibility flag, and deliberately NOT a tag.
     *
     * The obvious alternative was an "Exclude" value in `PHOTO_TAGS`, and it was rejected on
     * what tags have become rather than on tidiness. A tag is a *topic* she ticks from a grid
     * of topics; it also generates a browse list in the sidebar and, since galleries can point
     * at one, it can be turned into a public page. An "Exclude" tag sitting between "Mexico
     * 2022" and "Street" would therefore be one mis-click away from a published gallery of
     * exactly the photographs she meant to hide.
     *
     * Separating it costs one concept and buys three things: no gallery can be built on it, it
     * cannot appear in the filter row on /shots/everything, and the field says what it does.
     *
     * Scope is narrow on purpose. This hides a photograph from the *index* only. It stays
     * reachable everywhere it was deliberately placed — as an article's cover, in a body of
     * prose, in a gallery, on the front page — because those are all places she put it by
     * hand, and a flag that silently emptied them would be a worse surprise than the one it
     * prevents.
     */
    defineField({
      name: 'excludeFromIndex',
      title: 'Hide from the Everything page',
      type: 'boolean',
      group: 'details',
      description:
        'Optional. The Everything page lists every photo you have uploaded — tick this to keep ' +
        'this one out of it. Useful for a cover photo that belongs to an article rather than ' +
        'to your photography. It stays visible anywhere you have placed it by hand.',
      initialValue: false,
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
