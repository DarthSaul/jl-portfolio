import {defineArrayMember, defineField} from 'sanity'
import type {SanityDocument} from 'sanity'

import {PhotoOrderInput} from '../components/PhotoOrderInput'
import {excludeAlreadyChosen, taggedPhotosNotAlreadyChosen} from './photoPicker'

/**
 * The parts of a gallery that decide which photographs it shows and how — shared by `gallery`
 * and the `featuredPage` singleton, which is a gallery with a fixed address (/featured) instead
 * of a slug. One definition, so the two cannot drift: the site renders both through the same
 * query projection (`GALLERY_PROJECTION` in `web/src/sanity/queries/shots.ts`) and the same
 * `GalleryView`, and that only works while the stored shapes are identical.
 */

/**
 * RULE 2. Every value here must have a matching component in
 * web/src/components/presets/. Adding a preset is two changes, always together: the
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
 * reading the /gallery/all filter row gives multiple selections — so tagging a new photo joins
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
 * `galleryFillValidation` below catches it and points at the tags — the field that is still
 * visible and therefore still clearable. Without that, the photo list would vanish along with
 * any explanation of where it went.
 */

/**
 * "Has at least one real tag" — `.some((entry) => entry?._ref)`, never `.length > 0`. The
 * array equivalent of the half-cleared reference is a member that is `{_key}` and nothing
 * else: length 1, no `_ref`. Reading that as "tagged" would hide the photo list on a gallery
 * that has no tags and leave her with neither field on screen — the array shape of the
 * `Boolean({})` trap the single-reference version of this field guarded against.
 */
export const hasRealTag = (tags: unknown) =>
  (Array.isArray(tags) ? tags : []).some((entry) =>
    Boolean((entry as {_ref?: string} | null)?._ref),
  )

/**
 * The document-level rule: one fill mode, never both and never neither. `noun` is what the
 * message calls the document — "gallery", or "page" for the Featured page.
 */
export const galleryFillValidation =
  (noun: string) => (doc: SanityDocument | undefined) => {
    // `hasRealTag`, not the array's length — see its comment for the half-cleared-member
    // trap, which would otherwise refuse to let her save the photo list she just picked.
    const hasTag = hasRealTag(doc?.tags)
    const hasPhotos = Array.isArray(doc?.photos) && doc.photos.length > 0

    if (hasTag && hasPhotos) {
      return (
        `This ${noun} has tags AND a hand-picked photo list. Only the tags are used. ` +
        'Clear the tags to get the photo list back, or empty the photo list to keep the tags.'
      )
    }

    if (!hasTag && !hasPhotos) {
      return `Pick a tag, or add photos by hand. A ${noun} needs one or the other.`
    }

    return true
  }

/** Layout, then the two fill modes. `noun` as above, for the descriptions. */
export const galleryPhotoFields = (noun: string) => [
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
      `Optional. Pick one or more tags and this ${noun} shows every photo carrying any of ` +
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
    validation: (rule) => rule.unique().error(`That tag is already on this ${noun}.`),
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
    // `hasRealTag` for the reason the document-level rule uses it: a half-cleared
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
    // `required()` lives in `galleryFillValidation`, because "at least one photo" is only
    // true in one of the two modes and a field-level rule cannot see the tag. Uniqueness
    // still belongs here — it is true whenever the field is in use, and a field-level message
    // points at the right place in the form.
    validation: (rule) => rule.unique().error(`That photo is already in this ${noun}.`),
  }),
]
