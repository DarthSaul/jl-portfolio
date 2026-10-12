import type { Metadata } from 'next'
import { cache } from 'react'

import { GalleryView } from '@/components/shots/GalleryView'
import { readPhotoId } from '@/lib/showcase'
import { MissingDocumentError } from '@/sanity/errors'
import { orThrow, sanityFetch } from '@/sanity/fetch'
import { FEATURED_QUERY } from '@/sanity/queries/shots'
import { getSiteSettings } from '@/sanity/siteSettings'

/**
 * /featured — the `featuredPage` singleton: a gallery with a fixed address.
 *
 * Everything about how it renders is `/gallery/[slug]`'s, and deliberately so: the Studio gives
 * the document the same fields (`studio/schemaTypes/galleryFields.ts`), the query uses the same
 * projection, and the page hands the result to the same `GalleryView` — so the presets, both fill
 * modes and the `?photo=` showcase all behave identically here. Read that route's comment for why
 * it is dynamic; the same argument applies, because the showcase reads `searchParams`.
 *
 * What differs is the address and what a missing document means. A gallery slug is something a
 * visitor can mistype, so it 404s; this is a singleton the Studio will not let her delete, with a
 * menu item pointing at it on every page, so a missing one means the dataset is wrong — a 500,
 * the same answer `/` and `/bio` give. See *Errors* in CLAUDE.md.
 */

/** `cache()` so `generateMetadata` and the render share one read. */
const featured = cache(async () => orThrow(await sanityFetch(FEATURED_QUERY)))

export async function generateMetadata({ searchParams }: PageProps<'/featured'>): Promise<Metadata> {
  const [query, doc] = await Promise.all([searchParams, featured()])
  if (!doc) return {}

  const photoId = readPhotoId(query.photo)
  const showcased = photoId ? doc.photos?.find(photo => photo._id === photoId) : null

  // Same three rules as `/gallery/[slug]`: a showcased photograph titles the page, the description
  // is the share blurb, and a showcase address is not indexed.
  return {
    title: showcased ? showcased.caption || showcased.alt : doc.title,
    ...(doc.description ? { description: doc.description } : {}),
    ...(photoId ? { robots: { index: false, follow: true } } : {}),
  }
}

export default async function FeaturedPage({ searchParams }: PageProps<'/featured'>) {
  /**
   * Awaited for its side effect, and it is load-bearing: it makes this route dynamic. A gallery
   * page is dynamic anyway, through its `[slug]`; this route has no dynamic segment, so without
   * this Next prerenders it — and the showcase's `useSearchParams()` inside `GalleryView` then
   * fails the build ("should be wrapped in a suspense boundary"). Measured. A Suspense boundary
   * would build, but it would drop the gallery out of the static HTML and lose the server-rendered
   * `?photo=` deep link, which is the reason both pages are dynamic in the first place.
   */
  await searchParams
  const doc = await featured()
  if (!doc) throw new MissingDocumentError('featuredPage')

  const { title: siteTitle } = await getSiteSettings()

  return (
    <div className="space-y-10">
      <GalleryView
        title={doc.title}
        preset={doc.preset}
        photos={doc.photos ?? []}
        siteTitle={siteTitle}
      />
    </div>
  )
}
