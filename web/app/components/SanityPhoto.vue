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
 * `crop` is the exception to the second of those, and its shape is the whole safety property:
 * **a name from a closed list, never numbers.** A caller says `crop="lead"`, not `300x200` and
 * not `ratio={1.5}`, so the set of framings that exist on this site is `CROPS` below and a
 * value with no entry there is a type error. That is the same move the gallery schema makes
 * with `LAYOUT_PRESETS` — she picks a preset, never a measurement — applied one layer down.
 * Widening it to accept dimensions would make every call site a framing control, which is
 * exactly what Rule 2 exists to prevent.
 *
 * Adding an entry is a Rule 2 decision and does not get made inside this file. See the crop
 * notes in CLAUDE.md for what each existing one costs her.
 *
 * A photograph at reading size — a gallery, a post body, the front-page intro — passes no
 * `crop` at all and keeps its own proportions. That is still the default and still the common
 * case; `grep -rn "crop=" web/app/components/` should stay a short list.
 *
 * `sizes` is the other thing the caller supplies, because only the layout knows how wide the
 * image will be rendered. It is a hint for the browser's srcset pick, not a size.
 */

/**
 * Every framing this site has, and the only values `crop` accepts.
 *
 * `w`/`h` are a ratio, not pixels — the rendered size comes from CSS and the srcset. Each entry
 * carries its own ladder, because the whole point of a crop here is that the box is small and
 * known, so offering the full-size ladder would quietly hand a phone a 2000px file to paint a
 * 92px square.
 *
 *  - **`square`** — preview thumbnails. /writing's ledger lists each piece behind one at 72px
 *    on a phone and 92px above it, so the largest worth sending is a 384px square, a 3x phone.
 *    The bottom rung sits a little above the 1x phone size rather than on it, deliberately:
 *    adding a rung per call site is how one ladder becomes several.
 *  - **`lead`** — the cover of the lead story on /writing, 300×200 in its column. The ladder
 *    runs well past 300 because this is the one crop that goes full-width on a phone, where
 *    `sizes` resolves to 100vw and a 3x device wants ~1300px.
 */
const CROPS = {
  square: { w: 1, h: 1, widths: [80, 128, 160, 256, 384], fallback: 128 },
  lead: { w: 3, h: 2, widths: [300, 450, 600, 900, 1200, 1400], fallback: 600 },
} as const

type CropName = keyof typeof CROPS

const props = withDefaults(
  defineProps<{
    photo: PhotoProjection
    /** How wide this renders at each breakpoint. Drives which srcset entry the browser picks. */
    sizes?: string
    /** Above the fold — load eagerly and at high priority. */
    priority?: boolean
    /** A named framing from `CROPS`. Omit for a photograph at reading size. */
    crop?: CropName
  }>(),
  { sizes: '100vw' },
)

const crop = computed(() => (props.crop ? CROPS[props.crop] : null))

/**
 * Candidate widths, in CSS pixels, for an uncropped photograph. Wide enough for a 2x phone and
 * a 1x laptop.
 *
 * Clamped to the asset's own width below, because Sanity's CDN will happily upscale past the
 * original and charge a phone for the privilege.
 */
const WIDTHS = [400, 800, 1200, 1600, 2000]

/**
 * `auto=format` negotiates AVIF/WebP per browser and is on either path.
 *
 * At reading size the URL carries only `w`: the CDN's default fit preserves the aspect ratio,
 * so the no-crop rule holds at the URL level and not just by convention. Which is also why a
 * crop is done *here* rather than with `object-cover` at a call site — a CSS crop would leave
 * the URL claiming a framing the page does not use, and would make the browser download the
 * hidden pixels to throw them away.
 *
 * A crop adds an `h` derived from the named ratio, plus `fit=crop&crop=center`. `crop=center`
 * is stated rather than left to default because it is the whole safety property — the asset has
 * no hotspot, so "centred" is the only framing anything here can honestly promise.
 */
const at = (w: number) => {
  const c = crop.value
  if (!c) return `${props.photo.asset.url}?w=${w}&auto=format&q=75`
  const h = Math.round((w * c.h) / c.w)
  return `${props.photo.asset.url}?w=${w}&h=${h}&fit=crop&crop=center&auto=format&q=75`
}

/**
 * The widest the source can fill at the requested shape without upscaling.
 *
 * For a crop that is bounded by the *shorter* dimension once the ratio is applied: a 3000×1000
 * panorama holds a 1500px-wide 3:2 crop and no more, and a 3000×2000 photo has no 2500px square
 * in it.
 */
const natural = computed(() => {
  const { width, height } = props.photo.asset
  const c = crop.value
  if (c) {
    const limit = Math.min(width ?? Infinity, ((height ?? Infinity) * c.w) / c.h)
    return Number.isFinite(limit) ? limit : c.widths[c.widths.length - 1]!
  }
  return width ?? WIDTHS[WIDTHS.length - 1]!
})

const srcset = computed(() => {
  const c = crop.value
  if (c) {
    // Capped at the ladder's top as well as the source's, so a 4000px original is not offered
    // as a 4000px thumbnail to a browser willing to take it.
    const max = Math.min(natural.value, c.widths[c.widths.length - 1]!)
    const widths = c.widths.filter(w => w <= max)
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
  Math.min(natural.value, crop.value ? crop.value.fallback : 1200),
)

/**
 * The box, reserved before any bytes arrive.
 *
 * A crop's shape is known from its name, so it needs no metadata to reserve its box — which is
 * also why a cropped photo still reserves correctly on an asset that somehow lacks dimensions.
 *
 * `dimensions` is optional in the generated types because Sanity computes metadata at upload
 * and never backfills it. Every asset uploaded through this Studio has it; an import that
 * bypassed the Studio might not, and that photo gets no reservation rather than a wrong one.
 */
const aspect = computed(() => {
  const c = crop.value
  if (c) return `${c.w} / ${c.h}`
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
  <!-- `object-cover` agrees with the CDN crop rather than doing the cropping: both are centred
       and both use the same ratio, so it only matters in the moment before the right srcset
       candidate lands. Remove it and a sub-pixel rounding difference between the reserved box
       and the returned file shows as a hairline of background. -->
  <img
    :src="at(fallbackWidth)"
    :srcset="srcset"
    :sizes="sizes"
    :alt="photo.alt"
    :style="{ aspectRatio: aspect, backgroundImage: placeholder }"
    :loading="priority ? 'eager' : 'lazy'"
    :fetchpriority="priority ? 'high' : undefined"
    decoding="async"
    class="block w-full bg-canvas-soft bg-cover bg-center"
    :class="crop ? 'h-full object-cover' : ''"
  >
</template>
