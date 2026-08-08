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
 * This import is also what pulls `sanity.types.ts` into the app's TypeScript program, which
 * the `declare module '@sanity/client'` block at the end of that file needs in order to type
 * `useSanityQuery` results. `typescript.tsConfig.include` in nuxt.config.ts states the same
 * thing outright, so that the day nothing imports this type the augmentation does not quietly
 * drop out and take every route's types down to `unknown` with it.
 */
export type PhotoProjection = NonNullable<
  import('~~/sanity.types').HOME_QUERY_RESULT
>['featuredPhotos'][number]['photo']
