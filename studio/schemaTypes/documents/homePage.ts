import {HomeIcon} from '@sanity/icons/Home'
import {defineArrayMember, defineField, defineType} from 'sanity'
import type {PortableTextSpan, PortableTextTextBlock} from 'sanity'

import {excludeAlreadyChosen} from '../photoPicker'

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

    /**
     * Parked, not dead. `HOME_QUERY` still fetches this and `index.vue` still carries the line
     * that would render it, commented out — see *The front page* in CLAUDE.md. The description
     * used to say "below the introduction", which stopped being true when the introduction
     * moved to the Bio page, so it now describes where the field stands rather than a
     * position on a page that no longer has one.
     */
    defineField({
      name: 'blurb',
      title: 'Blurb',
      type: 'proseText',
      description:
        'Three or four sentences, and the place for a link out to something. Not shown on the ' +
        'site at the moment — it is waiting for a home now the front page opens with photos.',
      validation: (rule) => rule.required(),
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

    // The only heading on the site she can put bold, italics or a link inside. It is a
    // `proseText` and not a string because her own copy asks for it — “Getting a Handle on
    // @joanatstake” wants the handle set apart. Nothing is added to `proseText` to allow
    // this: the type already offers bold, italic and a link, and nothing else.
    defineField({
      name: 'featuredTitle',
      title: 'Photos section title',
      type: 'proseText',
      description:
        'The heading over the row of photos, e.g. “Getting a Handle on @joanatstake”. ' +
        'One line — bold, italics and a link are available inside it.',
      validation: (rule) => [
        rule.required(),
        // A heading is one line. Without this, Enter quietly makes a second paragraph, and
        // both would render inside the same heading run together.
        rule.max(1).error('One line — this is a heading, not a paragraph.'),
      ],
    }),

    defineField({
      name: 'featuredSubtitle',
      title: 'Photos section subtitle',
      type: 'proseText',
      description: 'The text under that heading. A short paragraph is fine.',
      // 500, not the 200 used for one-line summaries elsewhere. Hers already runs to 357
      // characters and reads exactly as intended, and a warning that fires on correct
      // content only teaches her to ignore warnings. This is a runaway-paste guard, not a
      // style guide.
      //
      // It is spelled out by hand because `rule.max(500)` counted characters while this was
      // a `text` field and counts *blocks* now that it is an array — same line, silently
      // guarding nothing. Text lives on the spans, so the count has to walk down to them.
      validation: (rule) => [
        rule.required(),
        rule
          .custom<PortableTextTextBlock<PortableTextSpan>[]>((value) => {
            const characters = (value ?? []).reduce(
              (total, block) =>
                total +
                (block.children ?? []).reduce(
                  (runningTotal, span) => runningTotal + (span.text?.length ?? 0),
                  0,
                ),
              0,
            )

            return characters <= 500 || 'That is longer than this section is designed to hold.'
          })
          .warning(),
      ],
    }),

    defineField({
      name: 'featuredPhotos',
      title: 'Featured photos',
      type: 'array',
      description:
        'The photos at the top of the front page, in the order they appear. Exactly five. ' +
        'Drag to reorder. Each one can link to a gallery — open a photo to set that.',
      options: {layout: 'grid'},
      // A `featuredPhoto` object, not a bare reference: each slot carries the photograph and
      // optionally the gallery it links to. See objects/featuredPhoto.ts for why the link is
      // a reference rather than a typed-in address, and why a wrapper beats a named
      // reference member.
      of: [defineArrayMember({type: 'featuredPhoto'})],
      validation: (rule) => [
        rule.required().length(5).error('The front page holds exactly five photos.'),
        // `unique()` cannot do this job any more. It compares whole members ignoring `_key`,
        // and now that a member is an object, the same photograph pointed at two different
        // galleries reads as two different members and passes. The rule below compares the
        // part that actually has to be unique.
        rule.custom((slots) => {
          const refs = (Array.isArray(slots) ? slots : [])
            .map((slot) => (slot as {photo?: {_ref?: string}})?.photo?._ref)
            .filter(Boolean)

          return new Set(refs).size === refs.length
            ? true
            : 'The same photo is featured more than once.'
        }),
      ],
    }),
  ],

  preview: {
    prepare: () => ({title: 'Home page'}),
  },
})
