import { ProseText } from '@/components/ProseText'
import type { ABOUT_QUERY_RESULT } from '~~/sanity.types'

type AboutPage = NonNullable<ABOUT_QUERY_RESULT>

/**
 * The heading and introduction at the top of /bio. DESIGN.md's `hero-band`.
 *
 * The headline in `display-hero` — Newsreader 600 at 64px, the spec's largest typographic
 * signature — and the introduction in the serif body face beneath it, one step larger than the
 * writing that follows. No card, no fill, no border: `hero-band` sits on the canvas, and the
 * elevation table is emphatic that "Level 0 — Flat" is where almost every surface lives. The size
 * of the type is the whole effect.
 *
 * ## This was the front page's
 *
 * It opened the site as `home/Hero.vue`, reading `homePage.introHeading` and `.intro`. Both fields
 * are `aboutPage`'s now and this is where they render, which is why the component moved rather
 * than being copied — a second hero differing only in which document it read would be two things
 * to keep in step.
 *
 * The photograph that used to sit beside this text did not come with it, and no longer exists
 * anywhere: `homePage.introPhoto` is deleted, and photographs on this page now come only from the
 * body, where she places them.
 *
 * Further back it was a photograph in the right two-thirds with a card overlapping its left edge,
 * built as a width overrun inside a grid track. That composition is gone and the argument it
 * existed to make is worth keeping, because it is what any future hero has to answer to: text over
 * an image is the classic case that wants a crop, and `photo.image` has no hotspot by design.
 *
 * `heading` is optional in the schema — "leave it empty and the introduction simply starts on its
 * own" — so both the element and the spacing below it are conditional. `intro` is optional too,
 * and this renders nothing at all when both are.
 *
 * No rule under it since 2026-11; the page's own spacing separates it from the body.
 */
export function Intro({
  heading,
  intro,
}: {
  heading: AboutPage['introHeading']
  intro: AboutPage['intro']
}) {
  if (!heading && !intro) return null

  return (
    <section>
      {heading && <h2 className="type-display-hero text-ink">{heading}</h2>}

      {/*
        `body-lg` is DESIGN.md's reading token — Inter at 19px, like the body below it.
      */}
      {intro && (
        <ProseText
          value={intro}
          className={['type-body-lg', heading && 'mt-4'].filter(Boolean).join(' ')}
        />
      )}
    </section>
  )
}
