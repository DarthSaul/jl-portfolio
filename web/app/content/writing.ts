/**
 * Static stand-in for /writing — the COPY tab.
 *
 * The last of these. `~/content/home` was its twin and is gone, now that the front page reads
 * from Sanity; this file exists so the layout can be built and reviewed before its query does,
 * and it must not become `app/queries/`. When /writing is wired up it is replaced by a
 * `defineQuery` in `queries/writing.ts`, and `WritingArticleListItem` does not change.
 *
 * The `post` and `article` types it will read from already exist in the schema, so this is
 * waiting on a query and a route, not on content modelling.
 *
 * Layout mirrors joanatstake.com/copy/writing-list, measured rather than eyeballed: a single
 * centred 750px column, a 250px circular thumbnail, a centred title, a left-aligned teaser,
 * and a centred READ MORE. Her live page also renders a date and byline, but the template
 * hides both with `display: none` — every card reads "January 1, 2030" or similar, because
 * the dates are a Squarespace ordering hack rather than publication dates. Not reproduced.
 *
 * Placeholder imagery is Unsplash. `grep -rn images.unsplash.com web/` finds every one of
 * them, and after the front page moved to Sanity they are all in this file.
 */

/**
 * One photo. Kept alive here for `SitePhoto`, the static stand-in this page still renders
 * through — the Sanity-backed pages take their shape from the generated types instead.
 */
export type Photo = {
  src: string
  /** Belongs to the photo, never to the call site. See Rule 1 in CLAUDE.md. */
  alt: string
  /** CSS aspect-ratio. Reserves the box so nothing shifts as images load. */
  aspect: string
}

/**
 * A run of text inside a paragraph. A bare string is plain text; the object form carries a
 * link or emphasis.
 *
 * The static counterpart to Portable Text, and the reason it exists is that two of these
 * teasers contain an inline link and an inline italic that flattening to plain strings would
 * lose. It is not a portable-text renderer and must not grow into one — when this page moves
 * to Sanity these become `proseText` and `ProseText.vue` renders them for real.
 */
export type TextRun = string | { text: string, href?: string, em?: true }

export type Paragraph = TextRun[]

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
