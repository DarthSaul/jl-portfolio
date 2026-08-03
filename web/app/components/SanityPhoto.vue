<script setup lang="ts">
import type { PhotoProjection } from '~/queries/photo'

/**
 * The only <img> the Sanity-backed pages emit.
 *
 * CLAUDE.md requires every photograph on the site to render through one component, so that
 * srcset, lazy loading, the blur-up placeholder and aspect-ratio reservation are decided in a
 * single place for ~250 photos on a phone connection. This is that place.
 *
 * `SitePhoto` still exists alongside it and still has an <img>. That is the static stand-in,
 * and it now serves only /writing, which is still on placeholder content. It dies when that
 * page is wired up, and `grep -rn "<img" web/app` goes back to returning exactly one hit.
 *
 * Two things a caller deliberately cannot do:
 *
 *  - **Pass an `alt`.** It comes off the photo document, because Rule 1 says one photograph is
 *    one record with one description. A caller that could override it is a caller that can
 *    make the same photo describe itself two different ways.
 *  - **Pass an aspect ratio or a crop.** The box is the photograph's own shape, taken from the
 *    asset's metadata. That is Rule 2 at the pixel level, and it is why `photo.image` has no
 *    hotspot: there is no framing decision to make, here or in the Studio.
 *
 * `sizes` is the one thing the caller does supply, because only the layout knows how wide the
 * image will be rendered. It is a hint for the browser's srcset pick, not a size.
 */
const props = withDefaults(
  defineProps<{
    photo: PhotoProjection
    /** How wide this renders at each breakpoint. Drives which srcset entry the browser picks. */
    sizes?: string
    /** Above the fold — load eagerly and at high priority. */
    priority?: boolean
  }>(),
  { sizes: '100vw' },
)

/**
 * Candidate widths, in CSS pixels. Wide enough for a 2x phone and a 1x laptop.
 *
 * Clamped to the asset's own width below, because Sanity's CDN will happily upscale past the
 * original and charge a phone for the privilege.
 */
const WIDTHS = [400, 800, 1200, 1600, 2000]

/**
 * Only `w` and `auto=format` — no `fit`, no `crop`, no `rect`.
 *
 * The CDN's default fit preserves the aspect ratio, so the no-crop rule holds at the URL
 * level too and not just by convention. `auto=format` negotiates AVIF/WebP per browser.
 */
const at = (w: number) => `${props.photo.asset.url}?w=${w}&auto=format&q=75`

const natural = computed(() => props.photo.asset.width ?? WIDTHS[WIDTHS.length - 1]!)

const srcset = computed(() => {
  const widths = WIDTHS.filter(w => w < natural.value)
  // The asset's own width is always the last entry, so the largest offer is the real file
  // rather than an upscale of it.
  widths.push(natural.value)
  return widths.map(w => `${at(w)} ${w}w`).join(', ')
})

/**
 * The photograph's own proportions, reserving the box before any bytes arrive.
 *
 * `dimensions` is optional in the generated types because Sanity computes metadata at upload
 * and never backfills it. Every asset uploaded through this Studio has it; an import that
 * bypassed the Studio might not, and that photo gets no reservation rather than a wrong one.
 */
const aspect = computed(() => {
  const { width, height } = props.photo.asset
  return width && height ? `${width} / ${height}` : undefined
})

/**
 * The low-quality placeholder, painted as the img's own background.
 *
 * A background rather than a second element, so there is nothing to fade out and nothing to
 * get wrong between the server render and hydration — the photographs are opaque JPEGs, so
 * the real image covers it completely the moment it decodes.
 */
const placeholder = computed(() => {
  const { lqip } = props.photo.asset
  return lqip ? `url(${lqip})` : undefined
})
</script>

<template>
  <img
    :src="at(1200)"
    :srcset="srcset"
    :sizes="sizes"
    :alt="photo.alt"
    :style="{ aspectRatio: aspect, backgroundImage: placeholder }"
    :loading="priority ? 'eager' : 'lazy'"
    :fetchpriority="priority ? 'high' : undefined"
    decoding="async"
    class="block w-full bg-neutral-100 bg-cover bg-center"
  >
</template>
