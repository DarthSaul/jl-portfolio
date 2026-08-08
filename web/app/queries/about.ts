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
 * ## Why this route reads a field off `homePage`
 *
 * `portrait` is the photograph that used to open the front page — `homePage.introPhoto`. It now
 * sits under the bio instead, and `aboutPage` has no photo field of its own to hold it.
 *
 * **This is a stopgap and should not survive contact with the Studio.** Reading one page's
 * field to render another page's content is exactly the kind of hidden coupling that makes a
 * field's description a lie: `introPhoto` still tells her it is the photo on the front page,
 * and it is not any more. Nothing warns her, and moving it back is a code change rather than
 * an edit.
 *
 * The shaped fix is a `portrait` reference on `aboutPage`, which is a schema change — a new
 * field, a typegen run and a Studio deploy — and deliberately out of scope for a styling pass.
 * Until then this keeps the photograph on the page it was asked for, in one request, without
 * duplicating the image or copying its alt text. Both halves are separate top-level projections
 * because they come from two different documents; GROQ returns them as one object.
 *
 * Note the two are allowed to fail independently. `aboutPage` missing is a broken dataset and
 * the route throws. A missing `homePage` — or a `homePage` whose `introPhoto` is unset — costs
 * a photograph and nothing else, so `portrait` comes back `null` and the page renders without
 * it.
 */
export const ABOUT_QUERY = defineQuery(`
  {
    "page": *[_type == "aboutPage"][0]{
      title,
      body[]{
        ...,
        _type == "postPhoto" => { photo->{ ${PHOTO_PROJECTION} } }
      }
    },
    "portrait": *[_type == "homePage"][0].introPhoto->{ ${PHOTO_PROJECTION} }
  }
`)
