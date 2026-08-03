import { defineQuery } from 'groq'

import { PHOTO_PROJECTION } from './photo'

/**
 * /about — her bio.
 *
 * The body projection is the same one `POST_QUERY` uses, and deliberately identical: the two
 * fields are the same shape in the schema, so they are the same shape here and render through
 * the same component. `...` keeps every field a text block came with — including the
 * `markDefs` that carry link annotations — and the conditional replaces `photo` on the
 * `postPhoto` members with the resolved document.
 *
 * That dereference is Rule 1 at the query layer. The object stores a reference and nothing
 * else; alt text and caption live on the photo and arrive with it.
 *
 * There is no `portrait` here because there is no longer a `portrait` field — a photograph
 * first in the body is a portrait at the top of the page. See `documents/aboutPage.ts`.
 */
export const ABOUT_QUERY = defineQuery(`
  *[_type == "aboutPage"][0]{
    title,
    body[]{
      ...,
      _type == "postPhoto" => { photo->{ ${PHOTO_PROJECTION} } }
    }
  }
`)
