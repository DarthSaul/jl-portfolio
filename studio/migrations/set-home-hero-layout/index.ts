import {at, defineMigration, setIfMissing} from 'sanity/migrate'

/**
 * Give the existing `homePage` its `heroLayout` and `showCarouselMenu`.
 *
 * Both fields arrived after the singleton was created, and `initialValue` only fills new
 * documents. Without this, the Studio opens the home page with no radio selected and a
 * "required" error on a field she never touched. The site does not depend on it — `HOME_QUERY`
 * coalesces both to the same defaults — so this is about the Studio telling the truth.
 *
 * `grid` is what the page already shows, so nothing on the site changes. `featuredPhoto.showPeek`
 * is deliberately not backfilled: missing means off, which is the asked-for default.
 *
 * Drafts included, as always — see CLAUDE.md. `setIfMissing`, so a re-run is a no-op and a
 * value she has already chosen is never overwritten.
 */
export default defineMigration({
  title: 'Set homePage heroLayout and showCarouselMenu where missing',
  documentTypes: ['homePage'],

  migrate: {
    document(doc) {
      const patches = []
      if (doc.heroLayout === undefined) patches.push(at('heroLayout', setIfMissing('grid')))
      if (doc.showCarouselMenu === undefined) {
        patches.push(at('showCarouselMenu', setIfMissing(true)))
      }
      return patches.length ? patches : undefined
    },
  },
})
