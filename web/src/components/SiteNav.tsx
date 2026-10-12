import { sanityFetch } from '@/sanity/fetch'
import { NAV_QUERY } from '@/sanity/queries/nav'
import { getSiteSettings } from '@/sanity/siteSettings'

import { SiteNavList } from './SiteNavList'
import type { SubNavItem } from './SiteNavList'

/**
 * The galleries listed under GALLERIES — the one part of the nav that is content rather than route
 * table. See `sanity/queries/nav` for why that split exists and why it stops where it does.
 *
 * An async Server Component. It renders inside the root layout, which App Router preserves
 * across client-side navigation, so this runs once per full render rather than once per page —
 * and the read itself is cached for `REVALIDATE` seconds on top of that.
 *
 * ## One of two places on the site that swallow a query error
 *
 * Every route throws on a failed Sanity read, because a page with no content is a broken page,
 * and `orThrow` makes that automatic rather than something six files remember to do. This is a
 * deliberate exception, and it is worth saying loudly precisely *because* it opts out of
 * `orThrow`. The other is `getSiteSettings()` — which this also calls, for the labels — on the
 * same argument; see `sanity/siteSettings.ts`.
 *
 * The nav is chrome on every page. A Sanity outage taking down the entire site because the nav
 * could not list four galleries would be a worse failure than the one it reports. So a failed
 * query means no sub-items, the top-level links still work, and the page the visitor actually
 * came for still renders.
 *
 * `data` is null both on failure and on a genuinely empty result, and `?? []` collapses the two
 * into "no galleries" — the same rendering either way, which is the only reason swallowing is
 * safe here.
 */

export async function SiteNav() {
  const [{ data }, { navLabels, nav }] = await Promise.all([
    sanityFetch(NAV_QUERY),
    getSiteSettings(),
  ])

  // The gallery order is entirely the query's — her Gallery order list from Site settings, then
  // any gallery she has not placed, A–Z; see `queries/nav.ts`. This component concatenates the
  // two legs, appends ALL SHOTS and reorders nothing.
  const galleries: SubNavItem[] = [...(data?.placed ?? []), ...(data?.rest ?? [])].map(gallery => ({
    key: gallery._id,
    title: gallery.title,
    to: `/gallery/${gallery.slug}`,
  }))

  /**
   * ALL SHOTS is added in code rather than fetched, because it is a route we ship and not
   * content she made — the same reason the top-level routes live in `content/site.ts`. Only its
   * label is hers. It is also why it survives a Sanity outage along with them: `data` failing
   * empties the galleries and leaves this one standing, under its fallback label.
   *
   * It sits last. The galleries above it are the curated views and this is the unfiltered pile
   * behind them, so the list reads as her selections first and the catch-all at the bottom —
   * which is also the order someone browsing wants them in.
   */
  const subNav: SubNavItem[] = [
    ...galleries,
    { key: 'all', title: navLabels.allShots, to: '/gallery/all' },
  ]

  return <SiteNavList nav={nav} subNav={subNav} labels={navLabels} />
}
