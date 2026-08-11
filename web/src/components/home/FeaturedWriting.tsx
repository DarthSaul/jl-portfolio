import { SanityPhoto } from '@/components/SanityPhoto'
import { WritingLink } from '@/components/writing/WritingLink'
import { formatDate } from '@/lib/date'
import type { HOME_QUERY_RESULT } from '~~/sanity.types'

type Home = NonNullable<HOME_QUERY_RESULT>

/**
 * Exactly three pieces of writing, posts and links out mixed.
 *
 * The heading is hardcoded rather than editable. Three cards of writing under the words "Featured
 * Writing" needs no explanation, and a field she has to fill in with the obvious answer is a field
 * worth deleting.
 *
 * `post` and `article` are the same card with different destinations — that split is about where
 * the writing lives, not how it looks. `WritingLink` owns that branch. **This component used to
 * carry its own duplicate copy of it**, which CLAUDE.md flagged as something that should adopt the
 * shared version; the port is where it did.
 *
 * ## Why the card is a subgrid
 *
 * Cover photos are whole photo documents and keep their own proportions, so three cards can hold a
 * panorama, a square and a portrait. Left alone, each card stacks under its own photo and the three
 * headlines start at three different heights — measured at a 127px spread on the current content,
 * which reads as a broken row rather than a deliberate one.
 *
 * The fix that is *not* available is the usual one: crop all three to a common shape. Rule 2
 * forbids it and there is no hotspot to crop around. So the cards share row lines instead:
 * `subgrid` gives the row exactly **two** shared rows — the thumbnail area, and everything else.
 * The thumbnail row is one uniform height across all three cards, which is what makes every
 * headline start on the same line.
 *
 * Photos sit at the **top** of that row (`self-start`), so each card reads top-down from a common
 * edge. A photo shorter than the row leaves space beneath it before the headline, and that gap is
 * the honest cost of not cropping — it is most visible on the current content, where one cover is
 * 2.83:1 against another at 1.33:1.
 *
 * Everything below the headline is deliberately *not* aligned. It shares one grid row and flows
 * naturally inside it, so summaries of different lengths push their own "Read more" down
 * independently rather than being stretched to a common baseline.
 *
 * Below `md` the cards are one per row and none of this applies, which is why it is all
 * `md:`-prefixed. `md:gap-y-0` is part of that: the `gap-10` that separates stacked cards on a
 * phone would otherwise reappear as a 40px gutter between the two shared rows on desktop.
 */
export function FeaturedWriting({ items }: { items: Home['featuredWriting'] }) {
  return (
    <section>
      {/*
        DESIGN.md's `category-eyebrow` over a hairline: a small uppercase sans label rather than a
        heading in the display serif. That keeps the three card headlines below it as the largest
        type in the section, which is what the eye should land on.
      */}
      <h2 className="type-display-xs border-t border-hairline pt-10 uppercase tracking-[0.1em] text-ink">
        Featured Writing
      </h2>

      {/*
        Straight from one column to three. Two columns orphans the third card into a row of its own
        with a half-page of white space beside it, and the schema guarantees there are always
        exactly three, so the awkward middle step is worth skipping.
        The two shared rows are: thumbnail area, then everything else.
      */}
      <ul className="mt-8 grid gap-10 md:grid-cols-3 md:grid-rows-[auto_auto] md:gap-y-0">
        {items.map(item => (
          <li key={item._id} className="md:row-span-2 md:grid md:grid-rows-subgrid">
            {/*
              The photo, the headline and "Read more" are three hit areas for one destination. Only
              the headline carries an accessible name: the photo link is hidden from assistive tech
              and skipped by the keyboard, so a screen reader hears one meaningful link per card
              rather than three.

              The wrapper is rendered even when there is no cover photo, so the card still occupies
              the thumbnail row and its headline stays on the shared line.
            */}
            <WritingLink item={item} tabIndex={-1} aria-hidden className="block md:self-start">
              {/*
                A third of the main column, not of the viewport — the shell caps at 1440px with the
                sidenav beside it, so the column never exceeds ~1120px.
              */}
              {item.coverPhoto
                ? (
                    <SanityPhoto
                      photo={item.coverPhoto}
                      sizes="(min-width: 1024px) 360px, (min-width: 768px) 33vw, 100vw"
                    />
                  )
                : null}
            </WritingLink>

            {/* One grid row for the rest, flowing freely inside it. */}
            <div>
              <h3 className="type-display-sm mt-5">
                <WritingLink item={item} className="transition-opacity hover:opacity-60">
                  {item.title}
                </WritingLink>
              </h3>

              <p className="type-byline mt-1 text-muted">
                {/*
                  A link out names its publication; a post is on this site and does not need to say
                  so. Both carry the date, which is what orders her writing everywhere.
                */}
                {item._type === 'article' && `${item.publication} · `}
                <time dateTime={item.publishedAt}>{formatDate(item.publishedAt)}</time>
              </p>

              {item.summary && (
                <p className="type-body-serif-md mt-2 text-ink">{item.summary}</p>
              )}

              {/*
                "Read more" is meaningless out of context, and a screen reader can pull links out of
                context. The aria-label names the destination.

                `body-sm-strong` in caps is also what /copy's row uses, so the two lists say "read
                more" the same way.
              */}
              <WritingLink
                item={item}
                aria-label={`Read more: ${item.title}`}
                className="type-body-sm-strong mt-4 inline-block uppercase tracking-[0.12em] text-ink hover:underline"
              >
                Read more
              </WritingLink>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
