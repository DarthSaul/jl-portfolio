import { defineQuery } from 'groq'

/**
 * The galleries listed in the sidenav, under START.
 *
 * Not a route — the second file here that isn't, after `photo.ts`, and for a comparable
 * reason: this is chrome, read by `SiteSidebar.vue` on every page rather than by one of them.
 *
 * ## This is the nav becoming CMS content, which it deliberately was not
 *
 * `content/site.ts` says of its nav array that it "changes when we change the route table, not
 * when she edits a page", and CLAUDE.md called slot 3 frontend-only by design. That held while
 * every route was known at build time. It stops holding the moment she can create a gallery and
 * expect a page to exist for it — the route table is now partly hers.
 *
 * The reversal is deliberately partial, and the split is worth keeping: the four top-level
 * items are still hardcoded, because they are the shape of the site. Only the sub-items below
 * START come from here. So a Sanity outage costs the gallery links and leaves the site
 * navigable, which is why `SiteSidebar` treats a failed query as "no sub-items" rather than
 * throwing.
 *
 * ## Creating a gallery is the only control
 *
 * There is no "show in nav" toggle and no publish checkbox. A gallery exists, therefore it has
 * a page, therefore it is listed — one action with three consequences rather than three
 * switches that can disagree. Taking one off the site means deleting it, or clearing its tag
 * and emptying it, which the validation in `gallery.ts` will then flag.
 *
 * There was a `shotsPage.galleries` field that gated which galleries a /shots page listed. Both
 * that page and that document type are gone: the page was a stub, and a second control over
 * which galleries appear would now contradict the one above.
 *
 * ## The order is hers, via `navOrder`
 *
 * This used to be title A–Z with one gallery pinned first in `SiteNav.tsx`, and the ordering
 * question was deliberately left open. She answered it: `navOrder` ("Menu position" in the
 * Studio) is an optional number on `gallery`, lowest first. The `coalesce` sentinel is
 * load-bearing — GROQ sorts null FIRST on asc, so without it a gallery she has not numbered
 * would jump to the top rather than fall to the end. Numberless galleries sort after every
 * numbered one, A–Z, so a menu with no numbers at all reads exactly as it did before.
 *
 * The whole order lives in this query on purpose: `SiteNav.tsx` appends ALL SHOTS and reorders
 * nothing, so there is one place deciding the menu rather than a query and a component sharing
 * the job.
 */
export const NAV_QUERY = defineQuery(`
  *[_type == "gallery" && defined(slug.current)]
    | order(coalesce(navOrder, 999999) asc, title asc){
    _id,
    title,
    "slug": slug.current
  }
`)
