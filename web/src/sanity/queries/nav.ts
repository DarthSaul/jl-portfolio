import { defineQuery } from 'groq'

/**
 * The galleries listed in the sidenav, under GALLERIES.
 *
 * Not a route — the second file here that isn't, after `photo.ts`, and for a comparable
 * reason: this is chrome, read by `SiteNav` on every page rather than by one of them.
 *
 * ## This is the nav becoming CMS content, which it deliberately was not
 *
 * `content/site.ts` holds the menu's routes because they "change when we change the route
 * table, not when she edits a page". That held while every route was known at build time. It
 * stops holding the moment she can create a gallery and expect a page to exist for it — the
 * route table is now partly hers.
 *
 * The reversal is deliberately partial, and the split is worth keeping: the top-level items are
 * still routes in code (their *labels* are hers, via `siteSettings.navLabels`), because they are
 * the shape of the site. Only the items under GALLERIES come from here. So a Sanity outage costs
 * the gallery links and leaves the site navigable, which is why `SiteNav` treats a failed query
 * as "no sub-items" rather than throwing.
 *
 * ## Creating a gallery is the only control over whether it is listed
 *
 * There is no "show in nav" toggle and no publish checkbox. A gallery exists, therefore it has
 * a page, therefore it is listed — one action with three consequences rather than three
 * switches that can disagree. Taking one off the site means deleting it.
 *
 * ## The order is hers, via `siteSettings.galleryOrder`
 *
 * A drag list in Site settings → Menu ("Gallery order"). It replaced `gallery.navOrder`, a number
 * on each gallery that she had to keep consistent with the others by hand.
 *
 * Two legs, concatenated in `SiteNav`:
 *
 * - `placed` — her list, in her order. A reference whose gallery has lost its slug is dropped
 *   rather than rendered as a link to nowhere.
 * - `rest` — every published gallery she has not placed, A–Z. This is what makes a new gallery
 *   appear in the menu without her doing anything, at the end, until she drags it somewhere.
 *   **It must stay the same query as `TAIL_QUERY` in `studio/components/GalleryOrderInput.tsx`**,
 *   or the Studio previews a menu the site does not render.
 *
 * The `coalesce(…, [])` is load-bearing: with no `siteSettings` document, or an empty list,
 * `galleryOrder[]._ref` is null, and `_id in null` is null rather than false — so `!(…)` would be
 * null too, and the filter would drop every gallery instead of keeping them all.
 */
export const NAV_QUERY = defineQuery(`{
  "placed": *[_type == "siteSettings" && _id == "siteSettings"][0]
    .galleryOrder[defined(@->slug.current)]->{
      _id,
      title,
      "slug": slug.current
    },
  "rest": *[
    _type == "gallery"
    && defined(slug.current)
    && !(_id in coalesce(*[_type == "siteSettings" && _id == "siteSettings"][0].galleryOrder[]._ref, []))
  ] | order(title asc){
    _id,
    title,
    "slug": slug.current
  }
}`)
