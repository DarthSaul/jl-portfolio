/**
 * The band that names where a linked front-page photograph goes: the gallery's title, over the
 * bottom of the photograph, shown on hover or keyboard focus. Shared by the grid's cards
 * (`FeaturedPhotos`) and the carousel's slides (`HeroCarousel`) so the two cannot drift.
 *
 * It must sit inside the link, and the link must carry `group` and `relative`.
 *
 * Ink at an opacity that keeps the photograph readable, square like everything else, and the same
 * `body-sm-strong` caps treatment the nav gets.
 *
 * **`group-focus-visible` is not optional** — a keyboard user gets no hover.
 * **`[@media(hover:none)]:opacity-100` is the other half**: Tailwind compiles `hover:` inside
 * `@media (hover: hover)`, so on a touch screen the band would otherwise never appear.
 * `aria-hidden`, because the link's `aria-label` already names the gallery.
 *
 * No directive: rendered by a Server Component (the grid) and a Client Component (the carousel).
 */
export function GalleryTitleBand({ title }: { title: string }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 bg-ink/70 px-3 py-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 md:px-4 md:py-3 [@media(hover:none)]:opacity-100"
    >
      <span className="type-body-sm-strong uppercase tracking-[0.12em] text-canvas">
        {title}
      </span>
    </div>
  )
}
