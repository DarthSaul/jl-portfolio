import type { Metadata } from 'next'

import { FeaturedWriting } from '@/components/home/FeaturedWriting'
import { PhotoStrip } from '@/components/home/PhotoStrip'
import { MissingDocumentError } from '@/sanity/errors'
import { orThrow, sanityFetch } from '@/sanity/fetch'
import { HOME_QUERY } from '@/sanity/queries/home'

/**
 * The front page: five featured photographs, then three featured pieces of writing — see
 * CLAUDE.md.
 *
 * The site name, the byline and the nav are not here. They are chrome on every page and are
 * rendered by the sidebar in the layout. Everything this page does show comes from one request.
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
      The four `mx-auto max-w-[1080px] px-5` wrappers this page used to carry are gone: the layout's
      `<main>` owns the gutter, and `bleed` is how the photo grid reaches past it. See
      `app/layout.tsx`.

      `space-y-section` is DESIGN.md's 48px section padding, opened up on a phone where the photo
      grid collapses to one column and the bands need more air to stay distinct.
    */
    <div className="space-y-14 lg:space-y-section">
      <PhotoStrip photos={home.featuredPhotos} />

      {/*
        Slot 5. Parked, not deleted — `blurb` is still fetched by HOME_QUERY, and so are
        `featuredTitle` and `featuredSubtitle`. All three are waiting on a decision about where
        they belong now the page opens with photographs instead of closing with them. Do not delete
        the fields or the query lines to tidy up; that is a content decision.

        <ProseText value={home.blurb} className="type-body-serif-lg max-w-read" />
      */}

      <FeaturedWriting items={home.featuredWriting} />
    </div>
  )
}
