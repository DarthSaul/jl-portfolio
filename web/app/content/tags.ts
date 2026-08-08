import type { Photo } from '~~/sanity.types'

/** The tag vocabulary as a union, read off the generated schema type rather than restated. */
export type PhotoTag = NonNullable<Photo['tags']>[number]

/**
 * How each tag is written when the site says it out loud.
 *
 * The Studio has these titles already — `PHOTO_TAGS` in `studio/schemaTypes/documents/photo.ts`
 * pairs every value with one. The app cannot import them: `studio/` and `web/` are separate
 * packages with separate installs and nothing shared at the dependency level, which is
 * deliberate and documented in CLAUDE.md.
 *
 * So this is a second copy of half of that list, and the interesting part is what stops it
 * drifting. **`Record<PhotoTag, string>` is exhaustive**, and `PhotoTag` comes from typegen —
 * so adding a value to `PHOTO_TAGS`, running typegen and not adding a label here is a
 * compile error naming the missing tag, in the same way `PRESETS` in `pages/shots/[slug].vue`
 * catches a preset with no component. The duplication is real; the drift is not possible.
 *
 * Deriving the label from the value was the alternative and it is worse than it looks.
 * `mexico-2022` and `south-africa` title-case cleanly, and `usa-2020` becomes "Usa 2020" —
 * so a transform needs an acronym exception list, which is a second table with none of the
 * compile-time safety this one has.
 */
export const TAG_LABELS: Record<PhotoTag, string> = {
  'street': 'Street',
  'portrait': 'Portrait',
  'landscape': 'Landscape',
  'architecture': 'Architecture',
  'water': 'Water',
  'night': 'Night',
  'mexico-2022': 'Mexico 2022',
  'chile-2021': 'Chile 2021',
  'usa-2020': 'USA 2020',
  'south-africa': 'South Africa',
  'life': 'Life',
}

/** Falls back to the raw value, so an unknown tag renders as itself rather than as nothing. */
export const tagLabel = (tag: string) => TAG_LABELS[tag as PhotoTag] ?? tag
