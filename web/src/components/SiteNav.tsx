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

export async function SiteNav() {
  const { data } = await sanityFetch(NAV_QUERY)

  // The gallery order is entirely the query's — `navOrder` first, numberless galleries A–Z
  // after; see `queries/nav.ts`. There used to be a `PINNED_FIRST` slug pinned to the top
  // here, app code naming one of her documents; "Menu position" in the Studio is that pin
  // become hers, so this component appends ALL SHOTS and reorders nothing.
  const galleries: SubNavItem[] = (data ?? []).map(gallery => ({
    key: gallery._id,
    title: gallery.title,
    to: `/shots/${gallery.slug}`,
  }))

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
    ...galleries,
    { key: 'all', title: 'All Shots', to: '/shots/all' },
  ]

  return <SiteNavList subNav={subNav} />
}
