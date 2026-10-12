import { defineQuery } from 'groq'

/**
 * The site's own words: name, byline, description, menu labels and menu order, and the portrait
 * switch.
 *
 * Not a route — chrome, read by the root layout on every page, like `nav.ts`. Read through
 * `getSiteSettings()` in `sanity/siteSettings.ts`, never directly, because that is where the
 * fallback lives.
 *
 * Both the id and the type are pinned. The id because `structure.ts` opens the singleton at
 * `documentId: 'siteSettings'`, so that is the document she edits; the type because typegen
 * narrows on `_type` and not on `_id` — filter by id alone and the result types as a union over
 * every document type in the schema.
 */
export const SITE_SETTINGS_QUERY = defineQuery(`
  *[_type == "siteSettings" && _id == "siteSettings"][0]{
    title,
    byline,
    description,
    showPortrait,
    navLabels{ start, galleries, featured, allShots, copy, bio },
    "menuOrder": menuOrder[].page
  }
`)
