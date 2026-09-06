import {at, defineMigration, set, unset} from 'sanity/migrate'

/**
 * Rewrite `gallery.tag` (one reference) as `gallery.tags` (an array of references).
 *
 * ONE run, unlike the tag refactor's two, and the difference is worth recording because the
 * two-run rule is easy to over-apply: `migrations run` submits transactions concurrently, so
 * a single run must never create a document and write a strong reference to it — the
 * reference can land before its target. This run creates nothing. Every tag document a
 * gallery points at already exists, so each patch is self-contained and ordering cannot
 * matter.
 *
 * ## Drafts are included, and must be
 *
 * The runner streams the export without `drafts=false`, and `documentTypes` matches on
 * `_type`, which a draft shares with its published twin. A draft left holding the old
 * single-reference shape renders as a broken field in the Studio, and the next
 * `npm run promote` carries it into `production` unchanged. Do not add a filter to exclude
 * them.
 *
 * ## Idempotent, and loud about the one state it cannot decide
 *
 * Only the OLD shape is converted — a `tag` field holding `{_ref}`. A document already
 * migrated has no `tag` field, matches nothing, and is left alone, so a second run is a
 * no-op. A half-cleared `tag` (an object with no `_ref` — the state the Studio's guards read
 * as "no tag") is unset rather than converted: reference integrity reads stored data, not
 * the schema, and a leftover value would keep its tag document undeletable with nothing on
 * screen saying why — the `homePage.introPhoto` lesson. The one state that throws is a
 * document holding BOTH a `tag` and a non-empty `tags`, because the migration cannot know
 * which she meant; that fires during the dry run, before anything is written.
 *
 * `_key`s are not written by hand: the runner generates them (`autoGenerateArrayKeys`), the
 * same mechanism `tags-to-references` leaned on.
 */
class AmbiguousGalleryTagStateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AmbiguousGalleryTagStateError'
  }
}

export default defineMigration({
  title: 'Rewrite gallery.tag (one reference) as gallery.tags (an array of references)',
  documentTypes: ['gallery'],

  migrate: {
    document(doc) {
      const tag = doc.tag as {_ref?: string} | null | undefined
      if (tag === undefined) return

      if (!tag || !tag._ref) return at('tag', unset())

      if (Array.isArray(doc.tags) && doc.tags.length > 0) {
        throw new AmbiguousGalleryTagStateError(
          `${doc._id} holds BOTH the old \`tag\` and a non-empty \`tags\` — resolve by hand ` +
            'before running this migration.',
        )
      }

      return [at('tags', set([{_type: 'reference', _ref: tag._ref}])), at('tag', unset())]
    },
  },
})
