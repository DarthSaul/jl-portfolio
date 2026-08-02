/**
 * Static stand-in for /writing — the COPY tab.
 *
 * Same deal as `~/content/home`: this exists so the layout can be built and reviewed before
 * the Sanity schema does, and it must not become `app/queries/`. When the `article` document
 * type lands, this file is replaced by a `defineQuery` in `queries/writing.ts` and
 * `WritingArticleListItem` does not change.
 *
 * Layout mirrors joanatstake.com/copy/writing-list, measured rather than eyeballed: a single
 * centred 750px column, a 250px circular thumbnail, a centred title, a left-aligned teaser,
 * and a centred READ MORE. Her live page also renders a date and byline, but the template
 * hides both with `display: none` — every card reads "January 1, 2030" or similar, because
 * the dates are a Squarespace ordering hack rather than publication dates. Not reproduced.
 *
 * Placeholder imagery is Unsplash, and this URL is already used (and verified 200) in
 * `~/content/home`. `grep -rn images.unsplash.com web/` finds all of them at cleanup time.
 */

import type { Paragraph, Photo } from './home'

export type Article = {
  title: string
  /** One line under the title. Her live list has no equivalent — this is a new slot. */
  subtitle: string
  /**
   * The teaser shown in the list, not an article body.
   *
   * CLAUDE.md rules out long-form writing in the CMS, so this stays a paragraph or two. If
   * it ever needs to be longer, that is a scope conversation, not a bigger textarea.
   */
  content: Paragraph[]
  /** Square source — the list crops it to a circle. */
  photo: Photo
  /**
   * Where the article actually lives. Always outbound: nytimes.com, huffpost.com, or her
   * existing joanatstake.com page.
   *
   * This is the field her per-article slugs turn into. On Squarespace a slug like
   * `/copy/writing-list/replaceable-you` exists because Squarespace hosts the body; here
   * nothing is hosted, so the slug is just part of somebody else's URL. A `slug` field in
   * Sanity would only earn its place if we started hosting article bodies — see the
   * non-goals in CLAUDE.md before adding one.
   */
  href: string
}

/**
 * One placeholder, repeated below.
 *
 * Deliberately a single object rather than six near-identical ones: the point of this pass is
 * the layout and the vertical rhythm, and six copies of one card show that more honestly than
 * six invented articles would.
 */
const PLACEHOLDER: Article = {
  title: 'Placeholder Title for an Article Published Elsewhere',
  subtitle: 'A placeholder subtitle, one line long',
  content: [
    [
      'Placeholder teaser copy standing in for the first paragraph of an article. It runs to '
      + 'two or three sentences — long enough to wrap a couple of times in the 750px column '
      + 'and show what the list actually looks like at rest.',
    ],
  ],
  photo: {
    src: 'https://images.unsplash.com/photo-1516414447565-b14be0adf13e',
    alt: 'Placeholder photograph of a closed notebook and pencil on a wooden table.',
    aspect: '1/1',
  },
  href: 'https://joanatstake.com/copy/writing-list',
}

export const WRITING = {
  /**
   * Six copies of the same placeholder. Identical by design, so the list is keyed by index
   * in the template — there is no stable id to key on yet, and there will be (`_id`) the
   * moment these come from Sanity.
   */
  items: Array.from({ length: 6 }, () => PLACEHOLDER) satisfies Article[],
}
