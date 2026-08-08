import { defineQuery } from 'groq'

import { PHOTO_PROJECTION } from './photo'

/**
 * /shots/everything — the index of everything she has uploaded.
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
 * `$filterTag` is always a string; empty means "everything". A null-versus-missing param is the
 * kind of thing that reads as working and quietly filters nothing, so the empty string is
 * passed explicitly and the comparison is written to say so.
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
 * from the tag vocabulary: a filter that returns nothing is worse than a filter that is absent.
 * It ignores `$filterTag` — the row must keep offering the other tags once one is chosen — but it
 * does respect `excludeFromIndex`, so a tag used only by hidden photographs does not appear.
 */
export const EVERYTHING_QUERY = defineQuery(`
  {
    "photos": *[_type == "photo" && excludeFromIndex != true && ($filterTag == "" || $filterTag in tags)]
      | order(dateTaken desc, _createdAt desc)[$offset...$end]{ ${PHOTO_PROJECTION} },

    "total": count(*[_type == "photo" && excludeFromIndex != true && ($filterTag == "" || $filterTag in tags)]),

    "tagsInUse": array::unique(
      *[_type == "photo" && excludeFromIndex != true && count(tags) > 0].tags[]
    )
  }
`)

/**
 * The next slice, fetched imperatively when more is asked for.
 *
 * Deliberately narrower than `EVERYTHING_QUERY`: no `total` and no `tagsInUse`, because
 * neither changes as you page and re-sending them would be the same two counts on every
 * scroll. The page appends what comes back rather than replacing, so nothing already on
 * screen is re-fetched.
 */
export const MORE_PHOTOS_QUERY = defineQuery(`
  *[_type == "photo" && excludeFromIndex != true && ($filterTag == "" || $filterTag in tags)]
    | order(dateTaken desc, _createdAt desc)[$offset...$end]{ ${PHOTO_PROJECTION} }
`)
