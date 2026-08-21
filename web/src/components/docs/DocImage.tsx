/**
 * One image in the Field Guide — a Studio screenshot, or the placeholder standing in for one.
 *
 * ## The placeholder contract
 *
 * A markdown image whose URL starts with `placeholder:` renders as a dashed box holding its own
 * description, so the guide can ship before any screenshot has been taken and the gaps stay
 * visible instead of silent. **Swapping in a real screenshot is one line of markdown:**
 *
 *   1. Save the screenshot as `web/public/docs/<slug>.png` (e.g. `studio-home.png`).
 *   2. In `web/content/docs/field-guide.md`, change that image's URL from
 *      `placeholder:<slug>` to `/docs/<slug>.png`. The description stays as the alt text.
 *
 * Nothing else moves — this component sees a non-placeholder URL and renders the real image.
 * (`/docs` the route and `/docs/<slug>.png` the file coexist fine: the route matches only the
 * bare path, and anything deeper falls through to `web/public/`.)
 *
 * ## The third `<img>` in the app
 *
 * CLAUDE.md's check (`grep -rl "<img" web/src` finds two files) now finds three, and this is
 * the argument: a Studio screenshot is documentation chrome, not one of her photographs. There
 * is no photo document behind it — no Sanity asset for `SanityPhoto`'s srcset and LQIP, no
 * stored alt to dereference — which puts it in the same category as the illustrated portrait in
 * `SiteSidebar`: a static file that ships with the code, not content she edits. What that
 * costs is paid the same way the portrait pays it: `loading="lazy"` by hand, alt written where
 * the image is placed (here, in the markdown).
 */

const PLACEHOLDER_PREFIX = 'placeholder:'

export function DocImage({ src, alt }: { src?: string, alt?: string }) {
  if (!src || src.startsWith(PLACEHOLDER_PREFIX)) {
    return (
      <figure className="border border-dashed border-muted bg-canvas-soft px-8 py-14 text-center">
        <p className="type-body-sm text-muted">{alt || 'Screenshot to come'}</p>
      </figure>
    )
  }

  return (
    <figure>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt ?? ''} loading="lazy" className="w-full border border-hairline" />
      {alt && <figcaption className="type-caption mt-2 text-muted">{alt}</figcaption>}
    </figure>
  )
}
