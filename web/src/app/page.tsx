import type { Metadata } from 'next'

import type { ReactNode } from 'react'

import { FeaturedPhotos } from '@/components/home/FeaturedPhotos'
import { FeaturedWriting } from '@/components/home/FeaturedWriting'
import { HeroCarousel } from '@/components/home/HeroCarousel'
import { InstagramFeed } from '@/components/home/InstagramFeed'
import { MissingDocumentError } from '@/sanity/errors'
import { orThrow, sanityFetch } from '@/sanity/fetch'
import { HOME_QUERY } from '@/sanity/queries/home'
import type { HOME_QUERY_RESULT } from '~~/sanity.types'

type Home = NonNullable<HOME_QUERY_RESULT>

/**
 * The front page: the hero — her choice of the featured-photo grid or the carousel — then three
 * featured pieces of writing, then the Instagram strip. See CLAUDE.md.
 *
 * The site name, the byline and the nav are not here; they are chrome on every page, rendered by
 * the masthead in the layout. The page's content comes from one request.
 *
 * One query for the whole page, following references as it goes. That is the shape CLAUDE.md asks
 * for: a route fetches exactly its own shape, and the GROQ that defines it lives in
 * `sanity/queries/home` rather than in this file, because a query is the contract between a route
 * and the content model and a schema change needs one obvious place to look for breakage.
 *
 * `homePage.title` is the browser tab title and nothing else — the schema says as much to her, and
 * it is deliberately not rendered as a heading on the page.
 *
 * ## There is deliberately no `export const revalidate`
 *
 * Caching is decided once, at the fetch layer, by `REVALIDATE` in `sanity/fetch`. Next derives a
 * route segment's own revalidate from the *lowest* one among the fetches it makes, so this page is
 * prerendered and revalidates at 60s without stating it — confirm in `next build`'s output, which
 * prints the interval per route.
 *
 * A segment export would also have to be a literal `60` rather than the imported constant: these
 * are read by static analysis, not evaluated, and importing one fails the build with "Invalid
 * segment configuration export". So stating it here would mean the number in two places and the
 * second copy unable to reference the first.
 */

/**
 * `title.absolute` is the App Router spelling of Nuxt's `titleTemplate: '%s'` override.
 *
 * The root layout appends " · Joan Lebow" to whatever a page sets, which is right everywhere else
 * and wrong here — `homePage.title` is already her name, and the default would render it twice.
 * Her current site titles its front page with the plain wordmark, and this matches it while still
 * taking the value from the field the Studio tells her controls the browser tab.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { data } = await sanityFetch(HOME_QUERY)
  return data ? { title: { absolute: data.title } } : {}
}

/**
 * The top of the page, one component per `HERO_LAYOUTS` value in `studio/schemaTypes/documents/
 * homePage.ts` — the same two-halves shape as a gallery preset. `satisfies Record<…>` over the
 * generated union makes a value without a component (or a component for a value that no longer
 * exists) a typecheck failure.
 */
const HERO = {
  grid: home => <FeaturedPhotos photos={home.featuredPhotos} />,
  // The Studio will not publish a carousel with no photos, but a stale document saved before the
  // field existed could reach here; the grid is a working page rather than an empty band.
  carousel: home => home.carouselPhotos.length > 0
    ? <HeroCarousel photos={home.carouselPhotos} showMenu={home.showCarouselMenu} />
    : <FeaturedPhotos photos={home.featuredPhotos} />,
} satisfies Record<Home['heroLayout'], (home: Home) => ReactNode>

export default async function HomePage() {
  /**
   * `orThrow` checks the transport failure before the null, because a failed request also leaves
   * the data null and the two mean opposite things.
   *
   * This distinction cost real debugging time once. The Nuxt app re-ran this query in the
   * *browser* on a client-side navigation, which sends an `Origin` header the server's request
   * does not; the Vercel origin was missing from the project's CORS allowlist, Sanity answered
   * 403, the page reported "No homePage document found in this dataset", and the search went to
   * the dataset environment variable — which was correct all along.
   *
   * That specific failure cannot happen any more: nothing in the browser talks to Sanity. The
   * ordering survives it because the *shape* of the bug is general — a request that did not happen
   * must never look like a query that found nothing — and `orThrow` now makes it structural rather
   * than something each route remembers.
   */
  const home = orThrow(await sanityFetch(HOME_QUERY))

  /**
   * `homePage` is a singleton and the Studio will not let her delete it, so a missing document
   * means the dataset was never seeded. Failing loudly beats rendering a page with empty slots,
   * which reads as a broken site rather than a misconfigured one.
   *
   * Note this does not cover a mistyped dataset *name*, which `orThrow` catches instead: Sanity
   * answers a nonexistent dataset with a 404, not an empty result. What still lands here is a real
   * dataset holding no `homePage` — including, per CLAUDE.md, a dataset that was made private,
   * since an anonymous read of one of those returns 200 and an empty result rather than a 401.
   */
  if (!home) throw new MissingDocumentError('homePage')

  return (
    /*
      The layout's `<main>` owns the gutter; `bleed` is how a band reaches past it. Bands are the
      mockup's 96px apart from `lg` up, opened less on a phone.
    */
    <div className="space-y-16 lg:space-y-section">
      {HERO[home.heroLayout](home)}
      <FeaturedWriting items={home.featuredWriting} />
      <InstagramFeed />
    </div>
  )
}
