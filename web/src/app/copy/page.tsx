import type { Metadata } from 'next'

import { Lead } from '@/components/writing/Lead'
import { Row } from '@/components/writing/Row'
import { orThrow, sanityFetch } from '@/sanity/fetch'
import { WRITING_QUERY } from '@/sanity/queries/writing'

/**
 * Her writing — the newest piece led, the rest a ledger beneath it.
 *
 * One list, two destinations. A post opens its page here; a link out opens the site that published
 * it. `WritingLink` decides which from `_type`, and the ordering is done in GROQ across both types
 * rather than merged here — see `sanity/queries/writing`.
 *
 * ## The heading came back
 *
 * This page used to argue against one: the nav already says COPY, so a second "Copy" directly
 * under it repeats the tab you just clicked. That is still true and it is no longer the deciding
 * fact. The page is now a composition rather than a stack — a lead story, a heavy rule, a ledger —
 * and a composition needs something to start at. Without the heading the eyebrow LATEST is the
 * first thing on the page, which reads as a label floating above nothing. `/shots/all` sets the
 * same precedent for the same reason.
 *
 * It is an `<h2>`: `SiteSidebar` renders the wordmark as the page's `<h1>`, so a piece's own title
 * is an `<h3>` below this.
 *
 * ## The lead is hers to choose, and by default it is the newest
 *
 * `page.featured` if she has set one, `items[0]` — the most recently published — otherwise. This
 * page used to say the lead was chosen by date and that there was deliberately no toggle; she
 * asked for the choice, and `writingPage.featured` is it. The default did not move, and that is
 * what makes the reversal safe: an empty field *means* automatic, so there is no mode to set
 * inconsistently and nothing new to remember on a publish.
 *
 * The lead is filtered out of the ledger by `_id` rather than by position, because a featured piece
 * can sit anywhere in the list. `items[0]` and `page.featured` project to the same shape through
 * `WRITING_ITEM_PROJECTION`, so `Lead` takes either without a branch.
 *
 * ## `writingPage` is allowed to be missing
 *
 * Unlike `homePage` on the front page and `aboutPage` on /bio. That document holds a tab title and
 * an optional intro, and the page's actual content is the list beside it: absent, the cost is a
 * paragraph, not a page. It does not exist in `development` today. So this is the one queried route
 * with no missing-document throw — `orThrow` still guards the transport failure.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { data } = await sanityFetch(WRITING_QUERY)

  // Used bare when it exists — the field's initial value is already "Copy — Joan Lebow" and the
  // layout's template would append her name to it a second time.
  return data?.page ? { title: { absolute: data.page.title } } : { title: 'Copy' }
}

export default async function CopyPage() {
  const writing = orThrow(await sanityFetch(WRITING_QUERY))

  const items = writing?.items ?? []
  const lead = writing?.page?.featured ?? items[0]
  const ledger = items.filter(item => item._id !== lead?._id)

  /**
   * What the lead calls itself. LATEST is a claim about the date and stops being true the moment
   * she picks something older, so the word follows the reason rather than the position.
   */
  const leadLabel = writing?.page?.featured ? 'Featured' : 'Latest'

  return (
    /*
      `max-w-read` and not the full column: the design's own measure is ~740px, which is what this
      token already is, and it keeps /copy in step with /copy/[slug] and /bio.
    */
    <div className="max-w-read">
      <h2 className="type-display-lg text-ink">Copy</h2>

      {/*
        Subordinate to the lead's summary on purpose — `body-serif-md` against its
        `body-serif-lg`. The design has no intro line here, but the field is hers and editable, and
        quietly dropping what she wrote into it is the wrong trade in a project where the editor
        wins.
      */}
      {writing?.page?.intro && (
        <p className="type-body-serif-md mt-3 text-muted">{writing.page.intro}</p>
      )}

      {lead && (
        <div className="mt-8">
          <Lead item={lead} label={leadLabel} />
        </div>
      )}

      {/*
        No `space-y`. `story-row` gives each row its own padding and the hairline that separates it
        from the next, so a gap set here would double up against the padding and pull the rules
        away from the rows they belong to.
      */}
      <ul>
        {ledger.map(item => (
          <Row key={item._id} item={item} />
        ))}
      </ul>
    </div>
  )
}
