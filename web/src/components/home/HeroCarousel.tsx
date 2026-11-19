'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'

import { SanityPhoto } from '@/components/SanityPhoto'
import { photoRatio } from '@/lib/photo'
import type { HOME_QUERY_RESULT } from '~~/sanity.types'

import { GalleryTitleBand } from './GalleryTitleBand'

type Slide = NonNullable<HOME_QUERY_RESULT>['carouselPhotos'][number]

/**
 * The front page's carousel: one large photograph at a time, cross-fading every four seconds,
 * with an optional row of slide markers beneath. Chosen in the Studio by `homePage.heroLayout`;
 * the photographs are `homePage.carouselPhotos`, in her order; the markers are
 * `homePage.showCarouselMenu`.
 *
 * ## Framing — RULE 2
 *
 * One fixed frame per breakpoint — the main column's full width, its height set once for the page — so the page
 * never jumps between slides, and **no crop**. Each photograph is shown whole at its own ratio, as
 * large as fits inside the frame and centred in it: one wider than the frame spans the width with
 * paper above and below, one taller spans the height with paper either side. That is a bound, not
 * a crop (CLAUDE.md, Rule 2), so there is no `crop=` here and nothing she can lose off the edges.
 *
 * - **From `md` up, 20:9** — 80% of the height a 16:9 frame had (shortened 2026-11).
 * - **Below `md`, the tallest slide's own ratio, capped at 4:5** (and never wider than 20:9). A
 *   20:9 frame on a phone is ~175px tall, which left an iPhone portrait a third of the screen
 *   wide. Taking the frame from the tallest photograph means that photograph fills the width;
 *   the cap keeps a 9:16 from making the frame taller than most phone screens (it gets thin paper
 *   either side instead). The cost lands on a mixed set: its landscapes span the width with
 *   paper above and below. It is a property of the whole carousel, computed from her photos —
 *   never a per-slide setting, never a Studio field.
 *
 * It replaced a centred 16:9 `hero` crop (2026-11), which zoomed iPhone portraits until only the
 * middle 40% of their height survived. Nothing here — no prop, no Studio field — sets a position,
 * offset or zoom per photograph.
 *
 * ## Links
 *
 * A slide may link a gallery (`carouselPhoto.gallery`), like a grid card. Its hover is the grid's
 * unpeeked card exactly: the gallery's title in a band over the bottom of the photograph
 * (`GalleryTitleBand`, shared with the grid), always visible on a touch screen. No peek — the
 * carousel never fetches gallery previews. The link is the fitted photograph, not the frame, so
 * the paper beside a portrait is not clickable and the band spans the photograph's own width.
 * Inactive slides are `inert`, so only the visible slide's link is reachable by keyboard.
 *
 * ## Motion
 *
 * Every slide is stacked in the same box and only opacity moves — a 700ms crossfade, no sliding.
 * A `setTimeout` keyed on the active index advances it, so choosing a slide from the menu restarts
 * the four seconds rather than cutting the next one short. A single photograph never advances and
 * shows no menu.
 *
 * It keeps rotating under the pointer — a mouse-over pause was removed as fussy (2026-11). It holds
 * still only while keyboard focus is inside it: inactive slides are `inert`, so advancing past a
 * focused slide link would drop focus to the top of the page. It never starts under
 * `prefers-reduced-motion` — the first slide stays, and the menu is shown even if she switched it
 * off, since it is then the only way to the other photographs.
 *
 * ## Loading
 *
 * The first photograph is eager and high-priority: it is the largest thing above the fold. The
 * others are mounted only once they are the active slide or the next one, so the page downloads
 * two hero-sized files up front rather than all of them, and each later one arrives a full five
 * seconds before it is needed. A mounted slide stays mounted, so going back never refetches.
 *
 * ## Accessibility
 *
 * A `<section>` with `aria-roledescription="carousel"`. Inactive slides are `aria-hidden` and
 * `inert`; alt text comes off each photo document. The markers are plain buttons naming their
 * slide, with `aria-current` on the active one — not an ARIA tablist, because nothing here is a
 * tab panel a visitor reads into.
 */

const INTERVAL_MS = 4000

/** The frame's ratio from `md` up. Only the frame's — a photograph inside it keeps its own. */
const FRAME = 20 / 9

/** The tallest the phone frame may be: 4:5. Below `md` the frame is the tallest slide, up to this. */
const PHONE_CAP = 4 / 5

/** The phone frame: the tallest (narrowest-ratio) slide's ratio, no taller than 4:5, no wider than 20:9. */
const phoneFrame = (ratios: number[]) => Math.min(FRAME, Math.max(PHONE_CAP, Math.min(...ratios)))

/**
 * How much of a frame's width a photograph fills when fitted inside it: all of it for anything
 * at least as wide as the frame, proportionally less for anything taller.
 */
const widthShare = (ratio: number, frame: number) => Math.min(1, ratio / frame)

/**
 * The frame is the main column: at most 1256px wide (1320 shell less its 32px gutters), and the
 * screen less its gutters below that (20px a side on a phone, 32px from `md`); the photograph is
 * its share of that, which differs between the two frames. Per photograph, so a portrait is not handed a file sized for the whole frame.
 */
const sizesFor = (share: number, phoneShare: number) =>
  `(min-width: 1320px) ${Math.ceil(1256 * share)}px, (min-width: 48rem) calc((100vw - 64px) * ${share.toFixed(3)}), calc((100vw - 40px) * ${phoneShare.toFixed(3)})`

export function HeroCarousel({ slides, showMenu }: { slides: Slide[], showMenu: boolean }) {
  /*
    `carouselPhoto.photo` is required, but a slide whose photo was never picked (or a
    pre-migration shape) resolves to null — drop it rather than hand SanityPhoto nothing, as
    `FeaturedPhotos` does.
  */
  const photos = slides.flatMap(({ _key, photo, gallery }) => (photo ? [{ _key, photo, gallery }] : []))
  const count = photos.length
  const [active, setActive] = useState(0)
  const [focused, setFocused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [mounted, setMounted] = useState<ReadonlySet<number>>(() => new Set([0, 1]))

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(query.matches)
    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  // Mount the active slide and the one after it, ahead of its turn.
  useEffect(() => {
    const next = (active + 1) % count
    setMounted(previous => previous.has(active) && previous.has(next)
      ? previous
      : new Set([...previous, active, next]))
  }, [active, count])

  const playing = count > 1 && !focused && !reducedMotion

  useEffect(() => {
    if (!playing) return
    const timer = window.setTimeout(() => setActive(index => (index + 1) % count), INTERVAL_MS)
    return () => window.clearTimeout(timer)
  }, [active, playing, count])

  if (count === 0) return null

  const phone = phoneFrame(photos.map(({ photo }) => photoRatio(photo)))

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured photographs"
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false)
      }}
    >
      {/*
        Inside the main column at every width — its edges are the masthead rule's. It was
        full-bleed on a phone until 2026-11, which ran a full-width portrait past the page's
        margins to the screen's edges.
      */}
      {/* `--phone-frame` is the phone's ratio (see Framing); `md` swaps in the fixed 20:9. */}
      <div
        className="relative aspect-(--phone-frame) overflow-hidden md:aspect-[20/9]"
        style={{ '--phone-frame': phone } as CSSProperties}
      >
        {photos.map(({ _key, photo, gallery }, index) => {
          const isActive = index === active
          const ratio = photoRatio(photo)
          const share = widthShare(ratio, FRAME)
          const phoneShare = widthShare(ratio, phone)
          const picture = <SanityPhoto photo={photo} sizes={sizesFor(share, phoneShare)} priority={index === 0} />
          // Its width in each frame, as custom properties the wrapper's two width classes read.
          const fit = {
            '--share': `${share * 100}%`,
            '--phone-share': `${phoneShare * 100}%`,
          } as CSSProperties
          const fitClass = 'w-(--phone-share) md:w-(--share)'
          return (
            <figure
              key={_key}
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${count}`}
              aria-hidden={!isActive}
              inert={!isActive}
              className={`absolute inset-0 m-0 flex items-center justify-center transition-opacity duration-700 ease-in-out motion-reduce:transition-none ${
                isActive ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {/*
                The fit: the wrapper takes the photograph's share of the frame's width (one share
                per breakpoint, because the frame changes shape at `md`), and the
                photograph's own aspect-ratio (reserved by SanityPhoto) sets the height — which by
                construction never exceeds the frame's. The flex parent centres it both ways.
              */}
              {mounted.has(index) && (gallery
                ? (
                    <Link
                      href={`/gallery/${gallery.slug}`}
                      aria-label={`${gallery.title} — see the photos`}
                      className={`group relative block ${fitClass}`}
                      style={fit}
                    >
                      {picture}
                      <GalleryTitleBand title={gallery.title} />
                    </Link>
                  )
                : <div className={fitClass} style={fit}>{picture}</div>)}
            </figure>
          )
        })}
      </div>

      {/*
        Her switch decides the markers for everyone else; under reduced motion they show anyway,
        because with no autoplay they are the only way past the first photograph.
      */}
      {(showMenu || reducedMotion) && count > 1 && (
        /*
          The markers: thin bars with a small number above each, under the frame. The active bar
          fills with the accent over the four seconds — a progress line, keyed on the index so it
          restarts with each slide. Paused or reduced-motion, it is simply full.

          Columns are set from the count so any number of photos shares the width evenly.
        */
        <ul
          className="mt-4 grid gap-3 md:gap-5"
          style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
        >
          {photos.map(({ _key }, index) => {
            const isActive = index === active
            return (
              <li key={_key}>
                <button
                  type="button"
                  aria-label={`Show slide ${index + 1}`}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => setActive(index)}
                  className="group block w-full py-2 text-left"
                >
                  <span
                    className={`type-byline block transition-colors ${
                      isActive ? 'text-ink' : 'text-subtle group-hover:text-ink'
                    }`}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="mt-2 block h-0.5 w-full bg-ink/15">
                    {isActive && (
                      <span
                        key={active}
                        className="block h-full bg-accent"
                        style={playing
                          ? { animation: `carousel-progress ${INTERVAL_MS}ms linear forwards` }
                          : { width: '100%' }}
                      />
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
