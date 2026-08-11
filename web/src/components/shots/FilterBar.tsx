import Link from 'next/link'

import type { TagOption } from '@/sanity/queries/allShots'

/**
 * The tag filter row on /shots/all.
 *
 * DESIGN.md has no filter component, so this is built from the two it does define, used at their
 * stated polarity: `button-outline` (canvas fill, 1px ink border, ink text) for the inactive state
 * and `button-primary` (ink fill, canvas text) for the active one. Square corners, because the spec
 * calls `{rounded.none}` non-negotiable and a pill would be the one shape on the site that is
 * neither square nor a social icon.
 *
 * The type is `body-sm-strong` rather than the spec's `button-md`. `button-md` is 16px/700 and
 * sized for a CTA someone clicks once; a row of six of them is a wall. 14px/700 uppercase is what
 * every other small structural label on this site already uses — the nav, READ MORE, the eyebrow —
 * so the row reads as navigation, which is what it is.
 *
 * ## Many at once, and no ALL
 *
 * Each chip toggles its own tag in or out of the selection, and the selection is a **union**: a
 * photograph carrying any selected tag is shown. Adding a filter therefore always widens the set,
 * which is what makes ticking a second one safe — with roughly one trip tag per photograph, an
 * intersection would empty the page on the second click.
 *
 * The ALL chip is gone. It existed to express "no filter" as something to click, and under multiple
 * selection that state has a better name: nothing is selected. What replaces it is CLEAR, which
 * appears only when there is something to clear.
 *
 * ## Links, not buttons — and a real navigation, unlike the photo tiles
 *
 * Each filter is a `<Link>` and the state lives in the query string. That makes a filtered view
 * shareable and bookmarkable, gives back/forward the behaviour a visitor expects for free, and
 * means the filtered page server-renders.
 *
 * This is the deliberate difference from `PhotoLink`, which intercepts its click to make a
 * `pushState`. A tag change **must** reach the server: it is a different set of photographs, a
 * different first page and a different total. A `?photo=` change must not, because the photographs
 * are already here. Same page, two kinds of query parameter, two mechanisms — and that is the
 * distinction to preserve if either is ever touched.
 *
 * **`prefetch={false}` is not a micro-optimisation.** `/shots/all` is a dynamic route, so Next
 * prefetching each chip as it enters the viewport would fire a full server render of the page —
 * including its Sanity read — once per chip, before anyone clicks anything.
 *
 * `aria-current="page"` marks each active filter rather than `aria-pressed`, because these are
 * links to locations and not toggles. It also means the active styling and the accessible state
 * come from the same attribute rather than being tracked twice. That reading survives multi-select:
 * each chip still names a location, and several of them can be part of where you currently are.
 */
const BASE
  = 'type-body-sm-strong inline-block border border-ink px-4 py-2 uppercase tracking-[0.1em] '
    + 'transition-colors text-ink hover:bg-ink hover:text-canvas '
    + 'aria-[current=page]:bg-ink aria-[current=page]:text-canvas'

/**
 * Where a chip goes: the current selection with this tag added or removed.
 *
 * Sorted, so `?tag=a&tag=b` and `?tag=b&tag=a` are one address rather than two that render
 * identically — the same instinct that keeps the unfiltered page free of an empty parameter.
 *
 * The `tag` key is dropped entirely rather than set to empty when nothing is left, so clearing the
 * last chip lands on the canonical `/shots/all`.
 */
function toggleHref(active: string[], slug: string): string {
  const next = active.includes(slug)
    ? active.filter(value => value !== slug)
    : [...active, slug].sort()

  if (!next.length) return '/shots/all'

  const params = new URLSearchParams()
  for (const tag of next) params.append('tag', tag)
  return `/shots/all?${params.toString()}`
}

export function FilterBar({
  tags,
  active,
}: {
  /**
   * Only tags actually carried by visible photographs — see `tagsInUse` in the query, which also
   * does the ordering now.
   *
   * `TagOption[]` is read off the generated query result. It used to be `PhotoTag[]`, a union of
   * string literals from the schema's hardcoded vocabulary, paired with a `TAG_LABELS` map in the
   * app that the compiler kept exhaustive. Both are gone: a tag is a document, so its name arrives
   * with the query and there is no second copy to keep honest.
   */
  tags: TagOption[]
  /**
   * The slugs currently selected. Empty means unfiltered.
   *
   * Plain `string[]`, deliberately not narrowed: it comes off the query string, where a visitor
   * can type anything, and narrowing it would mean asserting a union over input nothing validates.
   * It is only ever compared.
   */
  active: string[]
}) {
  return (
    <nav aria-label="Filter photos">
      <ul className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <li key={tag.slug}>
            <Link
              href={toggleHref(active, tag.slug)}
              prefetch={false}
              aria-current={active.includes(tag.slug) ? 'page' : 'false'}
              className={BASE}
            >
              {tag.title}
            </Link>
          </li>
        ))}

        {/*
          Only when there is something to clear. Underlined text rather than a bordered chip, so it
          reads as an action on the row instead of a seventh tag in it — the same treatment the
          empty state's way back already uses.
        */}
        {active.length > 0 && (
          <li>
            <Link
              href="/shots/all"
              prefetch={false}
              className="type-body-sm-strong inline-block px-2 py-2 uppercase tracking-[0.1em] text-muted underline transition-colors hover:text-ink"
            >
              Clear
            </Link>
          </li>
        )}
      </ul>
    </nav>
  )
}
