import type { Metadata } from 'next'
import { cache } from 'react'

import { AllShotsView } from '@/components/shots/AllShotsView'
import { readPhotoId, readTags } from '@/lib/showcase'
import { orThrow, sanityFetch } from '@/sanity/fetch'
import { ALL_SHOTS_QUERY, PAGE_SIZE } from '@/sanity/queries/allShots'
import { PHOTO_BY_ID_QUERY } from '@/sanity/queries/photo'

/**
 * /shots/all — every photograph she has uploaded, minus the ones she has hidden.
 *
 * **A static route, so it wins over `[slug]`.** That shadowing is why `gallery.ts` refuses a slug
 * of "all": without the guard a gallery could claim this address, publish cleanly and then be
 * permanently unreachable with nothing saying why.
 *
 * The server half. It owns `searchParams`, the first page, the tag list and the deep-link lookup;
 * `AllShotsView` owns paging, the observer and the showcase. Splitting there is what keeps the
 * first paint a real server render — the filtered, paged page arrives as HTML — while the parts
 * that genuinely need a browser stay in the browser.
 *
 * Dynamic, because it reads `searchParams`. The Sanity reads are still cached: `sanityFetch`
 * carries `next: { revalidate }`, so a request costs a React render over a Data Cache hit.
 */

/**
 * `cache()` so `generateMetadata` and the render share one read of each query.
 *
 * It matters most for the by-id lookup, which would otherwise run twice for every deep link.
 */
const index = cache(async (filterTags: string[]) =>
  orThrow(await sanityFetch(ALL_SHOTS_QUERY, { filterTags, offset: 0, end: PAGE_SIZE })),
)

const photoById = cache(async (photoId: string) =>
  (await sanityFetch(PHOTO_BY_ID_QUERY, { photoId })).data,
)

export async function generateMetadata({
  searchParams,
}: PageProps<'/shots/all'>): Promise<Metadata> {
  const query = await searchParams
  const tags = readTags(query.tag)
  const photoId = readPhotoId(query.photo)

  const photo = photoId ? await photoById(photoId) : null

  return {
    // A showcased photograph titles the page, so a shared link says what it is. `caption || alt` is
    // the fallback chain `photo.ts`'s Studio preview already uses.
    title: photo ? photo.caption || photo.alt : 'All Shots',

    // Noindex on the filtered views, and on the showcase. Every filtered permutation is the same
    // photographs in a different order, and letting a crawler index near-duplicates of one page is
    // how a small site competes with itself in search results. A showcased photograph is the same
    // argument again: it is reachable from here and from every gallery it appears in.
    ...(tags.length || photoId ? { robots: { index: false, follow: true } } : {}),
  }
}

export default async function AllShotsPage({ searchParams }: PageProps<'/shots/all'>) {
  const query = await searchParams
  const tags = readTags(query.tag)
  const photoId = readPhotoId(query.photo)

  const data = index(tags)
  const first = await data

  /**
   * The deep-link fallback, and the guard is the point of it.
   *
   * `photoId && !inFirstPage` is the exact analogue of the Nuxt version's `immediate` flag: a hard
   * load of `?photo=<id>` resolves the photograph on the server so a shared link paints it in the
   * HTML, and an ordinary load makes no second request at all. Reading the first page to decide is
   * what keeps an id that *is* among the first 24 free.
   */
  const inFirstPage = photoId ? first.photos.find(photo => photo._id === photoId) ?? null : null
  const deepLinked = photoId && !inFirstPage ? await photoById(photoId) : null

  return (
    <AllShotsView
      initialPhotos={first.photos}
      total={first.total}
      tagsInUse={first.tagsInUse}
      activeTags={tags}
      filterKey={tags.join(',')}
      deepLinked={deepLinked}
    />
  )
}
