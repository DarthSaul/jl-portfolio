import { defineQuery } from 'groq'

import { PHOTO_PROJECTION } from './photo'

/**
 * The front page, in one request.
 *
 * The field order below is the order the page reads. The site name, the byline and the nav are
 * not here: they are chrome on every page rather than front-page content, so the first two live
 * on `siteSettings` and the third is assembled in `queries/nav.ts`.
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
 * `featuredPhotos` is projected with `[]{ }` and not `[]->{ }`. Each member is a
 * `featuredPhoto` object rather than a bare reference now, so there is nothing to dereference
 * at the member level — the `->` is one level in, on `photo` and on `gallery`. Getting this
 * wrong is not subtle in the types and is invisible on the page: `featuredPhotos[]->` against
 * an array of objects types as `Array<null>`, which is how this was caught.
 *
 * `gallery` resolves to a title and a slug rather than a stored path, so renaming a gallery's
 * address updates every front-page link to it with no edit. It comes back `null` when the slot
 * has no link, and the photograph renders unlinked.
 *
 * ## The whole introduction has left this page
 *
 * `introHeading` and `intro` are `aboutPage`'s fields now and are rendered there. `introPhoto`
 * was deleted outright rather than following them — `aboutPage` has no photo field by design,
 * and photographs on that page come from its body. None of the three is fetched here, because
 * none of them appears on the front page, which now opens with the photo grid and goes straight
 * to the featured writing.
 */
export const HOME_QUERY = defineQuery(`
  *[_type == "homePage"][0]{
    title,
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
    featuredPhotos[]{
      _key,
      photo->{ ${PHOTO_PROJECTION} },
      "gallery": gallery->{ title, "slug": slug.current }
    }
  }
`)
