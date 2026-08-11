import { readTags } from '@/lib/showcase'
import { sanityFetch } from '@/sanity/fetch'
import { MORE_PHOTOS_QUERY, PAGE_SIZE } from '@/sanity/queries/allShots'

/**
 * One further slice of `/shots/all`, for infinite scroll.
 *
 * ## Why this exists at all
 *
 * This is the site's only read that happens after hydration. The Nuxt app made it from the browser
 * with `@sanity/client` directly, and moving it here is what lets **every** Sanity value be
 * server-side: no `NEXT_PUBLIC_` prefix, nothing in the bundle, and `import 'server-only'` in
 * `sanity/client.ts` to make a regression a build error. It also retires the entire CORS failure
 * class CLAUDE.md documents, because no browser request reaches Sanity to carry an `Origin` header.
 *
 * ## Why a route handler and not a Server Action
 *
 * Next's own docs say to use one for non-mutation requests, and the reason is measurable: Server
 * Actions are dispatched **one at a time per client** through the router's action queue, and a
 * navigation arriving mid-flight marks the pending action discarded. For a read that fires on
 * scroll that is the wrong queue to be in. A route handler never touches the router at all.
 *
 * ## `force-dynamic`
 *
 * A GET route handler is statically evaluated at build time by default, which would freeze one
 * answer and serve it to every request. The read *inside* it is still cached — `sanityFetch`
 * carries `next: { revalidate }` — so this is one Vercel invocation over a Data Cache hit, not a
 * Sanity request per scroll.
 *
 * ## The slice is clamped, because this is a public endpoint
 *
 * Anyone can call it. That exposes nothing a `curl` against the public project id would not already
 * return, but an unbounded slice would let one request ask for every photograph's LQIP at once —
 * roughly a kilobyte each — which is the exact cost the paging exists to avoid. So `end - offset`
 * is capped at `PAGE_SIZE` and the inputs are floored at zero.
 *
 * Errors are swallowed and answered with `[]`, matching what the browser call did: a failed *extra*
 * page must leave the photographs already on screen intact and the Load more button available to
 * try again. Throwing would replace a working page with an error screen over content the visitor is
 * not waiting for.
 */
export const dynamic = 'force-dynamic'

const int = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams

  const filterTags = readTags(params.getAll('tag'))
  const offset = int(params.get('offset'), 0)
  const end = Math.min(int(params.get('end'), offset + PAGE_SIZE), offset + PAGE_SIZE)

  const { data } = await sanityFetch(MORE_PHOTOS_QUERY, { filterTags, offset, end })

  return Response.json(data ?? [])
}
