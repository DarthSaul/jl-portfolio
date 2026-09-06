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
 * - **`^` reaches the enclosing document, and `select()` does not add a level.** `^.tags` inside
 *   the subquery is the gallery's own `tags`. Verified (as `^.tag`, before the field became an
 *   array; re-verified as an array traversal when it did).
 * - **`^` cannot see a projected alias, only a stored field.** `{"t": "x", "p": *[^.t in tags]}`
 *   silently returns an empty array rather than erroring, so a tag routed through an alias
 *   would produce a page that looks like "no photos with this tag" and is really a broken
 *   query. Verified, and the reason `tags` is read straight off the document below.
 *
 * ## The tag mode's order: her arrangement, then arrivals at the end
 *
 * The tag branch is two lists concatenated, and the first one IS the order. `leadPhotos` —
 * "Photo order" in the Studio — renders in her drag order and can hold every photo in the
 * gallery; any tagged photo she has not placed follows in `_createdAt` asc, so a newly
 * tagged photograph lands at the END of the page on its own. The tag's job is bringing
 * photographs in; the order is hers. This section used to describe a `dateTaken` desc tail —
 * "an arranged front, then newest first" — and before that "no order control at all"; the
 * date ordering is deliberately gone, `coalesce(dateTaken, '')` null fix and all. The tail
 * keeps an automatic order only because arriving photos need somewhere deterministic to land
 * (the end) before she places them.
 *
 * `_createdAt` asc rather than anything cleverer, because the tail must be STABLE:
 * `_updatedAt` would send a photograph to the end of the gallery when she fixes a typo in
 * its alt text. The one wrinkle that buys: "the end" means newest-UPLOADED last, so tagging
 * a years-old photo drops it into the tail by upload date rather than truly last. If that
 * ever surprises her, the remedy is the arrangement itself — place it.
 *
 * Two details are load-bearing:
 *
 * - **`coalesce(leadPhotos[]->…, [])`**, because `null + array` is null in GROQ — without it a
 *   gallery with nothing arranged would render empty rather than in arrival order.
 * - **`!(_id in coalesce(^.leadPhotos[]._ref, []))`** keeps a placed photo out of the tail. Same
 *   coalesce reason: `in null` is null, and a bare `!null` filter would drop every photo.
 *
 * A placed photo that later loses its tags deliberately STAYS on the page: the first list never
 * checks the tags. Hand-placed wins over the flag, the same rule `excludeFromIndex` follows —
 * a list she arranged emptying itself because of an edit elsewhere would be the worse surprise.
 * Verified against the live dataset, like the scoping below: placed photos render first in
 * array order, the tail excludes them, and a photo in both lists appears exactly once.
 *
 * ## The empty-string trap is gone, and its array cousins are guarded the same way
 *
 * This test used to be `defined(tag) && tag != ""`, and the second term was load-bearing:
 * `defined("")` is true, so a `tag` cleared to an empty string rather than unset took the tag
 * branch and matched no photograph, producing a page indistinguishable from a tag nothing
 * carried yet. Worse, the Studio read the same value the opposite way — it hid the photo list
 * on `Boolean(parent?.tag)`, which is false at `""` — so the form showed her photographs and
 * the site showed none, with nothing anywhere saying why.
 *
 * The field is an ARRAY of references now, and the array has two empty-looking states of its
 * own, both of which the guard below reads the way the Studio does:
 *
 * - **An empty array is `defined()`**, so `defined(tags)` would take the tag branch and match
 *   no photograph — the same bug back in a new shape. Counting instead falls through: a
 *   missing field counts null (falsy against `> 0`), an empty array counts 0.
 * - **A half-cleared member is `{_key}` with no `_ref`**, and it is publishable — the Studio
 *   reads it as "no tag" (`hasRealTag` in `gallery.ts`), so a bare `count(tags) > 0` here
 *   would take the tag branch on a gallery whose form is showing her the hand-picked list.
 *   `count(tags[defined(@._ref)]) > 0` counts only real references, which is `.some((t) =>
 *   t._ref)` said in GROQ — the two halves agree about "empty" by construction, which is the
 *   property the whole section exists to defend.
 *
 * The history is kept because the shape of that bug — two halves of the system disagreeing
 * about what "empty" means, silently — is the thing to watch for next time, not the specific
 * string.
 *
 * `references(^.tags[]._ref)` is index-backed and reads as UNION: a photo carrying any of the
 * gallery's tags is in, matched once however many of them it carries, so the concatenation
 * needs no dedupe. It is the same any-of reading the /shots/all filter row gives multiple
 * selections, and the same `references($tagIds)` the Studio's PhotoOrderInput runs. `tags` is
 * dropped from the projection: nothing on the page renders it, and as references it would come
 * back as `[{_ref, _type}]` rather than anything useful.
 */
export const GALLERY_QUERY = defineQuery(`
  *[_type == "gallery" && slug.current == $slug][0]{
    title,
    description,
    preset,
    "photos": select(
      count(tags[defined(@._ref)]) > 0 => coalesce(leadPhotos[]->{ ${PHOTO_PROJECTION} }, [])
        + (*[_type == "photo" && references(^.tags[]._ref) && !(_id in coalesce(^.leadPhotos[]._ref, []))]
          | order(_createdAt asc){ ${PHOTO_PROJECTION} }),
      photos[]->{ ${PHOTO_PROJECTION} }
    )
  }
`)
