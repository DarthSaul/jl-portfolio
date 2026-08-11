import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ProseBody } from '@/components/ProseBody'
import { formatDate } from '@/lib/date'
import { orThrow, sanityFetch } from '@/sanity/fetch'
import { POST_QUERY, POST_SLUGS_QUERY } from '@/sanity/queries/writing'

/**
 * One post — writing that lives here rather than on someone else's site.
 *
 * This is the route `post.slug` exists for, and the one `FeaturedWriting` has been linking at since
 * the front page landed. An `article` never reaches this page: it has no slug and no body by
 * design, because copying a publication's text here would be republishing their page.
 *
 * The cover photo is deliberately not fetched or shown. `post.ts` tells her it is "the small photo
 * shown beside this post where it is listed... Not shown on the post itself; put photos in the
 * writing below for that" — so showing it here would contradict the field's own description, and
 * the photos in the body are the ones she chose for the piece.
 *
 * The title is an `<h2>`: `SiteSidebar` renders the wordmark as the page's `<h1>`. Subheadings
 * inside the body land on `<h3>` for the same reason — see `ProseBody`.
 */
/**
 * Prerender every post at build time; anything else is built on first request and then cached.
 *
 * This is free here in a way it would not be on `/shots/[slug]`: that route reads `searchParams`
 * for the showcase, which makes it dynamic, and `generateStaticParams` on a dynamic route is inert
 * — it would look like an optimisation and do nothing. See CLAUDE.md.
 */
export async function generateStaticParams() {
  const { data } = await sanityFetch(POST_SLUGS_QUERY)
  return (data ?? []).map(post => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: PageProps<'/copy/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  const { data } = await sanityFetch(POST_QUERY, { slug })
  if (!data) return {}

  return {
    title: data.title,
    // Most posts have no summary, and an empty description tag is worse than none.
    ...(data.summary ? { description: data.summary } : {}),
  }
}

export default async function PostPage({ params }: PageProps<'/copy/[slug]'>) {
  const { slug } = await params
  const post = orThrow(await sanityFetch(POST_QUERY, { slug }))

  /**
   * A slug with no post is a genuine 404, not a server error. Unlike the singletons, nothing
   * guarantees this document exists — the address may be one she changed, or one someone mistyped,
   * and the schema warns her that changing a slug breaks links already shared.
   *
   * `orThrow` above is what keeps this honest: a transport failure would otherwise render as "no
   * writing at this address", a 404 blaming her URL for a problem with ours, on a page that exists.
   */
  if (!post) notFound()

  return (
    /*
      Left-aligned, and that is two changes rather than one: the three `text-center` classes are
      gone, and so is the `mx-auto` that centred the column itself. A centred column of centred text
      made sense under a centred wordmark; under a sidenav the page has a left edge and everything
      should agree on where it is.
    */
    <article className="max-w-read">
      <h2 className="type-display-lg text-ink">{post.title}</h2>

      <p className="type-byline text-muted">
        <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
      </p>

      {post.summary && (
        <p className="type-body-serif-lg mt-6 text-muted">{post.summary}</p>
      )}

      <ProseBody value={post.body} className="type-body-serif-lg mt-12" />
    </article>
  )
}
