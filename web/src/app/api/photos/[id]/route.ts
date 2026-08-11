import { sanityFetch } from '@/sanity/fetch'
import { PHOTO_BY_ID_QUERY } from '@/sanity/queries/photo'

/**
 * One photograph by id, for a showcase opened on `/shots/all` past the first page.
 *
 * A gallery never needs this — `GALLERY_QUERY` returns its whole array, so the id resolves with a
 * `find`. The index pages, so a link someone shared can name a photograph nobody on this device has
 * scrolled to, and a client-side open of one already appended still needs nothing.
 *
 * `PHOTO_BY_ID_QUERY` restates `excludeFromIndex != true`, deliberately: the flag is a rule about
 * the index, and this is how a photograph is reached *through* the index, so ignoring it here would
 * be a hole in the flag rather than an exception to it.
 *
 * `null` on both "not found" and "the request failed", for the same reason the paging handler
 * answers `[]`: the showcase renders a message and a way back, never an error screen. See
 * `PhotoShowcase`.
 *
 * `force-dynamic` and the server-only client, for the reasons in `../route.ts`.
 */
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: RouteContext<'/api/photos/[id]'>) {
  const { id } = await params
  const { data } = await sanityFetch(PHOTO_BY_ID_QUERY, { photoId: id })

  return Response.json(data ?? null)
}
