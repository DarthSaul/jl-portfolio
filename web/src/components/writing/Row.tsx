import { SanityPhoto } from '@/components/SanityPhoto'
import { formatShortDate } from '@/lib/date'

import { WritingLink } from './WritingLink'
import type { WritingItem } from './WritingLink'

/**
 * One row of the ledger below the lead: a square thumbnail, the title and summary beside it, and
 * the date and publication in a rail on the right.
 *
 * ## The square, and why it is allowed to crop
 *
 * The thumbnail is a centred square crop, which the rest of the site does not do. CLAUDE.md carries
 * the scoped exception and the reasoning; the short version is that the size is fixed here, the
 * crop is always centred, and she has no control over either — it is a preset that happens to crop,
 * not a framing control. The cost is that a cover whose subject sits near an edge loses it at this
 * size, and the only remedy is a different photo.
 *
 * It used to be a circle, which is the same crop wearing a `rounded-full`. The design mock asks for
 * rectangles instead — the rest of the site is rectangular photography, and seven circles were the
 * one place it was not. A rectangle at the *mock's* proportions (92×68) would have been a new crop
 * shape and therefore a Rule 2 decision; a square is the crop that already exists, minus the
 * radius. It also keeps the ledger's rhythm even, which native proportions would not: a portrait
 * cover in a 92px column is 138px tall and a wide one is 60px, and a list of rows that change
 * height by a factor of two is not a ledger.
 *
 * ## The empty rail
 *
 * Roughly half her pieces have no cover photo. The thumbnail column is rendered either way, so
 * every title starts on the same left edge — without it the rows with photos are indented and the
 * rows without are not, which under a hairline reads as a broken table. An empty square would be
 * worse: a placeholder for nothing, on half the rows.
 *
 * ## One link, three cells
 *
 * The whole row is a single anchor and the grid is on it, so the hover tint, the rule and the hit
 * area are one element and cannot drift apart. The previous version had three separate links to one
 * destination and had to hide two of them from assistive tech to stop a screen reader announcing
 * the same piece three times, once as "Read more" about nothing.
 */
export function Row({ item }: { item: WritingItem }) {
  return (
    <li>
      {/*
        Three cells, re-placed rather than re-rendered. At `sm:` this is the mock's three columns —
        92px thumb / title / 128px rail. Below it a 128px rail is most of a phone's width, so the
        thumb spans both rows in column 1 and the rail drops under the title in column 2. Same
        markup, different placement: rendering the meta block twice behind a `hidden`/`sm:block`
        pair would put the date in the accessibility tree twice.

        `items-start` on a phone keeps the thumb level with the title it belongs to; `items-center`
        at `sm:` centres it against the row, which is what makes a ledger look like one.
      */}
      <WritingLink
        item={item}
        className="story-row group grid grid-cols-[4.5rem_1fr] items-start gap-x-4 gap-y-2 sm:grid-cols-[5.75rem_1fr_8rem] sm:items-center sm:gap-x-6 sm:gap-y-0"
      >
        {/* Reserved whether or not there is a photo — see the note above. */}
        <div className="row-span-2 sm:row-span-1">
          {item.coverPhoto && (
            <SanityPhoto
              photo={item.coverPhoto}
              crop="square"
              sizes="(min-width: 640px) 92px, 72px"
            />
          )}
        </div>

        {/*
          `min-w-0` so a long unbroken title wraps instead of widening the track and pushing the
          rail off the row: a grid track's automatic minimum is its item's min-content size.
        */}
        <div className="min-w-0">
          <h3 className="type-display-sm text-ink">{item.title}</h3>

          {/*
            `text-muted` rather than ink: the title is what a reader scans a ledger for, and a
            summary set at the same weight competes with it down a column of six.
          */}
          {item.summary && (
            <p className="type-body-serif-md mt-1 text-muted">{item.summary}</p>
          )}
        </div>

        <div className="col-start-2 sm:col-start-3 sm:row-start-1 sm:text-right">
          {/*
            `Jul 2023`, not `July 21, 2023`. In a 128px rail the day is precision nobody reads and
            it is what makes the line wrap.
          */}
          <p className="type-caption text-muted">
            <time dateTime={item.publishedAt}>{formatShortDate(item.publishedAt)}</time>
          </p>

          {/*
            A link out names its publication; a post lives here and does not need to say so. Ink
            against the muted date is what the mock got from a colour accent, and this stays tonal
            even now that `--color-accent` exists: the accent marks the one thing you can act on,
            and a publication name is a fact about the piece. Spending it here too would leave the
            row with two red things and no hierarchy between them.
          */}
          {item._type === 'article' && (
            <p className="type-caption uppercase tracking-[0.12em] text-ink">{item.publication}</p>
          )}

          {/*
            The row's affordance, under the date. It replaced a background tint on hover, which
            said "this is clickable" without saying what clicking does.

            `aria-hidden`, because the row is already one link whose accessible name is the
            headline and everything beside it. Without this a screen reader hears "Read more"
            appended to a name that has just described the piece — the same reasoning that hides
            the caption band in `home/PhotoStrip.tsx`.

            It occupies its space at `opacity-0` rather than being removed, so revealing it shifts
            nothing. That does make every row one line taller whether or not anything is shown,
            which is the trade: a ledger with a constant rhythm beats one that reflows under the
            cursor.

            **`group-focus-visible` and `[@media(hover:none)]` are both mandatory**, and the note
            in `home/PhotoStrip.tsx` explains why at length: a keyboard user gets no hover, and
            Tailwind compiles `hover:` to a real `:hover` that a touch device never fires — so on
            the phones most of her visitors use, the affordance is simply always on.

            `caption` in the accent maroon, which is the smallest type on the row. Size is what
            keeps it quiet; colour is what stops it disappearing into the two lines above it, which
            are the same token in muted and in ink. It is also what lets the rail stay at the
            design's 128px — at `body-sm-strong` the arrow wrapped and the rail had to grow to fit
            an affordance that is not what anyone came to read.

            `text-accent` is the only chromatic thing on this page and DESIGN.md forbids one
            outright; the token's comment in `globals.css` carries the argument. Do not spend it on
            a second thing here without making that decision again.
          */}
          <p
            aria-hidden="true"
            className="type-caption mt-3 uppercase tracking-[0.12em] text-accent opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
          >
            Read More &rarr;
          </p>
        </div>
      </WritingLink>
    </li>
  )
}
