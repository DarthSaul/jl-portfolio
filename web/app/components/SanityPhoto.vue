<script setup lang="ts">
import type { PhotoProjection } from '~/queries/photo'

/**
 * The only <img> in the app.
 *
 * CLAUDE.md requires every photograph on the site to render through one component, so that
 * srcset, lazy loading, the blur-up placeholder and aspect-ratio reservation are decided in a
 * single place for ~250 photos on a phone connection. This is that place, and now the whole of
 * it — `SitePhoto`, the static stand-in that served /writing while it was on Unsplash
 * placeholders, died with that page's query. `grep -rn "<img" web/app` finds one tag, here.
 *
 * Two things a caller deliberately cannot do:
 *
 *  - **Pass an `alt`.** It comes off the photo document, because Rule 1 says one photograph is
 *    one record with one description. A caller that could override it is a caller that can
 *    make the same photo describe itself two different ways.
 *  - **Pass an aspect ratio, a size, or a crop offset.** At reading size the box is the
 *    photograph's own shape, taken from the asset's metadata. That is Rule 2 at the pixel
 *    level, and it is why `photo.image` has no hotspot: there is no framing decision to make,
 *    here or in the Studio.
 *
 * `square` is the one exception to the second of those, and it is a boolean rather than a
 * shape on purpose — on or off, no dimensions, no offset, so a call site still cannot invent
 * a framing. It exists for preview thumbnails: /writing lists each piece behind a small
 * circular avatar of its cover, and a circle is a square crop. See the thumbnail note in
 * CLAUDE.md for why that stays inside Rule 2, and for what it costs her.
 *
 * A photograph at reading size — a gallery, a post body, the front-page intro — never passes
 * it. `grep -rn "square" web/app/components/` should stay a short list.
 *
 * `sizes` is the other thing the caller supplies, because only the layout knows how wide the
 * image will be rendered. It is a hint for the browser's srcset pick, not a size.
 */
const props = withDefaults(
  defineProps<{
    photo: PhotoProjection
    /** How wide this renders at each breakpoint. Drives which srcset entry the browser picks. */
    sizes?: string
    /** Above the fold — load eagerly and at high priority. */
    priority?: boolean
    /** Preview thumbnails only: a fixed, centred square crop. See the note above. */
    square?: boolean
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
 * The thumbnail ladder, and the reason `square` exists at all.
 *
 * An avatar renders at 80px on a phone and 128px above it, so the largest thing worth sending
 * is a 384px square — a 3x phone. Before this, /writing asked for a full-width cover of every
 * row and scaled it down in CSS, which is a ~1200px JPEG decoded into a 128px circle, seven
 * times over. Offering the big ladder here would quietly put that back.
 */
const SQUARE_WIDTHS = [80, 128, 160, 256, 384]

/**
 * `auto=format` negotiates AVIF/WebP per browser and is on either path.
 *
 * At reading size the URL carries only `w`: the CDN's default fit preserves the aspect ratio,
 * so the no-crop rule holds at the URL level and not just by convention.
 *
 * `square` adds `h` equal to `w` plus `fit=crop&crop=center`. `crop=center` is stated rather
 * than left to default because it is the whole safety property — the asset has no hotspot, so
 * "centred" is the only framing anything here can honestly promise.
 */
const at = (w: number) =>
  props.square
    ? `${props.photo.asset.url}?w=${w}&h=${w}&fit=crop&crop=center&auto=format&q=75`
    : `${props.photo.asset.url}?w=${w}&auto=format&q=75`

/**
 * The largest square the source can give without upscaling is its *shorter* side — a
 * 3000×2000 photo has no 2500px square in it.
 */
const natural = computed(() => {
  const { width, height } = props.photo.asset
  if (props.square) {
    const side = Math.min(width ?? Infinity, height ?? Infinity)
    return Number.isFinite(side) ? side : SQUARE_WIDTHS[SQUARE_WIDTHS.length - 1]!
  }
  return width ?? WIDTHS[WIDTHS.length - 1]!
})

const srcset = computed(() => {
  if (props.square) {
    // Capped at the ladder's top as well as the source's, so a 4000px original does not get
    // offered as a 4000px avatar to a browser willing to take it.
    const max = Math.min(natural.value, SQUARE_WIDTHS[SQUARE_WIDTHS.length - 1]!)
    const widths = SQUARE_WIDTHS.filter(w => w <= max)
    return (widths.length ? widths : [max]).map(w => `${at(w)} ${w}w`).join(', ')
  }

  const widths = WIDTHS.filter(w => w < natural.value)
  // The asset's own width is always the last entry, so the largest offer is the real file
  // rather than an upscale of it.
  widths.push(natural.value)
  return widths.map(w => `${at(w)} ${w}w`).join(', ')
})

/**
 * The fallback `src`, sized for the shape being rendered rather than one figure for both.
 *
 * Clamped to the source for the same reason every entry in `srcset` is: past its own width the
 * CDN upscales rather than refusing, so an asset narrower than the fallback would be enlarged
 * and served at a size it does not have. `srcset` has always guarded this and `src` did not,
 * which left the one request a browser makes when it ignores `srcset` as the only one able to
 * ask for an upscale.
 */
const fallbackWidth = computed(() =>
  Math.min(natural.value, props.square ? 128 : 1200),
)

/**
 * The photograph's own proportions, reserving the box before any bytes arrive.
 *
 * A square crop is square by construction, so it needs no metadata to reserve its box — which
 * is also why a thumbnail still reserves correctly on an asset that somehow lacks dimensions.
 *
 * `dimensions` is optional in the generated types because Sanity computes metadata at upload
 * and never backfills it. Every asset uploaded through this Studio has it; an import that
 * bypassed the Studio might not, and that photo gets no reservation rather than a wrong one.
 */
const aspect = computed(() => {
  if (props.square) return '1 / 1'
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
    :src="at(fallbackWidth)"
    :srcset="srcset"
    :sizes="sizes"
    :alt="photo.alt"
    :style="{ aspectRatio: aspect, backgroundImage: placeholder }"
    :loading="priority ? 'eager' : 'lazy'"
    :fetchpriority="priority ? 'high' : undefined"
    decoding="async"
    class="block w-full bg-neutral-100 bg-cover bg-center"
    :class="square ? 'h-full object-cover' : ''"
  >
</template>
