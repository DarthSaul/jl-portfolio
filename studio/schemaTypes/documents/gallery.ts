import {ImagesIcon} from '@sanity/icons/Images'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {excludeAlreadyChosen, taggedPhotosNotAlreadyChosen} from '../photoPicker'

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

/**
 * A gallery fills itself one of two ways, and exactly one of them is visible at a time.
 *
 * Set a tag and the page shows every photo carrying it, newest first, updating on its own as
 * she tags more — with an optional "Put these first" list for arranging the front of the page;
 * the rest still follows on its own. Leave the tag empty and she picks the photos by hand and
 * drags them into the order she wants. Setting a tag hides the photo list rather than greying
 * it out (and hiding the tag's own list works the other way round), so there is only ever one
 * photo list on screen, and one answer to "where do the photos come from".
 *
 * The cost of the two modes, stated plainly because it is the thing to watch: a gallery that
 * has photos picked by hand and *then* gets a tag has both stored, and only one of them does
 * anything. That state is unreachable through the UI in one step but reachable in two, so
 * `validation` below catches it and points at the tag — the field that is still visible and
 * therefore still clearable. Without that, the photo list would vanish along with any
 * explanation of where it went.
 */
export default defineType({
  name: 'gallery',
  title: 'Gallery',
  type: 'document',
  icon: ImagesIcon,

  validation: (rule) =>
    rule.custom((doc) => {
      // `._ref`, not the field itself. `tag` is a reference now, and a half-cleared reference
      // is an empty object — `Boolean({})` is `true`, so testing the field would report a tag
      // on a gallery that has none and refuse to let her save the photo list she just picked.
      const hasTag = Boolean((doc?.tag as {_ref?: string} | undefined)?._ref)
      const hasPhotos = Array.isArray(doc?.photos) && doc.photos.length > 0

      if (hasTag && hasPhotos) {
        return (
          'This gallery has a tag AND a hand-picked photo list. Only the tag is used. ' +
          'Clear the tag to get the photo list back, or empty the photo list to keep the tag.'
        )
      }

      if (!hasTag && !hasPhotos) {
        return 'Pick a tag, or add photos by hand. A gallery needs one or the other.'
      }

      return true
    }),

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
      validation: (rule) => [
        rule.required(),
        // `/shots/all` is a real page in the app — the index of everything she has
        // uploaded — and a static route beats a dynamic one, so a gallery claiming this slug
        // would build fine, publish fine, and then be permanently unreachable with nothing
        // anywhere saying why. Caught here because this is the only place it is knowable.
        rule.custom((slug) =>
          slug?.current === 'all'
            ? '“all” is used by another page on the site. Try another address.'
            : true,
        ),
      ],
    }),

    defineField({
      name: 'navOrder',
      title: 'Menu position',
      type: 'number',
      description:
        'Optional. Galleries with a number come first in the site menu, lowest at the top. ' +
        'Galleries without one follow, A–Z. All Shots always sits last.',
      // Warnings, never errors — a strange number rearranges a menu, and blocking a publish
      // over it would cost more than it protects. Every wrong value fails soft: a decimal, a
      // duplicate or a negative still sorts somewhere, and A–Z picks up the ties.
      validation: (rule) => [
        rule.integer().warning('Whole numbers only — 1, 2, 3.'),
        rule.positive().warning('Use a number above zero.'),
      ],
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
      name: 'tag',
      title: 'Fill from a tag',
      type: 'reference',
      to: [{type: 'tag'}],
      description:
        'Optional. Pick a tag and this gallery shows every photo carrying it, newest first — ' +
        'tag a new photo and it appears here on its own, with nothing to update. ' +
        'Leave this empty to choose the photos yourself instead.',
      // A reference rather than a value from a fixed list, since the vocabulary is hers now.
      // It also removes a failure mode rather than just moving one: a string field could hold
      // `""`, which the Studio treated as empty while GROQ's `defined("")` reported `true`, so
      // `queries/shots.ts` needed a two-term guard to reconcile them. A reference is either set
      // or unset. See the note there.
      //
      // No `excludeAlreadyChosen`: that filter reads its `parent` as a surrounding array, and
      // this is a single field. There is nothing to exclude anyway.
    }),

    defineField({
      name: 'leadPhotos',
      title: 'Put these first',
      type: 'array',
      description:
        'Optional. These photos open the gallery, in this order — drag to arrange. Every ' +
        'other photo carrying the tag follows, newest first. A photo stays here even if it ' +
        'later loses the tag.',
      options: {layout: 'grid'},
      // The mirror image of `photos` below: visible ONLY when a tag is set, so the "one photo
      // list on screen at a time" rule survives the tag mode growing a list of its own.
      // `._ref`, not the field — a half-cleared reference is `{}`, and `Boolean({})` is `true`.
      hidden: ({parent}) => !(parent?.tag as {_ref?: string} | undefined)?._ref,
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'photo'}],
          // Same ergonomics-vs-guarantee split as `photos` below, plus one narrowing: the
          // picker only offers photos carrying this gallery's tag, because arranging the
          // front of a tag gallery with a photo the gallery does not contain is a mistake
          // the picker can simply not offer.
          options: {filter: taggedPhotosNotAlreadyChosen},
        }),
      ],
      // A photo that later loses the tag deliberately stays in this list and on the page —
      // hand-placed wins, the same rule `excludeFromIndex` follows. Checking for it here
      // would take a client fetch inside validation; the query keeps the photo regardless.
      validation: (rule) => rule.unique().error('That photo is already at the front.'),
    }),

    defineField({
      name: 'photos',
      title: 'Photos',
      type: 'array',
      description: 'Drag to reorder — this is the order they appear on the page.',
      options: {layout: 'grid'},
      // The mode switch. Hidden rather than disabled, so there is one visible answer to
      // "where do the photos come from" instead of two fields and a rule to remember.
      // `._ref` for the reason the document-level rule above uses it: a half-cleared reference
      // is `{}`, and `Boolean({})` is `true`, which would hide the photo list on a gallery that
      // has no tag and leave her with neither field on screen.
      hidden: ({parent}) => Boolean((parent?.tag as {_ref?: string} | undefined)?._ref),
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
      // `required()` has moved to the document-level rule at the top of this file, because
      // "at least one photo" is only true in one of the two modes and a field-level rule
      // cannot see the tag. Uniqueness still belongs here — it is true whenever the field
      // is in use, and a field-level message points at the right place in the form.
      validation: (rule) => rule.unique().error('That photo is already in this gallery.'),
    }),
  ],

  orderings: [
    // First entry is the Studio's default sort wherever no `defaultOrdering` applies, so the
    // list she sees matches the menu the site renders. `nulls: 'last'` is the Studio's own
    // default on asc, stated anyway for the same reason photo.ts states it: the site query
    // sends numberless galleries to the end too, and the two must not quietly disagree.
    {
      name: 'navOrderAsc',
      title: 'Menu position',
      by: [
        {field: 'navOrder', direction: 'asc', nulls: 'last'},
        {field: 'title', direction: 'asc'},
      ],
    },
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
      // preview.select follows references, so this reads the name straight off the tag
      // document. It used to be `tag: 'tag'` plus a `PHOTO_TAGS.find` below to turn the stored
      // value into a label — with the vocabulary in documents there is nothing to look up.
      tagTitle: 'tag.title',
      photos: 'photos',
      // The same dereference, resolving the first referenced photo document and reading its
      // image off it. Rule 1 holds: the gallery still stores nothing but references.
      media: 'photos.0.image',
      leadMedia: 'leadPhotos.0.image',
    },
    prepare({title, preset, tagTitle, photos, media, leadMedia}) {
      const presetTitle = LAYOUT_PRESETS.find((option) => option.value === preset)?.title

      // A tag-filled gallery cannot show a count here. `preview.select` reads fields off
      // this one document and cannot run a query, so the photographs it will render are
      // simply not knowable at this point — they live on the photos. Naming the tag is the
      // honest substitute; the alternative is a confident "0 photos", which is worse than
      // saying nothing. A cover it can now sometimes show: the first "Put these first"
      // photo really is the first photo on the page, so it is honest where it exists.
      const source = tagTitle
        ? `Everything tagged “${tagTitle}”`
        : `${Array.isArray(photos) ? photos.length : 0} ${photos?.length === 1 ? 'photo' : 'photos'}`

      return {
        title,
        subtitle: [source, presetTitle?.split(' — ')[0]].filter(Boolean).join(' · '),
        media: tagTitle ? leadMedia : media,
      }
    },
  },
})
