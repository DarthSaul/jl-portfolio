import { SanityPhoto } from '@/components/SanityPhoto'
import { formatDate } from '@/lib/date'

import { WritingLink } from './WritingLink'
import type { WritingItem } from './WritingLink'

/**
 * The newest piece, given the front page of /copy.
 *
 * ## The eyebrow is a prop, because it is a claim
 *
 * This file used to argue that the lead should always be `items[0]` and the eyebrow always say
 * LATEST: a featured-piece toggle is a second thing to remember every time she publishes, and its
 * failure mode is a "featured" essay from four years ago sitting above six newer ones, where
 * sorting by date cannot go stale.
 *
 * She has since asked to be able to choose, and `writingPage.featured` gives her that — one
 * optional reference, empty meaning automatic, so the default the old argument was defending is
 * exactly what an untouched Studio still does. What the old argument correctly identified is why
 * the word cannot be hardcoded: LATEST is a *claim about the date*, and it becomes a lie the moment
 * she picks something older. So the page passes FEATURED when she has chosen and LATEST when the
 * date chose, and the eyebrow stays an honest description of the rule that produced the piece
 * under it.
 *
 * ## The photo is cropped, and that was a decision rather than a default
 *
 * `crop="lead"` fills a fixed 300×200 — the design's own rectangle. This is the site's second
 * framing after the ledger's square thumbnails, and the first applied to a photograph at reading
 * size rather than to a preview. Rule 2 says a decision like that does not get made inside a
 * component, and it was not: it was raised, declined once in favour of merely bounding the photo,
 * and then reversed on the evidence.
 *
 * The version it replaced capped the height at 200px and let the photograph keep its own
 * proportions, so a portrait cover shrank to 150×200. Nothing was lost and it looked wrong — the
 * column sat half empty, and the block's right edge moved with whatever she happened to upload. A
 * fixed rectangle makes every lead the same shape, which is most of what a lead is for.
 *
 * **What it costs her is real, and it is the cost the thumbnails already carry.** `photo.image` has
 * no hotspot, so the crop is centred; a cover whose subject sits near the top or bottom of the
 * frame loses it here, and her only remedy is choosing a different photo. If that starts to bite,
 * the conversation is `hotspot` on `photo.image` — again a Rule 2 decision, not a component one.
 *
 * The crop is in the CDN URL rather than in an `object-cover` at this call site, so a phone
 * downloads the 300×200 it will paint instead of a full portrait it would hide two thirds of. One
 * URL means one framing at every width, so the phone gets the same 3:2 band rather than the
 * full-height cover it used to show.
 *
 * With no cover at all the photo column is not rendered and the text takes the full measure, rather
 * than the grid holding open 300px of nothing. Roughly half her pieces have no cover, so this is
 * the ordinary case and not the edge one.
 *
 * ## One link
 *
 * The whole block is a single anchor, so its accessible name is the text inside it — eyebrow,
 * headline, summary, date. Verbose, but true, and it beats the alternative of three overlapping hit
 * areas with two of them hidden from assistive tech to stop a screen reader announcing the same
 * destination three times.
 */
export function Lead({
  item,
  /** The eyebrow. `Latest` when the date picked this, `Featured` when she did. */
  label = 'Latest',
}: {
  item: WritingItem
  label?: string
}) {
  return (
    /*
      `border-b-2 border-ink` is DESIGN.md's Elevation Level 2, the heavy rule. It is doing the
      structural work of this page: the ledger below is separated by hairlines, and the whole
      composition is the difference in weight between the two. Lose that and the lead is just a
      bigger row.

      `items-start` rather than the default stretch: stretch would pull the photo to the text's
      height, which is a framing decided by how much she wrote. Start also puts the eyebrow and the
      top of the photograph on one line, which is the mock's composition.

      This alignment only reads well because the photo is a fixed 300×200. At native proportions a
      portrait cover was 400px of photograph beside 110px of text — the newest post has no summary
      — and `items-start` left the difference as a visible hole. The crop is what closed it; the
      alignment is what the crop made available again.
    */
    <WritingLink
      item={item}
      className={`group grid items-start gap-6 border-b-2 border-ink pb-8 md:gap-x-8 md:gap-y-5 ${
        item.coverPhoto ? 'md:grid-cols-[1fr_300px]' : ''
      }`}
    >
      <div>
        <p className="type-body-sm-strong uppercase tracking-[0.18em] text-ink">{label}</p>

        {/*
          An `<h3>`: the sidebar's wordmark is the page's `<h1>` and /copy's own heading is the
          `<h2>`, so a piece's title is a level below both.
        */}
        <h3 className="type-display-md mt-3 text-ink">{item.title}</h3>

        {/*
          Muted, like the ledger's summaries below. It is a size larger than theirs, which is what
          makes this one a lede rather than a caption; the colour is what keeps the headline the
          thing you land on in both places.
        */}
        {item.summary && (
          <p className="type-body-serif-lg mt-3 text-muted">{item.summary}</p>
        )}
      </div>

      {/*
        `order-first` on a phone puts the photograph above the headline, which is how a lead story
        reads on a narrow screen; at `md:` it returns to the right-hand column. Order rather than a
        second element, so there is one photo in the DOM and one in the srcset.

        `priority` because this is the first image on the page and always above the fold.
      */}
      {item.coverPhoto && (
        <div className="order-first md:order-none">
          <SanityPhoto
            photo={item.coverPhoto}
            crop="lead"
            priority
            sizes="(min-width: 768px) 300px, 100vw"
          />
        </div>
      )}

      {/*
        The footer line: the date at the far left, READ MORE at the far right, on one baseline and
        across the whole block rather than across the text column.

        It is its own grid child spanning both tracks, which is what puts the two on one line while
        keeping READ MORE under the photo. The alternative — pinning each to row 2 with `col-start`
        — needs four grid children and gets the same result more fragilely.

        `md:col-span-2` is conditional because it has to be: with no cover photo the grid has a
        single explicit column, and a `col-span-2` there creates an implicit second one and tears
        the block in half. Unconditional, this breaks exactly the case where roughly half her
        pieces land.

        `items-baseline`, so the date and the affordance sit on a shared baseline rather than on
        their own centres. They are the same size today and would drift the moment either changed.
        `gap-4` keeps a long publication name off the arrow.

        Order at a phone width needs nothing set: the DOM is text, photo, this, and `order-first`
        moves only the photo — so a phone reads photograph, headline, lede, then this line with its
        two ends still at the two edges.
      */}
      <div
        className={`flex items-baseline justify-between gap-4 ${
          item.coverPhoto ? 'md:col-span-2' : ''
        }`}
      >
        {/*
          The lead carries the full date, where a ledger row carries `Jul 2023`. It has the room
          and it is the only piece on the page anyone is being told to read now.
        */}
        <p className="type-caption uppercase tracking-[0.1em] text-muted">
          {item._type === 'article' && `${item.publication} · `}
          <time dateTime={item.publishedAt}>{formatDate(item.publishedAt)}</time>
        </p>

        {/*
          Same reveal, same three states and the same accent as the ledger's rows — the long
          version of both notes is in `writing/Row.tsx`. `shrink-0` keeps it whole when a long
          publication name takes the rest of the line.
        */}
        <p
          aria-hidden="true"
          className="type-caption shrink-0 uppercase tracking-[0.12em] text-accent opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
        >
          Read More &rarr;
        </p>
      </div>
    </WritingLink>
  )
}
