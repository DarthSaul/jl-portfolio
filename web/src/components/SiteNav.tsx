import { sanityFetch } from '@/sanity/fetch'
import { NAV_QUERY } from '@/sanity/queries/nav'

import { SiteNavList } from './SiteNavList'
import type { SubNavItem } from './SiteNavList'

/**
 * The galleries listed under START — the one part of the nav that is content rather than route
 * table. See `sanity/queries/nav` for why that split exists and why it stops where it does.
 *
 * An async Server Component. It renders inside the root layout, which App Router preserves
 * across client-side navigation, so this runs once per full render rather than once per page —
 * and the read itself is cached for `REVALIDATE` seconds on top of that.
 *
 * ## This is the only place on the site that swallows a query error
 *
 * Every route throws on a failed Sanity read, because a page with no content is a broken page,
 * and `orThrow` now makes that automatic rather than something six files remember to do. This is
 * the deliberate exception, and it is worth saying loudly precisely *because* it is now the one
 * call site that does not use `orThrow`.
 *
 * The nav is chrome on every page. A Sanity outage taking down the entire site because the nav
 * could not list four galleries would be a worse failure than the one it reports. So a failed
 * query means no sub-items, the hardcoded links still work, and the page the visitor actually
 * came for still renders.
 *
 * `data` is null both on failure and on a genuinely empty result, and `?? []` collapses the two
 * into "no galleries" — the same rendering either way, which is the only reason swallowing is
 * safe here.
 */

/**
 * The gallery this nav pins to the top, by slug.
 *
 * This is app code naming one of her documents, which is a coupling worth being explicit about
 * rather than burying. It is here because "Life" is her ongoing body of work and the trips are
 * episodes of it, so alphabetical order — which would drop it between Chile and Mexico — reads
 * as a list of equals when it is not one.
 *
 * It fails softly in every direction. Rename the gallery and the pin still works, because it
 * matches on slug rather than title. Change the slug, or delete the gallery, and the pin simply
 * finds nothing and the rest of the list is unaffected; nothing breaks and no page disappears.
 *
 * The shaped fix, if the order ever needs to be hers rather than ours, is an explicit ordering
 * field on `gallery` — which is a schema change and a new knob, and not worth it for one pin.
 */
const PINNED_FIRST = 'life'

export async function SiteNav() {
  const { data } = await sanityFetch(NAV_QUERY)

  const galleries: SubNavItem[] = (data ?? []).map(gallery => ({
    key: gallery._id,
    title: gallery.title,
    to: `/shots/${gallery.slug}`,
  }))

  // A stable partition rather than a comparator: the query already returns title A–Z, and `sort`
  // with a "pinned first" comparator would only preserve the rest of that order because V8's
  // sort happens to be stable. Splitting the list says what is meant and does not depend on that.
  const pinned = galleries.filter(g => g.to === `/shots/${PINNED_FIRST}`)
  const rest = galleries.filter(g => g.to !== `/shots/${PINNED_FIRST}`)

  /**
   * ALL SHOTS is added in code rather than fetched, because it is a route we ship and not
   * content she made — the same reason the top-level items live in `content/site.ts`. It is also
   * why it survives a Sanity outage along with them: `data` failing empties the galleries and
   * leaves this one standing.
   *
   * It sits last. The galleries above it are the curated views and this is the unfiltered pile
   * behind them, so the list reads as her selections first and the catch-all at the bottom —
   * which is also the order someone browsing wants them in.
   */
  const subNav: SubNavItem[] = [
    ...pinned,
    ...rest,
    { key: 'all', title: 'All Shots', to: '/shots/all' },
  ]

  return <SiteNavList subNav={subNav} />
}
