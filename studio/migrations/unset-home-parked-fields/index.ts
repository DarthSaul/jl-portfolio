import {at, defineMigration, unset} from 'sanity/migrate'

/** The three `homePage` fields removed from the schema: never rendered, and confusing to her. */
const REMOVED = ['blurb', 'featuredTitle', 'featuredSubtitle'] as const

/**
 * Remove `homePage.blurb`, `.featuredTitle` and `.featuredSubtitle`.
 *
 * They were fetched and not rendered for months, "parked" while their place on the page was
 * decided. The decision was to drop them: they were not on the site and were confusing in the
 * Studio. Unset rather than left behind, because a stored field the schema no longer declares
 * shows in the Studio as an "unknown field" warning, and she would reasonably think something
 * had broken.
 *
 * Drafts included, as always — see CLAUDE.md. Only fields still present are unset, so a second
 * run is a no-op. The values are in the pre-migration `dataset export`, if any of the copy is
 * ever wanted again.
 */
export default defineMigration({
  title: 'Remove homePage blurb, featuredTitle and featuredSubtitle',
  documentTypes: ['homePage'],

  migrate: {
    document(doc) {
      const present = REMOVED.filter((field) => doc[field] !== undefined)
      if (present.length === 0) return
      return present.map((field) => at(field, unset()))
    },
  },
})
