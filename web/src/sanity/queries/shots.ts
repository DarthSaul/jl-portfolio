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
 * ## The tag mode's order: an arranged front, then newest first
 *
 * The tag branch is two lists concatenated. `leadPhotos` — "Put these first" in the Studio —
 * renders in her drag order; every other photo carrying the tag follows, `dateTaken` desc with
 * `_createdAt` as the tiebreak, matching the orderings `photo.ts` offers her in the Studio.
 * This used to read "the tag mode has no order control, that is the trade the mode makes" —
 * she asked for the control, and the concat is the shape that adds it without giving up the
 * mode's point: a newly tagged photo still appears on its own, in the newest-first tail,
 * whether or not she ever touches the front.
 *
 * Three details are load-bearing:
 *
 * - **`coalesce(leadPhotos[]->…, [])`**, because `null + array` is null in GROQ — without it a
 *   gallery with no front arranged would render empty rather than newest-first.
 * - **`!(_id in coalesce(^.leadPhotos[]._ref, []))`** keeps a lead photo out of the tail. Same
 *   coalesce reason: `in null` is null, and a bare `!null` filter would drop every photo.
 * - **`coalesce(dateTaken, '')`** is a deliberate fix, not decoration: GROQ sorts null first on
 *   `desc`, so undated photographs used to bunch at the TOP while the Studio's `dateTakenDesc`
 *   ordering sends them last via `nulls: 'last'`. Coalescing to `''` — which sorts below every
 *   real date on desc — makes the site agree with the Studio, undated last, `_createdAt`
 *   breaking the ties.
 *
 * A lead photo that later loses the tag deliberately STAYS on the page: the first list never
 * checks the tag. Hand-placed wins over the flag, the same rule `excludeFromIndex` follows —
 * a list she arranged emptying itself because of an edit elsewhere would be the worse surprise.
 * Verified against the live dataset, like the scoping below: leads render first in array order,
 * the tail excludes them, and a photo in both lists appears exactly once.
 *
 * ## The empty-string trap is gone, and it went with the string
 *
 * This test used to be `defined(tag) && tag != ""`, and the second term was load-bearing:
 * `defined("")` is true, so a `tag` cleared to an empty string rather than unset took the tag
 * branch and matched no photograph, producing a page indistinguishable from a tag nothing
 * carried yet. Worse, the Studio read the same value the opposite way — it hid the photo list
 * on `Boolean(parent?.tag)`, which is false at `""` — so the form showed her photographs and
 * the site showed none, with nothing anywhere saying why.
 *
 * `tag` is a reference now, and a reference has no empty-string state: clearing it unsets the
 * field. So `defined(tag._ref)` is exact on its own, and the Studio's `Boolean(parent?.tag._ref)`
 * and this test read the field the same way **by construction** rather than by two workarounds
 * that happen to agree. The history is kept because the shape of that bug — two halves of the
 * system disagreeing about what "empty" means, silently — is the thing to watch for next time,
 * not the specific string.
 *
 * `references(^.tag._ref)` replaces `^.tag in tags` and is index-backed. `tag` is dropped from
 * the projection: nothing on the page rendered it, and as a reference it would come back as
 * `{_ref, _type}` rather than anything useful.
 */
export const GALLERY_QUERY = defineQuery(`
  *[_type == "gallery" && slug.current == $slug][0]{
    title,
    description,
    preset,
    "photos": select(
      defined(tag._ref) => coalesce(leadPhotos[]->{ ${PHOTO_PROJECTION} }, [])
        + (*[_type == "photo" && references(^.tag._ref) && !(_id in coalesce(^.leadPhotos[]._ref, []))]
          | order(coalesce(dateTaken, '') desc, _createdAt desc){ ${PHOTO_PROJECTION} }),
      photos[]->{ ${PHOTO_PROJECTION} }
    )
  }
`)
