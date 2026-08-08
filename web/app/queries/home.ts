import { defineQuery } from 'groq'

import { PHOTO_PROJECTION } from './photo'

/**
 * The front page, in one request.
 *
 * The field order below is the slot order in CLAUDE.md — site name and byline are slots 1 and
 * 2 and live on `siteSettings`, so this query starts at slot 4. Slot 3 is the nav, which is
 * frontend-only and has no schema.
 *
 * Everything a photograph needs comes back dereferenced. `featuredWriting` resolves to a
 * mixed list of posts and links out, so the projection is conditional on `_type`: an
 * `article` carries the address someone else published it at, a `post` carries the slug of
 * its page here. The shared fields are projected once, above the conditionals, because GROQ
 * merges the two halves into one object.
 *
 * `coverPhoto` is optional on both types and comes back `null` when unset — the card drops
 * its photo and keeps its headline.
 *
 * ## `introPhoto` is deliberately not fetched here
 *
 * The field still exists on `homePage` and is still required by the schema — nothing about the
 * content model changed. It is the front-page hero that no longer shows a photograph: slot 4 is
 * now a text band, per DESIGN.md's `hero-band`, and the photograph moved to the bio page.
 *
 * It is read there, out of this same `homePage` document, by `ABOUT_QUERY`. That is a stopgap
 * and the comment in `about.ts` says why it has to be. Fetching it here as well would leave the
 * front page carrying an image request it never renders.
 */
export const HOME_QUERY = defineQuery(`
  *[_type == "homePage"][0]{
    title,
    introHeading,
    intro,
    blurb,
    featuredWriting[]->{
      _id,
      _type,
      title,
      publishedAt,
      summary,
      coverPhoto->{ ${PHOTO_PROJECTION} },
      _type == "article" => { url, publication },
      _type == "post" => { "slug": slug.current }
    },
    featuredTitle,
    featuredSubtitle,
    featuredPhotos[]->{ ${PHOTO_PROJECTION} }
  }
`)
