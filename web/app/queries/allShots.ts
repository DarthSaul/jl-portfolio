import { defineQuery } from 'groq'

import { PHOTO_PROJECTION } from './photo'

/**
 * /shots/all — the index of everything she has uploaded.
 *
 * ## The visible set, defined once
 *
 * `excludeFromIndex != true` rather than `!excludeFromIndex` or `== false`. The field is
 * optional and new, so the overwhelming majority of photographs do not have it at all, and
 * the question is what GROQ does with a missing field. Verified against the live dataset:
 * `!= true`, `!defined(x) || x == false` and `!(x == true)` all return the full set, so all
 * three are correct — `!= true` is chosen for being the shortest true statement of the intent,
 * which is "hidden only if she said so".
 *
 * The same predicate appears in both queries below and has to stay identical in both, or the
 * count disagrees with the list and the page paginates towards photographs that are not there.
 * That is the argument for interpolating it, and the argument against is stronger: a GROQ
 * fragment spliced into a filter is invisible to anyone reading the query, and this one is
 * short enough to read twice. `PHOTO_PROJECTION` is interpolated because it is seven lines and
 * appears in six files; a two-term filter in one file is not the same case.
 *
 * ## Paging
 *
 * `[$offset...$end]` is a GROQ slice, so exactly one page of documents crosses the wire. Both
 * indices are absolute — `$end` is where the slice stops, not how many rows come back, which is
 * why it is not called `$limit`. The
 * cost that matters is not the document count but the LQIP: every projected photo carries a
 * base64 placeholder of roughly a kilobyte, so 200 photographs is ~200 kB of JSON before a
 * single image is requested. That is the reason this pages at all, and the reason `MORE_QUERY`
 * exists rather than the page re-fetching `[0...shown]` and throwing the previous slice away.
 *
 * ## Filtering
 *
 * `$filterTags` is an array of tag *slugs*, and an empty array means "everything". Slugs rather
 * than document ids because the array is built straight from the URL — `?tag=life&tag=chile-2021`
 * — and an address should say what it filters by. `references()` turns those into ids in one
 * indexed step.
 *
 * **Union, not intersection.** A photograph matching *any* selected tag is in. Adding a filter
 * therefore always widens the set, which is the behaviour that cannot surprise her: with one
 * trip tag per photograph, an intersection would return nothing the moment a second tag was
 * ticked. The intersection form, if it is ever wanted, is
 * `count(tags[@->slug.current in $filterTags]) == count($filterTags)`.
 *
 * `count($filterTags) == 0 ||` short-circuits the unfiltered case rather than letting
 * `references()` run against an empty subquery, which would match nothing and empty the page.
 *
 * `references()` matches a reference anywhere in the document. On a `photo` the only other
 * reference is `image.asset`, whose id a `_type == "tag"` subquery can never return, so this is
 * exact as well as fast. The precise-but-slower alternative is
 * `count(tags[@._ref in *[_type == "tag" && slug.current in $filterTags]._id]) > 0`.
 *
 * **It is not called `$tag`, and that is not a style choice.** `QueryParams` in `@sanity/client`
 * reserves a list of keys as `never` — `tag`, `query`, `perspective`, `signal`, `token`,
 * `cache`, `headers`, `timeout` and others — because they are *fetch options*, and passing one
 * as a GROQ parameter is nearly always a mistake someone is about to spend an hour on. `tag` is
 * request tagging for Sanity's own logging. A parameter named `$tag` therefore fails to
 * typecheck with "Type 'string' is not assignable to type 'undefined'", which names the
 * overload it fell through to rather than the collision. Check that list before naming a
 * parameter after anything that sounds like a request setting.
 *
 * `tagsInUse` powers the filter row and is deliberately computed from photographs rather than
 * being every tag she has made: a filter that returns nothing is worse than a filter that is
 * absent. It ignores `$filterTags` — the row must keep offering the other tags once one is
 * chosen — but it does respect `excludeFromIndex`, so a tag carried only by hidden photographs
 * does not appear.
 *
 * It now returns the tag's name and slug rather than a bare string, and orders by name in GROQ.
 * Both follow from tags being documents: the name is content, and sorting it here deleted a
 * client-side sort that had to reach for a lookup table to know what a value was called. The
 * dedupe is on `_ref` strings rather than on projected objects, because the id is the identity
 * and `array::unique` over objects is not something to lean on.
 */
export const ALL_SHOTS_QUERY = defineQuery(`
  {
    "photos": *[_type == "photo" && excludeFromIndex != true && (count($filterTags) == 0 || references(*[_type == "tag" && slug.current in $filterTags]._id))]
      | order(dateTaken desc, _createdAt desc)[$offset...$end]{ ${PHOTO_PROJECTION} },

    "total": count(*[_type == "photo" && excludeFromIndex != true && (count($filterTags) == 0 || references(*[_type == "tag" && slug.current in $filterTags]._id))]),

    "tagsInUse": *[_type == "tag" && _id in array::unique(
      *[_type == "photo" && excludeFromIndex != true && count(tags) > 0].tags[]._ref
    )] | order(title asc){ title, "slug": slug.current }
  }
`)

/**
 * One chip in the filter row, exactly as `tagsInUse` projects it.
 *
 * Read back off the generated result rather than written out, for the reason `PhotoProjection`
 * is: a hand-written shape sitting parallel to a generated one is how a query and a component
 * drift. It replaces `PhotoTag` from the deleted `content/tags.ts`, which was a union of string
 * literals kept honest by a `Record<PhotoTag, string>` of labels. Neither is needed now — the
 * name is content and travels with the query, so there is no second copy to keep honest.
 */
export type TagOption = NonNullable<
  import('~~/sanity.types').ALL_SHOTS_QUERY_RESULT
>['tagsInUse'][number]

/**
 * The next slice, fetched imperatively when more is asked for.
 *
 * Deliberately narrower than `ALL_SHOTS_QUERY`: no `total` and no `tagsInUse`, because
 * neither changes as you page and re-sending them would be the same two counts on every
 * scroll. The page appends what comes back rather than replacing, so nothing already on
 * screen is re-fetched.
 *
 * The filter predicate is character-identical to the one above, and has to stay that way — if
 * the two ever disagree, `total` counts one set while the page pages through another, and the
 * "Load more" button walks towards photographs that are not there.
 */
export const MORE_PHOTOS_QUERY = defineQuery(`
  *[_type == "photo" && excludeFromIndex != true && (count($filterTags) == 0 || references(*[_type == "tag" && slug.current in $filterTags]._id))]
    | order(dateTaken desc, _createdAt desc)[$offset...$end]{ ${PHOTO_PROJECTION} }
`)
