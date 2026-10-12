import {ImagesIcon} from '@sanity/icons/Images'
import {defineField, defineType} from 'sanity'

import {LAYOUT_PRESETS, galleryFillValidation, galleryPhotoFields} from '../galleryFields'

/**
 * One gallery: a page at /gallery/<slug>, listed under Galleries in the menu.
 *
 * Which photographs it shows and how — the layout preset and the two fill modes — is shared
 * with the Featured page and lives in `../galleryFields.ts`, along with RULE 2's preset list.
 * What is only a gallery's is here: the address, and the Studio preview.
 */

/**
 * A reference array as `preview.select` hands it back — which is NOT always an array.
 *
 * When one select names a whole array (`photos: 'photos'`) and another indexes into it
 * (`media: 'photos.0.image'`), the preview store merges the two under one head and rebuilds the
 * field by spreading the array into a plain object, `{0: …, 1: …}`. The indexed members also
 * come back *dereferenced*: `_ref` deleted, `_id` added. So `Array.isArray` is false and
 * `.length` is undefined, and every gallery in the list read "0 photos" — the bug this exists
 * to fix. Read out of `observePaths` in sanity's datastores bundle, not inferred.
 *
 * Do not "simplify" this back to `Array.isArray(value) ? value : []`.
 */
const selectedList = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []
  return Object.entries(value)
    .filter(([key]) => /^\d+$/.test(key))
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, entry]) => entry)
}

/**
 * A member that points at something — `_ref` on a raw reference, `_id` on one the preview
 * dereferenced (see `selectedList`). A half-cleared `{_key}` member has neither, so it still
 * reads as empty, the same answer `hasRealTag` gives.
 */
const isRealRef = (entry: unknown) => {
  const ref = entry as {_ref?: string; _id?: string} | null
  return Boolean(ref?._ref || ref?._id)
}
export default defineType({
  name: 'gallery',
  title: 'Gallery',
  type: 'document',
  icon: ImagesIcon,

  validation: (rule) => rule.custom(galleryFillValidation('gallery')),

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
        'The end of this gallery’s address, e.g. “iceland” makes /gallery/iceland. Do NOT use spaces or special characters; only letters, numbers and hyphens. ' +
        'Press Generate to make one from the title. Changing it later breaks any link ' +
        'someone has already shared.',
      options: {source: 'title', maxLength: 96},
      validation: (rule) => [
        rule.required(),
        // `/gallery/all` is a real page in the app — the index of everything she has
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

    // There is no menu position here any more. The order of the galleries in the site menu is
    // `siteSettings.galleryOrder` — one drag list of every gallery, rather than a number on each
    // that she had to keep consistent with the others by hand.

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

    ...galleryPhotoFields('gallery'),
  ],

  orderings: [
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
      // Only members that point at something count — the same reading `hasRealTag` gives the
      // guards, so the preview cannot claim a tag the form says is absent. `selectedList`
      // because `tags` and `photos` arrive as objects, not arrays; see its comment. The
      // positional title selects can straddle a half-cleared member (`tags.1.title` resolving
      // while `tags.0` is `{_key}` alone), so any branch that would print a title it does not
      // actually hold falls back to the count instead of rendering "undefined".
      const tagCount = selectedList(tags).filter(isRealRef).length
      const titles = [tagTitle0, tagTitle1].filter(Boolean)

      let source: string
      if (tagCount === 0) {
        const count = selectedList(photos).filter(isRealRef).length
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
