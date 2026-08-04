import { defineQuery } from 'groq'

import { PHOTO_PROJECTION } from './photo'

/**
 * /writing — the COPY tab, in one request.
 *
 * Two things come back: the optional page wrapper, and the list itself.
 *
 * ## Why `post` and `article` are queried together
 *
 * They are one list to a reader — her writing, newest first — and two types only because of
 * where each piece lives. So the filter takes both and orders across them, rather than
 * fetching two lists and merging them in the component. `publishedAt` is required on both, so
 * the ordering is total and there is no undated item to sort around.
 *
 * The `_type ==` conditionals are the same shape as `HOME_QUERY`'s `featuredWriting`, and
 * deliberately so — the two lists render the same union, and a difference between them would
 * be a difference to maintain rather than a decision. An `article` carries the address of the
 * site that published it; a `post` carries the slug of its page here.
 *
 * ## Why the `writingPage` half is allowed to be null
 *
 * `homePage` missing means the dataset is wrong, and `pages/index.vue` throws on it. This one
 * is different: `writingPage` holds a browser-tab title and an optional intro, and the page's
 * actual content is the list beside it. A missing document costs an intro paragraph, not a
 * page, so the route falls back rather than failing. It does not currently exist in
 * `development`.
 */
export const WRITING_QUERY = defineQuery(`
  {
    "page": *[_type == "writingPage"][0]{ title, intro },
    "items": *[_type in ["post", "article"]] | order(publishedAt desc){
      _id,
      _type,
      title,
      publishedAt,
      summary,
      coverPhoto->{ ${PHOTO_PROJECTION} },
      _type == "article" => { url, publication },
      _type == "post" => { "slug": slug.current }
    }
  }
`)

/**
 * One post, by slug.
 *
 * `coverPhoto` is deliberately absent. The schema tells her it is "the small photo shown
 * beside this post where it is listed... Not shown on the post itself", so fetching it here
 * would be the first step towards contradicting the field's own description.
 *
 * ## The body projection
 *
 * `body[]{ ... }` spreads each member unchanged — text blocks need every field they came with,
 * including the `markDefs` that carry link annotations — and then the conditional replaces
 * `photo` on the `postPhoto` members with the resolved document.
 *
 * That dereference is Rule 1 at the query layer, exactly as `photos[]->` is on a gallery. The
 * object stores a reference and nothing else; the alt text and caption live on the photo and
 * arrive with it, which is what makes fixing a caption once fix it everywhere.
 *
 * The spread-then-override is worth a second look after any typegen run: `photo` must come out
 * as the resolved object, not as a `PhotoReference` union. See the note in
 * `objects/postPhoto.ts` for why the member is a wrapper object rather than a bare reference —
 * that is what makes `_type == "postPhoto"` reliable to match on here.
 */
export const POST_QUERY = defineQuery(`
  *[_type == "post" && slug.current == $slug][0]{
    _id,
    title,
    publishedAt,
    summary,
    body[]{
      ...,
      _type == "postPhoto" => { photo->{ ${PHOTO_PROJECTION} } }
    }
  }
`)
