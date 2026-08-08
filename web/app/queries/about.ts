import { defineQuery } from 'groq'

import { PHOTO_PROJECTION } from './photo'

/**
 * /about — her bio.
 *
 * One document, one projection. It briefly returned two — the page, plus a `portrait` read off
 * `homePage.introPhoto` — because the photograph that used to open the front page needed
 * somewhere to go and `aboutPage` deliberately has no photo field. That cross-document read is
 * gone along with the field, and this is back to the shape it should have had: a route fetching
 * its own document.
 *
 * Photographs on this page go **in the body**, as `postPhoto` members, where she places them by
 * typing around them. That was always `aboutPage`'s design and the stopgap was the exception to
 * it, not a hint that it needed a photo field.
 *
 * The body projection is the same one `POST_QUERY` uses, and deliberately identical: the two
 * fields are the same shape in the schema, so they are the same shape here and render through
 * the same component. `...` keeps every field a text block came with — including the
 * `markDefs` that carry link annotations — and the conditional replaces `photo` on the
 * `postPhoto` members with the resolved document.
 *
 * That dereference is Rule 1 at the query layer. The object stores a reference and nothing
 * else; alt text and caption live on the photo and arrive with it.
 */
export const ABOUT_QUERY = defineQuery(`
  *[_type == "aboutPage"][0]{
    title,
    introHeading,
    intro,
    body[]{
      ...,
      _type == "postPhoto" => { photo->{ ${PHOTO_PROJECTION} } }
    }
  }
`)
