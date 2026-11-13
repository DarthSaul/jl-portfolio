import {at, defineMigration, set} from 'sanity/migrate'

/**
 * Wrap each `homePage.carouselPhotos` member in a `carouselPhoto` object.
 *
 * The list started as bare references to `photo`. Giving each slide an optional gallery link made
 * each member an object holding `photo` (and later `gallery`), the same shape as `featuredPhoto`.
 * Stored references would otherwise show in the Studio as members of an unknown type.
 *
 * `_key` is kept, so the Studio's order and any open editor still line up. A member that is already
 * a `carouselPhoto` passes through unchanged, so a re-run is a no-op. Anything else throws by name
 * rather than being dropped. Drafts are included, as always (CLAUDE.md).
 */
export default defineMigration({
  title: 'Wrap homePage.carouselPhotos references in carouselPhoto objects',
  documentTypes: ['homePage'],

  migrate: {
    document(doc) {
      const members = doc.carouselPhotos
      if (!Array.isArray(members)) return undefined
      if (members.every((m) => (m as {_type?: string})?._type === 'carouselPhoto')) return undefined

      const wrapped = members.map((member) => {
        const m = member as {_key?: string; _type?: string; _ref?: string}
        if (m._type === 'carouselPhoto') return member
        if (m._type === 'reference' && typeof m._ref === 'string' && m._key) {
          return {
            _key: m._key,
            _type: 'carouselPhoto',
            photo: {_type: 'reference', _ref: m._ref},
          }
        }
        throw new Error(
          `wrap-carousel-photos: ${doc._id} has a carouselPhotos member it cannot map: ${JSON.stringify(member)}`,
        )
      })

      return at('carouselPhotos', set(wrapped))
    },
  },
})
