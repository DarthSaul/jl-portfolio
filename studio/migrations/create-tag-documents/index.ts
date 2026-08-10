import {createIfNotExists, defineMigration} from 'sanity/migrate'

/**
 * Step 1 of 2. Create a `tag` document for every tag value photographs actually carry.
 *
 * Run this before `tags-to-references`, never together with it. The reason is not tidiness:
 * `sanity migrations run` submits transactions **concurrently** (six at a time by default), so a
 * `createIfNotExists` for a tag and a patch writing a strong reference to that tag can land in
 * two different in-flight transactions — and the patch fails on reference integrity, halfway
 * through, with some photographs converted and some not.
 *
 * ## Only the five in use
 *
 * `PHOTO_TAGS` held eleven values. Six of them — Street, Portrait, Landscape, Architecture,
 * Water, Night — sit on zero photographs and only ever existed because the vocabulary was
 * hardcoded and adding to it was a code change. Shipping them as documents would ship the old
 * constraint's residue: eleven rows in a list, six of which nobody chose on purpose.
 *
 * They are left out, and that is safe in a way it has never been before — she can add any of
 * them back in two clicks, which is the entire point of the change. It also closes the "the tag
 * vocabulary is half-decided" open question in CLAUDE.md in the direction the evidence points.
 *
 * ## The ids
 *
 * `tag-<slug>`, deterministic, matching the hand-set `gallery-mexico-2022` already in the
 * dataset. Deterministic matters twice: `createIfNotExists` makes a re-run a no-op, and the
 * second migration can compute the same id from the same slug rather than looking anything up.
 *
 * A hyphen and not a dot. A dot makes an id path segment, which interacts with `path()` matching
 * and with the `drafts.` / `versions.` prefixes — no reason to find out how.
 */
export const TAG_SEED = [
  {slug: 'south-africa', title: 'South Africa'},
  {slug: 'life', title: 'Life'},
  {slug: 'mexico-2022', title: 'Mexico 2022'},
  {slug: 'usa-2020', title: 'USA 2020'},
  {slug: 'chile-2021', title: 'Chile 2021'},
]

export const tagId = (slug: string) => `tag-${slug}`

export default defineMigration({
  title: 'Create a tag document for each tag value in use',

  // This migration reads nothing — it only creates. Narrowing the export stream to a type that
  // does not exist yet costs one empty request instead of streaming the whole dataset; the
  // generator body runs whether or not it consumes `documents()`.
  documentTypes: ['tag'],

  async *migrate() {
    for (const {slug, title} of TAG_SEED) {
      yield createIfNotExists({
        _id: tagId(slug),
        _type: 'tag',
        title,
        slug: {_type: 'slug', current: slug},
      })
    }
  },
})
