import {HomeIcon} from '@sanity/icons/Home'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {excludeAlreadyChosen} from '../photoPicker'

/**
 * What sits at the top of the front page. A fixed list, picked with a radio, so exactly one is
 * ever active and she can never type a value the site has no component for.
 *
 * RULE 2. These are presets for the top of the page, the same shape as `LAYOUT_PRESETS` in
 * galleryFields.ts: every value has a component in web/src/components/home/, and the `HERO`
 * map in web/src/app/page.tsx is `satisfies Record<…>` over this list, so adding a value here
 * without its component is a typecheck failure.
 */
export const HERO_LAYOUTS = [
  {title: 'Grid — photos as squares, three across', value: 'grid'},
  {title: 'Carousel — one large picture at a time', value: 'carousel'},
]

/**
 * True when a list of photo slots (`featuredPhoto` / `carouselPhoto`) names the same photograph
 * twice. `unique()` cannot answer it: it compares whole members, so one photograph linked to two
 * different galleries reads as two different members.
 */
const repeatsAPhoto = (slots: unknown) => {
  const refs = (Array.isArray(slots) ? slots : [])
    .map((slot) => (slot as {photo?: {_ref?: string}})?.photo?._ref)
    .filter(Boolean)
  return new Set(refs).size !== refs.length
}

/** The hero is the grid unless the carousel is explicitly chosen — a missing value is grid. */
const isCarousel = (doc: unknown) =>
  (doc as {heroLayout?: string} | undefined)?.heroLayout === 'carousel'

/**
 * The front page. A singleton — there is exactly one of these, at document id
 * `homePage`, pinned in studio/structure.ts and kept out of the Create menu in
 * sanity.config.ts.
 *
 * The fields are in the order the page reads, top to bottom, and each description says
 * where that field lands. There are deliberately no field groups: photo.ts uses tabs to
 * keep image apart from metadata, but here a single scrolling form mirrors the page
 * itself, and tabs would hide half the page behind a click.
 *
 * The site name and the byline above this page are not here — they are on siteSettings,
 * because they sit in the header of every page, not just this one.
 */
export default defineType({
  name: 'homePage',
  title: 'Home page',
  type: 'document',
  icon: HomeIcon,

  fields: [
    defineField({
      name: 'title',
      title: 'Browser tab title',
      type: 'string',
      description: 'Shown in the browser tab and in search results. Not shown on the page.',
      initialValue: 'Joan Lebow',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'heroLayout',
      title: 'Top of the page',
      type: 'string',
      description: 'What the front page opens with. Only one can be on at a time.',
      options: {list: HERO_LAYOUTS, layout: 'radio'},
      initialValue: 'grid',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'carouselPhotos',
      title: 'Carousel photos',
      type: 'array',
      description:
        'The pictures the carousel shows, in order, one at a time — each for four seconds. ' +
        'Each picture is shown whole, never cut — tall ones sit in the middle of the frame with ' +
        'space either side. Drag to reorder. Each one can link to a gallery — open a picture to ' +
        'set that.',
      options: {layout: 'grid'},
      // A `carouselPhoto` object — the photograph and an optional gallery link, the grid's slot
      // without its peek switch (see objects/carouselPhoto.ts). These were bare references until
      // the link arrived; the `wrap-carousel-photos` migration converted them.
      // No crop: each is fitted whole inside the carousel's frame (HeroCarousel.tsx).
      of: [defineArrayMember({type: 'carouselPhoto'})],
      hidden: ({parent}) => !isCarousel(parent),
      validation: (rule) => [
        rule.custom((slots) =>
          repeatsAPhoto(slots) ? 'The same photo is in the carousel more than once.' : true,
        ),
        // Conditional for the same reason as `featuredPhotos`: a hidden field still validates.
        // Counts slots with a photo picked, not slots: an added-but-empty slot would otherwise
        // satisfy this, and the site would fall back to the grid. Each empty slot is also flagged
        // on its own by `carouselPhoto.photo`'s `required()`.
        rule.custom((slots, context) =>
          !isCarousel(context.document) ||
          (Array.isArray(slots) &&
            slots.some((slot) => (slot as {photo?: {_ref?: string}})?.photo?._ref))
            ? true
            : 'The carousel needs at least one photo.',
        ),
      ],
    }),

    defineField({
      name: 'showCarouselMenu',
      title: 'Show the slide menu under the carousel',
      type: 'boolean',
      description:
        'The thin row of markers under the carousel that lets visitors jump between pictures. ' +
        'Off shows the pictures alone; they still change every four seconds.',
      initialValue: true,
      // Hidden rather than disabled, as in galleryFields.ts: a switch that does nothing on the
      // grid should not be on screen while the grid is chosen.
      hidden: ({parent}) => !isCarousel(parent),
    }),

    defineField({
      name: 'featuredPhotos',
      title: 'Featured photos',
      type: 'array',
      description:
        'The grid of photos at the top of the front page, in the order they appear. On a ' +
        'desktop they sit three to a row, so six photos make two even rows — six is the number ' +
        'to aim for. Drag to reorder. Each one can link to a gallery — open a photo to set that.',
      options: {layout: 'grid'},
      // Only the grid shows these, so only the grid asks for them. The carousel has its own
      // list (`carouselPhotos`); each is kept while the other is chosen, so switching back
      // restores either exactly.
      hidden: ({parent}) => isCarousel(parent),
      // A `featuredPhoto` object, not a bare reference: each slot carries the photograph and
      // optionally the gallery it links to. See objects/featuredPhoto.ts for why the link is
      // a reference rather than a typed-in address, and why a wrapper beats a named
      // reference member.
      of: [defineArrayMember({type: 'featuredPhoto'})],
      validation: (rule) => [
        // Any count, six recommended. This was `length(5)` while the grid packed by the
        // browser's own wrapping; the rows are chunks of three now, so every count produces
        // a working page and the only wrong number is zero.
        // Conditional rather than `required()`: a hidden field still validates, and a rule she
        // cannot see would block publishing while the carousel is chosen.
        rule.custom((slots, context) =>
          isCarousel(context.document) || (Array.isArray(slots) && slots.length > 0)
            ? true
            : 'The grid needs at least one photo.',
        ),
        // Not `unique()` — see `repeatsAPhoto`.
        rule.custom((slots) =>
          repeatsAPhoto(slots) ? 'The same photo is featured more than once.' : true,
        ),
      ],
    }),

    defineField({
      name: 'featuredWriting',
      title: 'Featured writing',
      type: 'array',
      description:
        'Exactly three, in the order they appear. Posts and links can be mixed — each one ' +
        'shows its cover photo, headline, summary and date. Drag to reorder.',
      options: {layout: 'list'},
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'post'}, {type: 'article'}],
          options: {filter: excludeAlreadyChosen},
        }),
      ],
      validation: (rule) => [
        rule.required().length(3).error('The front page shows exactly three pieces of writing.'),
        rule.unique().error('That piece is already featured.'),
      ],
    }),
  ],

  preview: {
    prepare: () => ({title: 'Home page'}),
  },
})
