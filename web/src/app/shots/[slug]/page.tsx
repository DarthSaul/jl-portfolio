import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { GalleryView } from '@/components/shots/GalleryView'
import { readPhotoId } from '@/lib/showcase'
import { orThrow, sanityFetch } from '@/sanity/fetch'
import { GALLERY_QUERY } from '@/sanity/queries/shots'

/**
 * One gallery, rendered through its preset. **Her galleries define this route** — creating one in
 * the Studio makes the page and lists it in the nav.
 *
 * `/shots/all` is a static route and therefore wins over this one, which is why `gallery.ts`
 * refuses the slug `all`: without that guard a gallery could claim the address, publish cleanly and
 * then be permanently unreachable with nothing saying why.
 *
 * ## This route is dynamic, and that is a decision rather than an oversight
 *
 * It reads `searchParams` for the showcase, which makes it server-rendered per request. The
 * alternative — `generateStaticParams` plus `revalidate`, as `/copy/[slug]` has — cannot coexist
 * with a server-rendered `?photo=`: a prerendered route cannot read `searchParams` at all, and a
 * client component calling `useSearchParams()` inside one drops everything below the nearest
 * Suspense boundary out of the static HTML. Here that would be the gallery grid itself, since the
 * grid and the showcase are the two arms of one condition.
 *
 * What that buys is the thing CLAUDE.md says the showcase is *for*: a shared `?photo=` link renders
 * the photograph as the page on the server, with its caption as the `<title>`, so a link unfurled
 * in Slack or iMessage shows the photograph rather than the gallery's name.
 *
 * What it costs is one React render per request. It is not one Sanity request per request: the
 * fetch carries `next: { revalidate: 60 }`, so the data comes from Next's Data Cache. Adding
 * `generateStaticParams` here would look like an optimisation and do nothing, which is why it is
 * absent — see `POST_SLUGS_QUERY` for the route where it is genuinely free.
 *
 * The long-term answer that gets both is `cacheComponents` (PPR): a static shell with a dynamic
 * hole. It is listed as an open question rather than taken on inside a framework port.
 */

/**
 * `cache()` so `generateMetadata` and the render share one read.
 *
 * The Data Cache would very likely dedupe them anyway; this makes it not depend on that.
 */
const gallery = cache(async (slug: string) => orThrow(await sanityFetch(GALLERY_QUERY, { slug })))

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<'/shots/[slug]'>): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const doc = await gallery(slug)
  if (!doc) return {}

  const photoId = readPhotoId(query.photo)
  const showcased = photoId ? doc.photos?.find(photo => photo._id === photoId) : null

  return {
    // A showcased photograph titles the page, so a link someone shares says what it is rather than
    // repeating the gallery. `caption || alt` is the fallback chain `photo.ts`'s Studio preview
    // already uses, so no new naming rule is invented here.
    title: showcased ? showcased.caption || showcased.alt : doc.title,

    // `description` is the share blurb, which the schema tells her is not shown on the page.
    ...(doc.description ? { description: doc.description } : {}),

    // The same photograph is showcasable from every gallery it appears in and from the index, so
    // indexing them would be a set of near-duplicates competing with each other. Same reason
    // `/shots/all` noindexes its filtered views.
    ...(photoId ? { robots: { index: false, follow: true } } : {}),
  }
}

export default async function GalleryPage({ params }: PageProps<'/shots/[slug]'>) {
  const { slug } = await params
  const doc = await gallery(slug)

  /**
   * A slug with no gallery is a genuine 404, not a server error. Nothing guarantees this document
   * exists — the address may be one she changed, or one someone mistyped.
   *
   * `orThrow` inside `gallery()` is what keeps this honest: a transport failure would otherwise
   * render as "no gallery at this address", a 404 blaming her URL for a problem with ours.
   */
  if (!doc) notFound()

  return (
    <div className="space-y-10">
      <GalleryView title={doc.title} preset={doc.preset} photos={doc.photos ?? []} />
    </div>
  )
}
