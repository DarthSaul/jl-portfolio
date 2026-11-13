import Link from 'next/link'

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
    <section aria-labelledby="featured-writing-heading">
      {/*
        The mockup's band heading: the serif headline on the left, a way into /copy on the right,
        both sitting on a 1px ink rule. "Featured writing" is hardcoded, sentence case, at the
        Instagram handle's size (`type-display-md`, 32px on desktop) — smaller than a page title.
      */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-3.5">
        <h2 id="featured-writing-heading" className="type-display-md text-ink">
          Featured writing
        </h2>
        <Link href="/copy" className="type-body-sm-strong text-ink transition-colors hover:text-accent">
          All copy →
        </Link>
      </div>

      {/*
        85% scale from `md` up (2026-11). Each column is 85% of an even third, spread to the
        column's edges (`justify-between`), so the thumbnails shrink while the row still spans
        the rule above it; `zoom` on each card scales its type and spacing by the same 85%,
        token sizes and all, rather than a second set of `type-*` tokens for one section. Phones
        keep full size — one card per row, already narrow.
      */}
      <ul className="mt-7 grid gap-10 md:grid-cols-[repeat(3,calc((100%-4rem)/3*0.85))] md:grid-rows-[auto_auto] md:justify-between md:gap-x-8 md:gap-y-0">
        {items.map(item => (
          <li key={item._id} className="md:row-span-2 md:grid md:grid-rows-subgrid md:[zoom:0.85]">
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
                A third of the main column, not of the viewport — the shell caps at 1320px less its
                gutters, and the card is 85% of that, so a card never exceeds ~340px.
              */}
              {item.coverPhoto
                ? (
                    <SanityPhoto
                      photo={item.coverPhoto}
                      sizes="(min-width: 1320px) 340px, (min-width: 768px) 28vw, 100vw"
                    />
                  )
                : null}
            </WritingLink>

            {/* One grid row for the rest, flowing freely inside it. */}
            <div>
              {/*
                The eyebrow: a link out names its publication; a post is on this site and does not
                need to say so. Both carry the date, which is what orders her writing everywhere.
              */}
              <p className="type-byline mt-4 uppercase text-accent">
                {item._type === 'article' && `${item.publication} · `}
                <time dateTime={item.publishedAt}>{formatDate(item.publishedAt)}</time>
              </p>

              <h3 className="type-display-sm mt-3">
                <WritingLink item={item} className="text-ink transition-colors hover:text-accent">
                  {item.title}
                </WritingLink>
              </h3>

              {item.summary && (
                <p className="type-body-md mt-3 text-ink-soft">{item.summary}</p>
              )}

              {/*
                "Read more" is meaningless out of context, and a screen reader can pull links out of
                context. The aria-label names the destination.

                Sentence case with an arrow, the mockup's "Read more →".
              */}
              <WritingLink
                item={item}
                aria-label={`Read more: ${item.title}`}
                className="type-body-sm-strong mt-3 inline-block text-ink transition-colors hover:text-accent"
              >
                Read more →
              </WritingLink>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
