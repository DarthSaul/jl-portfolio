import {ImagesIcon} from '@sanity/icons/Images'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {PhotoOrderInput} from '../../components/PhotoOrderInput'
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
 * Set one or more tags and the page shows every photo carrying ANY of them — union, the same
 * reading the /shots/all filter row gives multiple selections — so tagging a new photo joins
 * it to the end of the page on its own. The order comes from the "Photo order" list: photos
 * she places render first, in her drag order, and anything she has not placed follows, newest
 * additions last. The tags bring photos in; the order is hers. Leave the tags empty and she
 * picks the photos by hand and drags them into the order she wants. Setting a tag hides the
 * photo list rather than greying it out (and hiding the tags' own list works the other way
 * round), so there is only ever one photo list on screen, and one answer to "where do the
 * photos come from".
 *
 * The cost of the two modes, stated plainly because it is the thing to watch: a gallery that
 * has photos picked by hand and *then* gets a tag has both stored, and only one of them does
 * anything. That state is unreachable through the UI in one step but reachable in two, so
 * `validation` below catches it and points at the tags — the field that is still visible and
 * therefore still clearable. Without that, the photo list would vanish along with any
 * explanation of where it went.
 */

/**
 * "Has at least one real tag" — `.some((entry) => entry?._ref)`, never `.length > 0`. The
 * array equivalent of the half-cleared reference is a member that is `{_key}` and nothing
 * else: length 1, no `_ref`. Reading that as "tagged" would hide the photo list on a gallery
 * that has no tags and leave her with neither field on screen — the array shape of the
 * `Boolean({})` trap the single-reference version of this field guarded against.
 */
const hasRealTag = (tags: unknown) =>
  (Array.isArray(tags) ? tags : []).some((entry) =>
    Boolean((entry as {_ref?: string} | null)?._ref),
  )
export default defineType({
  name: 'gallery',
  title: 'Gallery',
  type: 'document',
  icon: ImagesIcon,

  validation: (rule) =>
    rule.custom((doc) => {
      // `hasRealTag`, not the array's length — see its comment for the half-cleared-member
      // trap, which would otherwise refuse to let her save the photo list she just picked.
      const hasTag = hasRealTag(doc?.tags)
      const hasPhotos = Array.isArray(doc?.photos) && doc.photos.length > 0

      if (hasTag && hasPhotos) {
        return (
          'This gallery has tags AND a hand-picked photo list. Only the tags are used. ' +
          'Clear the tags to get the photo list back, or empty the photo list to keep the tags.'
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
        'The end of this gallery’s address, e.g. “iceland” makes /shots/iceland. Do NOT use spaces or special characters; only letters, numbers and hyphens. ' +
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
      name: 'tags',
      title: 'Fill from tags',
      type: 'array',
      description:
        'Optional. Pick one or more tags and this gallery shows every photo carrying any of ' +
        'them — tag a new photo and it joins the end of the page on its own, with nothing to ' +
        'update. Set the order below in “Photo order”. Leave this empty to choose the photos ' +
        'yourself instead.',
      // References rather than values from a fixed list, since the vocabulary is hers now.
      // The single-reference version of this field also retired an empty-string bug — a
      // reference is either set or unset, where a string could be `""` and read two ways —
      // and the array keeps that property. The one empty-looking state an array adds is the
      // half-cleared member, which `hasRealTag` above exists to read correctly.
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'tag'}],
          // Ergonomics only — `unique()` below is the guarantee. On the MEMBER, always;
          // on the array `options` does nothing at all, silently.
          options: {filter: excludeAlreadyChosen},
        }),
      ],
      validation: (rule) => rule.unique().error('That tag is already on this gallery.'),
    }),

    defineField({
      // Still *stored* as `leadPhotos`, although it now sets the whole order rather than just
      // the front — renaming a stored field is a content migration bought with nothing, so the
      // label carries the new meaning instead, the same trade the /copy and /bio renames made.
      name: 'leadPhotos',
      title: 'Photo order',
      type: 'array',
      description:
        'Drag to set the order the photos appear on the page. Tagged photos you haven’t ' +
        'placed are shown underneath, in the order they follow on the page — press Place ' +
        'to arrange them too. A placed photo stays even if it later loses its tags.',
      options: {layout: 'grid'},
      // The default array input renders only stored members, and the stored members are only
      // the photos she has placed — the tail lives in the site query. Without this input the
      // field is blank on a gallery whose page shows thirty photographs, and the current
      // order is visible nowhere in the Studio. See the component for what it adds.
      components: {input: PhotoOrderInput},
      // The mirror image of `photos` below: visible ONLY when a tag is set, so the "one photo
      // list on screen at a time" rule survives the tag mode having a list of its own.
      // `hasRealTag`, not the array's length — a half-cleared member is `{_key}` alone.
      hidden: ({parent}) => !hasRealTag(parent?.tags),
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'photo'}],
          // Same ergonomics-vs-guarantee split as `photos` below, plus one narrowing: the
          // picker only offers photos carrying any of this gallery's tags, because ordering
          // a tag gallery with a photo the gallery does not contain is a mistake the picker
          // can simply not offer.
          options: {filter: taggedPhotosNotAlreadyChosen},
        }),
      ],
      // A photo that later loses its tags deliberately stays in this list and on the page —
      // hand-placed wins, the same rule `excludeFromIndex` follows. Checking for it here
      // would take a client fetch inside validation; the query keeps the photo regardless.
      validation: (rule) => rule.unique().error('That photo is already placed.'),
    }),

    defineField({
      name: 'photos',
      title: 'Photos',
      type: 'array',
      description: 'Drag to reorder — this is the order they appear on the page.',
      options: {layout: 'grid'},
      // The mode switch. Hidden rather than disabled, so there is one visible answer to
      // "where do the photos come from" instead of two fields and a rule to remember.
      // `hasRealTag` for the reason the document-level rule above uses it: a half-cleared
      // member is `{_key}` and nothing else, which would hide the photo list on a gallery
      // that has no tags and leave her with neither field on screen.
      hidden: ({parent}) => hasRealTag(parent?.tags),
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
      // preview.select follows references, and it indexes into reference arrays the same way
      // `photos.0.image` below does — these read the names straight off the first two tag
      // documents. `tags` itself comes back raw (an array of refs) and carries the count.
      tagTitle0: 'tags.0.title',
      tagTitle1: 'tags.1.title',
      tags: 'tags',
      photos: 'photos',
      // The same dereference, resolving the first referenced photo document and reading its
      // image off it. Rule 1 holds: the gallery still stores nothing but references.
      media: 'photos.0.image',
      leadMedia: 'leadPhotos.0.image',
    },
    prepare({title, preset, tagTitle0, tagTitle1, tags, photos, media, leadMedia}) {
      const presetTitle = LAYOUT_PRESETS.find((option) => option.value === preset)?.title

      // A tag-filled gallery cannot show a photo count here. `preview.select` reads fields
      // off this one document and cannot run a query, so the photographs it will render are
      // simply not knowable at this point — they live on the photos. Naming the tags is the
      // honest substitute; the alternative is a confident "0 photos", which is worse than
      // saying nothing. If the dereference ever comes back empty, the tag count stands in —
      // degraded to a number, never blank. A cover it can sometimes show: the first
      // "Photo order" photo really is the first photo on the page, so it is honest where it
      // exists.
      // Only members with a real `_ref` count — the same reading `hasRealTag` gives the
      // guards, so the preview cannot claim a tag the form says is absent. The positional
      // title selects can straddle a half-cleared member (`tags.1.title` resolving while
      // `tags.0` is `{_key}` alone), so any branch that would print a title it does not
      // actually hold falls back to the count instead of rendering "undefined".
      const tagCount = (Array.isArray(tags) ? tags : []).filter(
        (entry) => (entry as {_ref?: string} | null)?._ref,
      ).length
      const titles = [tagTitle0, tagTitle1].filter(Boolean)

      let source: string
      if (tagCount === 0) {
        const count = Array.isArray(photos) ? photos.length : 0
        source = `${count} ${count === 1 ? 'photo' : 'photos'}`
      } else if (titles.length < Math.min(tagCount, 2)) {
        source = `Filled from ${tagCount} ${tagCount === 1 ? 'tag' : 'tags'}`
      } else if (tagCount === 1) {
        source = `Everything tagged “${titles[0]}”`
      } else if (tagCount === 2) {
        source = `Everything tagged “${titles[0]}” and “${titles[1]}”`
      } else {
        source = `Everything tagged “${titles[0]}”, “${titles[1]}” +${tagCount - 2} more`
      }

      return {
        title,
        subtitle: [source, presetTitle?.split(' — ')[0]].filter(Boolean).join(' · '),
        media: tagCount > 0 ? leadMedia : media,
      }
    },
  },
})
