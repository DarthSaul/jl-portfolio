import {at, defineMigration, unset} from 'sanity/migrate'

/**
 * Remove `gallery.navOrder` ("Menu position"), now that the menu order is the drag list at
 * `siteSettings.galleryOrder`.
 *
 * **Run `scripts/seed-site-settings.ts` first.** It reads these numbers to build the list; this
 * deletes them.
 *
 * Unset rather than left behind, because a stored field the schema no longer declares shows
 * in the Studio as an "unknown field" warning on every gallery, and she would reasonably think
 * something had broken.
 *
 * Drafts included, as always — see CLAUDE.md. Only documents that still hold the field are
 * touched, so a second run is a no-op.
 */
export default defineMigration({
  title: 'Remove gallery.navOrder (replaced by siteSettings.galleryOrder)',
  documentTypes: ['gallery'],

  migrate: {
    document(doc) {
      if (doc.navOrder === undefined) return
      return at('navOrder', unset())
    },
  },
})
