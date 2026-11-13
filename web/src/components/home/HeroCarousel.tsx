'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { SanityPhoto } from '@/components/SanityPhoto'
import { photoRatio } from '@/lib/photo'
import type { HOME_QUERY_RESULT } from '~~/sanity.types'

import { GalleryTitleBand } from './GalleryTitleBand'

type Slide = NonNullable<HOME_QUERY_RESULT>['carouselPhotos'][number]

/**
 * The front page's carousel: one large photograph at a time, cross-fading every five seconds,
 * with an optional row of slide markers beneath. Chosen in the Studio by `homePage.heroLayout`;
 * the photographs are `homePage.carouselPhotos`, in her order; the markers are
 * `homePage.showCarouselMenu`.
 *
 * ## Framing — RULE 2
 *
 * One fixed 16:9 frame at every width, so the page never jumps between slides — and **no crop**.
 * Each photograph is shown whole at its own ratio, as large as fits inside the frame and centred
 * in it: a landscape wider than 16:9 spans the width with paper above and below, a 4:3 or a
 * portrait spans the height with paper either side. That is a bound, not a crop (CLAUDE.md,
 * Rule 2), so there is no `crop=` here and nothing she can lose off the edges.
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
 * the five seconds rather than cutting the next one short. A single photograph never advances and
 * shows no menu.
 *
 * It holds still while the pointer is over it or focus is inside it (so a visitor reaching for a
 * marker is not chased by it), and never starts under `prefers-reduced-motion` — the first slide
 * stays, and the menu still works.
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

const INTERVAL_MS = 5000

/** The frame's ratio. Only the frame's — a photograph inside it keeps its own. */
const FRAME = 16 / 9

/**
 * How much of the frame's width a photograph fills when fitted inside it: all of it for anything
 * at least as wide as 16:9, proportionally less for anything taller.
 */
const widthShare = (ratio: number) => Math.min(1, ratio / FRAME)

/**
 * The frame is at most 1256px wide (1320 shell less its 32px gutters) and the screen's width on a
 * phone; the photograph is its share of that. Per photograph, so a portrait is not handed a file
 * sized for the whole frame.
 */
const sizesFor = (share: number) =>
  `(min-width: 1320px) ${Math.ceil(1256 * share)}px, ${Math.ceil(100 * share)}vw`

export function HeroCarousel({ slides, showMenu }: { slides: Slide[], showMenu: boolean }) {
  /*
    `carouselPhoto.photo` is required, but a slide whose photo was never picked (or a
    pre-migration shape) resolves to null — drop it rather than hand SanityPhoto nothing, as
    `FeaturedPhotos` does.
  */
  const photos = slides.flatMap(({ _key, photo, gallery }) => (photo ? [{ _key, photo, gallery }] : []))
  const count = photos.length
  const [active, setActive] = useState(0)
  const [held, setHeld] = useState(false)
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

  const playing = count > 1 && !held && !reducedMotion

  useEffect(() => {
    if (!playing) return
    const timer = window.setTimeout(() => setActive(index => (index + 1) % count), INTERVAL_MS)
    return () => window.clearTimeout(timer)
  }, [active, playing, count])

  if (count === 0) return null

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured photographs"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeld(false)
      }}
    >
      {/* Full-bleed to the screen's edges on a phone; inside the column from `md` up. */}
      <div className="bleed relative aspect-video overflow-hidden md:mx-0">
        {photos.map(({ _key, photo, gallery }, index) => {
          const isActive = index === active
          const share = widthShare(photoRatio(photo))
          const picture = <SanityPhoto photo={photo} sizes={sizesFor(share)} priority={index === 0} />
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
                The fit: the wrapper takes the photograph's share of the frame's width, and the
                photograph's own aspect-ratio (reserved by SanityPhoto) sets the height — which by
                construction never exceeds the frame's. The flex parent centres it both ways.
              */}
              {mounted.has(index) && (gallery
                ? (
                    <Link
                      href={`/gallery/${gallery.slug}`}
                      aria-label={`${gallery.title} — see the photos`}
                      className="group relative block"
                      style={{ width: `${share * 100}%` }}
                    >
                      {picture}
                      <GalleryTitleBand title={gallery.title} />
                    </Link>
                  )
                : <div style={{ width: `${share * 100}%` }}>{picture}</div>)}
            </figure>
          )
        })}
      </div>

      {showMenu && count > 1 && (
        /*
          The markers: thin bars with a small number above each, under the frame. The active bar
          fills with the accent over the five seconds — a progress line, keyed on the index so it
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
