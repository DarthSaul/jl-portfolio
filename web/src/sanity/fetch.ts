import 'server-only'

import type { ClientReturn, QueryParams } from '@sanity/client'

import { client } from './client'
import { SanityUnreachableError } from './errors'

/**
 * How stale a page may be, in seconds. One number, applied at the fetch layer rather than per
 * route, so every read is cached the same way whether or not its route is prerendered.
 *
 * Sixty seconds is CLAUDE.md's "start with the simple version": she publishes in the Studio and
 * the change appears within a minute, with no build to know about or wait for. The alternative —
 * a Sanity webhook doing on-demand revalidation — is a secret, an endpoint and a hook to
 * configure, and remains the answer only if a minute turns out to feel wrong to her.
 */
export const REVALIDATE = 60

export type SanityResult<Q extends string> =
  | { data: ClientReturn<Q, unknown>, error: null }
  | { data: null, error: unknown }

/**
 * Every read of the Content Lake goes through here. Four things about the signature are
 * load-bearing, and each of them fails quietly if it is dropped.
 *
 * **`const Q extends string`** mirrors `defineQuery`'s own signature, so a query's *literal*
 * type — interpolations like `${PHOTO_PROJECTION}` already resolved — survives into `Q` and can
 * be looked up in the `SanityQueries` map that `sanity.types.ts` declares at its end. Widen it
 * to `string` and every result becomes the fallback.
 *
 * **`ClientReturn<Q, unknown>`, never the bare default.** `client.fetch`'s own fallback is `Any`
 * — that is, `any`. So if `sanity.types.ts` ever falls out of the TypeScript program, the old
 * behaviour is that every route keeps compiling and silently stops being typechecked. Pinning
 * the fallback to `unknown` converts that into a compile error at the first property access.
 * A green typecheck is not evidence the types are live; a red one is. The check: point a result
 * at a field that does not exist and confirm the compiler names the real shape.
 *
 * **Naming the result type inside the helper** is what sidesteps the overload trap. `client.fetch`
 * is overloaded four ways and a params object of plain values matches `QueryWithoutParams`
 * (`Record<string, never> | undefined`) first, so a direct call resolves to the no-params
 * overload and reports "string is not assignable to undefined" — an error about the overload it
 * landed on rather than about the call. Here the parameter is typed `QueryParams`, which is not
 * assignable to that, so resolution never goes near it. One signature covers both call shapes.
 *
 * **`next: { revalidate }` explicitly, on every read.** Next's implicit caching only covers
 * fetches discovered *before* a request-time API is used, and `/shots/all` awaits `searchParams`
 * first — so relying on the segment default would cache every route except the one page that
 * pages. Stating it here removes the asymmetry.
 *
 * ## A note on parameter names
 *
 * `QueryParams` declares a list of keys as `never` — `tag`, `query`, `perspective`, `signal`,
 * `token`, `cache`, `headers`, `method`, `body`, `timeout`, `next` and more — on the grounds
 * that passing a fetch option as a GROQ parameter is nearly always a mistake. `tag` is Sanity's
 * request tagging. So a GROQ parameter named `$tag` fails with "Type 'string' is not assignable
 * to type 'undefined'", which names the collision not at all. `/shots/all` filters on
 * `$filterTags` for exactly this reason. Check that list before naming a parameter after
 * anything that sounds like a request setting. This is a `@sanity/client` fact and has nothing
 * to do with the framework — it survived the port unchanged and will survive the next one.
 */
export async function sanityFetch<const Q extends string>(
  query: Q,
  params: QueryParams = {},
): Promise<SanityResult<Q>> {
  try {
    const data = await client.fetch<ClientReturn<Q, unknown>>(query, params, {
      next: { revalidate: REVALIDATE },
    })
    return { data, error: null }
  }
  catch (error) {
    return { data: null, error }
  }
}

/**
 * Unwrap a result, throwing if the request itself failed.
 *
 * This exists so that "check `error` before `data`" is a *type* rather than a convention. Six
 * routes used to carry an identical twenty-line block making the same check by hand, and the
 * ordering was the whole point of it: a transport failure also leaves `data` null, so a route
 * that only checks for null renders "nothing here" over an outage. That was not hypothetical —
 * `/` reported "No homePage document found in this dataset" for a good while when the real cause
 * was a missing CORS origin, and the dataset was correct throughout.
 *
 * What `orThrow` cannot do, and deliberately does not try to: decide whether `null` is a
 * problem. It narrows to `ClientReturn<Q, unknown>`, which for a `*[…][0]` query is still
 * `X | null`, so the second check stays a second check and stays at the call site — where the
 * answer differs. A missing `homePage` is a 500; a missing `post` is a 404; a missing
 * `writingPage` is fine and costs an intro paragraph.
 *
 * The alternative shape — try/catch at each call site — was rejected because a `catch` block is
 * trivially written as a swallow, and then the null check reads as the only check there is.
 * That is precisely the bug this is built to prevent.
 */
export function orThrow<Q extends string>(result: SanityResult<Q>): ClientReturn<Q, unknown> {
  if (result.error !== null) throw new SanityUnreachableError(result.error)
  return result.data as ClientReturn<Q, unknown>
}
