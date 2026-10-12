import { cache } from 'react'

import { SITE_FALLBACK, orderNav } from '@/content/site'
import type { NavItem, NavLabels } from '@/content/site'

import { sanityFetch } from './fetch'
import { SITE_SETTINGS_QUERY } from './queries/siteSettings'

export type SiteSettings = {
  title: string
  byline: string
  description: string
  showPortrait: boolean
  navLabels: NavLabels
  /** The top-level menu items, in her order — always every one of them, see `orderNav`. */
  nav: NavItem[]
}

/**
 * Her site-wide words, with the built-in copy filling any gap.
 *
 * ## The second place on the site that swallows a query error
 *
 * `SiteNav` was the only one, and this is the same argument made for the same reason: this is
 * chrome on every page, read by the root layout. Throwing here would not even reach `error.tsx`
 * — an error in the root layout bypasses it — so a Sanity outage would replace every page,
 * including /docs and the 404, with Next's bare error screen. Instead a failed read, a missing
 * `siteSettings` document and an empty field all fall back to `SITE_FALLBACK`, **field by field**,
 * and the pages that need Sanity for their actual content still throw on their own reads.
 *
 * What that costs: a failure here is silent on the page. It is not silent in the log — the
 * error is printed — but the visible symptom of a broken settings read is her old text coming
 * back, which looks like an edit that did not stick rather than an outage. Check the server log
 * before assuming the Studio lost something. The log line says which of the two it was — a
 * failed request or a missing document — because those still mean opposite things.
 *
 * `cache()` because the layout's `generateMetadata`, the layout itself and the /gallery pages all
 * ask, and one render should make one call. The fetch is in the Data Cache regardless; this
 * saves the work of asking.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const { data, error } = await sanityFetch(SITE_SETTINGS_QUERY)

  if (error !== null)
    console.error('siteSettings: read failed, using the built-in fallback text.', error)
  else if (data === null)
    console.error('siteSettings: no document in this dataset, using the built-in fallback text.')

  // `||` rather than `??` — an emptied field is `""` or missing, and either should fall back
  // rather than render a blank name or an empty menu item.
  const labels = data?.navLabels
  return {
    title: data?.title || SITE_FALLBACK.title,
    byline: data?.byline || SITE_FALLBACK.byline,
    description: data?.description || SITE_FALLBACK.description,
    showPortrait: data?.showPortrait ?? SITE_FALLBACK.showPortrait,
    navLabels: {
      start: labels?.start || SITE_FALLBACK.navLabels.start,
      galleries: labels?.galleries || SITE_FALLBACK.navLabels.galleries,
      featured: labels?.featured || SITE_FALLBACK.navLabels.featured,
      allShots: labels?.allShots || SITE_FALLBACK.navLabels.allShots,
      copy: labels?.copy || SITE_FALLBACK.navLabels.copy,
      bio: labels?.bio || SITE_FALLBACK.navLabels.bio,
    },
    // A missing or empty list is the default order, the same as a failed read.
    nav: orderNav(data?.menuOrder),
  }
})
