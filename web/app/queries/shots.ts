import { defineQuery } from 'groq'

import { PHOTO_PROJECTION } from './photo'

/**
 * /shots/[slug] — one gallery, however it fills itself.
 *
 * ## The two modes, resolved in GROQ rather than in the component
 *
 * A gallery either points at a tag or holds a hand-picked list — see `gallery.ts`, which hides
 * whichever field is not in use. The route does not want to know which: it asks for `photos`
 * and gets photographs, so `presets/` renders one shape and there is no branch in the page.
 *
 * `select()` is what makes that one query instead of two. Both branches were verified against
 * the live dataset before this was written, because two things about the scoping are easy to
 * get wrong and neither fails loudly:
 *
 * - **`^` reaches the enclosing document, and `select()` does not add a level.** `^.tag` inside
 *   the subquery is the gallery's own `tag`. Verified.
 * - **`^` cannot see a projected alias, only a stored field.** `{"t": "x", "p": *[^.t in tags]}`
 *   silently returns an empty array rather than erroring, so a tag routed through an alias
 *   would produce a page that looks like "no photos with this tag" and is really a broken
 *   query. Verified, and the reason `tag` is read straight off the document below.
 *
 * The ordering is `dateTaken` desc with `_createdAt` as the tiebreak, matching the orderings
 * `photo.ts` offers her in the Studio. `dateTaken` is optional, so the second key is what keeps
 * undated photographs from bunching arbitrarily. Note this is the one thing the tag mode gives
 * up: with a hand-picked list she drags photos into the order she wants, and with a tag the
 * order is computed. That is the trade the mode makes, not an oversight.
 *
 * `defined(tag)` rather than a truthiness check, because an empty string is a state the Studio
 * can produce by clearing the dropdown, and `"" in tags` is false for every photo — which would
 * be an empty page rather than a fallback to the picked list.
 */
export const GALLERY_QUERY = defineQuery(`
  *[_type == "gallery" && slug.current == $slug][0]{
    title,
    description,
    preset,
    tag,
    "photos": select(
      defined(tag) => *[_type == "photo" && ^.tag in tags]
        | order(dateTaken desc, _createdAt desc){ ${PHOTO_PROJECTION} },
      photos[]->{ ${PHOTO_PROJECTION} }
    )
  }
`)
