import { defineQuery } from 'groq'

/**
 * The photo projection, shared by every query that resolves a photo reference.
 *
 * Not a route, which makes this the one file in `queries/` that breaks the one-file-per-route
 * convention — deliberately. Rule 1 means every route reaches photographs the same way, through
 * `->`, and the alternative is pasting these seven lines into six query files and having
 * `SanityPhoto` accept six structurally-identical-but-separately-maintained shapes.
 *
 * Interpolating a constant into `defineQuery` is resolved by Sanity's typegen parser, so the
 * generated result types stay accurate. Verify that after any edit here: the check is that
 * `HOME_QUERYResult` still names `lqip`, `width` and `height` rather than collapsing to
 * `unknown`.
 *
 * `image.asset->` is the second half of Rule 1. The photo document holds the only image field
 * in the schema; everything upstream of it holds a reference, and this is where those get
 * resolved into something with a URL.
 */
export const PHOTO_PROJECTION = `
  _id,
  alt,
  caption,
  "asset": image.asset->{
    url,
    "lqip": metadata.lqip,
    "width": metadata.dimensions.width,
    "height": metadata.dimensions.height
  }
`

/**
 * What the projection above resolves to, for `SanityPhoto` to take as a prop.
 *
 * Read off a generated query result rather than written out, because CLAUDE.md forbids a
 * hand-maintained shape sitting parallel to the generated ones — that is how a query and a
 * component drift. Any query using `PHOTO_PROJECTION` produces this same shape, so the home
 * page is only the arbitrary one that happens to name it.
 *
 * This import also reaches `sanity.types.ts`, whose trailing `declare module '@sanity/client'`
 * block is what types every query result. That augmentation only applies while the file is in
 * the TypeScript program — tsconfig's glob covers it from the `web/` root, so no special case
 * is needed any more, but know what its absence looks like: `ClientReturn` falls back to its
 * second type argument, `sanityFetch` pins that to `unknown`, and every page stops compiling.
 * It used to fall back to `any` and stop *checking* instead. See `sanity/fetch.ts`.
 */
export type PhotoProjection = NonNullable<
  import('~~/sanity.types').HOME_QUERY_RESULT
>['featuredPhotos'][number]['photo']

/**
 * One photograph by id, for the showcase.
 *
 * The showcase is `?photo=<_id>` on `/shots/all` and `/shots/<slug>`, and a gallery page never
 * needs this — `GALLERY_QUERY` already returns every photograph in the gallery, so it resolves
 * the id with a `find`. This exists for the index, where a shared link can name a photograph
 * that is not in the first page of 24 and never will be until someone scrolls to it.
 *
 * **It restates `excludeFromIndex != true` deliberately.** The flag is a visibility rule about
 * the index, and this query is how a photograph is reached *through* the index — so a query
 * that ignored it would be a hole in the flag rather than an exception to it. She would tick
 * "hide this" and the photograph would still be one URL away.
 *
 * It deliberately does *not* restate the tag filter. A filter is a view of the set, not the set,
 * so `?tag=life&photo=X` resolves X whether or not X carries the tag — closing the showcase
 * returns to the filtered index either way, which is the honest behaviour for a link someone
 * shared.
 *
 * `$photoId` rather than `$id`, following `$filterTag`'s precedent: name a parameter after the
 * field it filters, and stay well clear of `QueryParams`' reserved keys.
 */
export const PHOTO_BY_ID_QUERY = defineQuery(`
  *[_type == "photo" && _id == $photoId && excludeFromIndex != true][0]{ ${PHOTO_PROJECTION} }
`)
