import type { PhotoProjection } from '@/sanity/queries/photo'

/**
 * The only <img> in the app that renders a photograph.
 *
 * CLAUDE.md requires every photograph on the site to render through one component, so that
 * srcset, lazy loading, the blur-up placeholder and aspect-ratio reservation are decided in a
 * single place for ~250 photos on a phone connection. This is that place.
 *
 * `grep -rn "<img" web/src` finds **two** tags: this one, and the illustrated portrait in
 * `SiteSidebar.tsx`. The second is chrome shipped as a static file in `web/public/`, with no
 * Sanity asset behind it and therefore nothing for any of the four features above to read. The
 * rejected alternative — teaching this component to also accept a bare URL — is written up at
 * that call site. A third hit that *is* a photograph is a bug.
 *
 * ## Why this is not `next/image`
 *
 * `next/image` would put Vercel's optimiser in front of an image CDN that already does
 * everything it does — a second transform of an already-transformed file, billed per source
 * image, to re-derive a width and a format Sanity negotiated. It would also move the srcset
 * ladder, the format choice and the placeholder behind a component this project does not
 * control, which is the opposite of the rule above: the value here is that one file decides all
 * of it and the decisions are readable. The no-upscale clamp below has no `next/image`
 * equivalent at all.
 *
 * Two things a caller deliberately cannot do:
 *
 *  - **Pass an `alt`.** It comes off the photo document, because Rule 1 says one photograph is
 *    one record with one description. A caller that could override it is a caller that can make
 *    the same photo describe itself two different ways.
 *  - **Pass an aspect ratio, a size, or a crop offset.** At reading size the box is the
 *    photograph's own shape, taken from the asset's metadata. That is Rule 2 at the pixel level,
 *    and it is why `photo.image` has no hotspot: there is no framing decision to make, here or
 *    in the Studio.
 *
 * `crop` is the exception to the second of those, and its shape is the whole safety property:
 * **a name from a closed list, never numbers.** A caller says `crop="lead"`, not `300x200` and
 * not `ratio={1.5}`, so the set of framings that exist on this site is `CROPS` below and a value
 * with no entry there is a type error. That is the same move the gallery schema makes with
 * `LAYOUT_PRESETS` — she picks a preset, never a measurement — applied one layer down. Widening
 * it to accept dimensions would make every call site a framing control, which is exactly what
 * Rule 2 exists to prevent.
 *
 * Adding an entry is a Rule 2 decision and does not get made inside this file. See the crop
 * notes in CLAUDE.md for what each existing one costs her.
 *
 * A photograph at reading size — a gallery, a post body, the showcase — passes no `crop` at all
 * and keeps its own proportions. That is still the default and still the common case;
 * `grep -rn "crop=" web/src/components/` should stay a short list.
 *
 * `sizes` is the other thing the caller supplies, because only the layout knows how wide the
 * image will be rendered. It is a hint for the browser's srcset pick, not a size.
 *
 * No `'use client'` directive: this renders on both sides of the boundary — a Server Component
 * on the prerendered routes, part of the client tree inside `AllShotsView`. It needs neither
 * hooks nor handlers, so it stays dual-use.
 */

/**
 * Every framing this site has, and the only values `crop` accepts.
 *
 * `w`/`h` are a ratio, not pixels — the rendered size comes from CSS and the srcset. Each entry
 * carries its own ladder, because the whole point of a crop here is that the box is small and
 * known, so offering the full-size ladder would quietly hand a phone a 2000px file to paint a
 * 92px square.
 *
 *  - **`square`** — preview thumbnails. /copy's ledger lists each piece behind one at 72px on a
 *    phone and 92px above it, so the largest worth sending is a 384px square, a 3x phone. The
 *    bottom rung sits a little above the 1x phone size rather than on it, deliberately: adding a
 *    rung per call site is how one ladder becomes several.
 *  - **`lead`** — the cover of the lead story on /copy, 300×200 in its column. The ladder runs
 *    well past 300 because this is the one crop that goes full-width on a phone, where `sizes`
 *    resolves to 100vw and a 3x device wants ~1300px.
 */
const CROPS = {
  square: { w: 1, h: 1, widths: [80, 128, 160, 256, 384], fallback: 128 },
  lead: { w: 3, h: 2, widths: [300, 450, 600, 900, 1200, 1400], fallback: 600 },
} as const

type CropName = keyof typeof CROPS

/**
 * Candidate widths, in CSS pixels, for an uncropped photograph. Wide enough for a 2x phone and a
 * 1x laptop. Clamped to the asset's own width below, because Sanity's CDN will happily upscale
 * past the original and charge a phone for the privilege.
 */
const WIDTHS = [400, 800, 1200, 1600, 2000]

type Props = {
  photo: PhotoProjection
  /** How wide this renders at each breakpoint. Drives which srcset entry the browser picks. */
  sizes?: string
  /** Above the fold — load eagerly and at high priority. */
  priority?: boolean
  /** A named framing from `CROPS`. Omit for a photograph at reading size. */
  crop?: CropName
}

export function SanityPhoto({ photo, sizes = '100vw', priority, crop: cropName }: Props) {
  const crop = cropName ? CROPS[cropName] : null

  /**
   * `auto=format` negotiates AVIF/WebP per browser and is on either path.
   *
   * At reading size the URL carries a width, a format and a quality, and nothing that selects a
   * region — no `fit`, no `rect`, no `crop`. The CDN's default fit preserves the aspect ratio, so
   * the no-crop rule holds at the URL level and not just by convention. Which is also why a crop
   * is done *here* rather than with `object-cover` at a call site — a CSS crop would leave the
   * URL claiming a framing the page does not use, and would make the browser download the hidden
   * pixels to throw them away.
   *
   * A crop adds an `h` derived from the named ratio, plus `fit=crop&crop=center`. `crop=center`
   * is stated rather than left to default because it is the whole safety property — the asset has
   * no hotspot, so "centred" is the only framing anything here can honestly promise.
   */
  const at = (w: number) => {
    if (!crop) return `${photo.asset.url}?w=${w}&auto=format&q=75`
    const h = Math.round((w * crop.h) / crop.w)
    return `${photo.asset.url}?w=${w}&h=${h}&fit=crop&crop=center&auto=format&q=75`
  }

  /**
   * The widest the source can fill at the requested shape without upscaling.
   *
   * For a crop that is bounded by the *shorter* dimension once the ratio is applied: a 3000×1000
   * panorama holds a 1500px-wide 3:2 crop and no more, and a 3000×2000 photo has no 2500px
   * square in it.
   */
  const natural = (() => {
    const { width, height } = photo.asset
    if (crop) {
      // Floored, because the ratio divides: a 3000×1001 asset bounds a 3:2 crop at 1501.5. That
      // is normally hidden by the ladder cap, but an asset smaller than the ladder's bottom rung
      // makes `srcset` fall back to this number directly — `w=250.5` in the URL and a `250.5w`
      // descriptor, which is not a valid width. `Math.floor(Infinity)` is still Infinity, so the
      // no-dimensions branch below is unaffected.
      const limit = Math.floor(Math.min(width ?? Infinity, ((height ?? Infinity) * crop.w) / crop.h))
      return Number.isFinite(limit) ? limit : crop.widths[crop.widths.length - 1]!
    }
    return width ?? WIDTHS[WIDTHS.length - 1]!
  })()

  const srcSet = (() => {
    if (crop) {
      // Capped at the ladder's top as well as the source's, so a 4000px original is not offered
      // as a 4000px thumbnail to a browser willing to take it.
      const max = Math.min(natural, crop.widths[crop.widths.length - 1]!)
      const widths = crop.widths.filter(w => w <= max)
      return (widths.length ? widths : [max]).map(w => `${at(w)} ${w}w`).join(', ')
    }

    const widths = WIDTHS.filter(w => w < natural)
    // The asset's own width is always the last entry, so the largest offer is the real file
    // rather than an upscale of it.
    widths.push(natural)
    return widths.map(w => `${at(w)} ${w}w`).join(', ')
  })()

  /**
   * The fallback `src`, sized for the shape being rendered rather than one figure for both.
   *
   * Clamped to the source for the same reason every entry in `srcSet` is: past its own width the
   * CDN upscales rather than refusing, so an asset narrower than the fallback would be enlarged
   * and served at a size it does not have. `srcSet` has always guarded this and `src` did not,
   * which left the one request a browser makes when it ignores `srcSet` as the only one able to
   * ask for an upscale.
   */
  const fallbackWidth = Math.min(natural, crop ? crop.fallback : 1200)

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
  const aspectRatio = crop
    ? `${crop.w} / ${crop.h}`
    : photo.asset.width && photo.asset.height
      ? `${photo.asset.width} / ${photo.asset.height}`
      : undefined

  /**
   * The low-quality placeholder, painted as the img's own background.
   *
   * A background rather than a second element, so there is nothing to fade out and nothing to get
   * wrong between the server render and hydration — the photographs are opaque JPEGs, so the real
   * image covers it completely the moment it decodes.
   */
  const backgroundImage = photo.asset.lqip ? `url(${photo.asset.lqip})` : undefined

  return (
    /*
      `object-cover` agrees with the CDN crop rather than doing the cropping: both are centred and
      both use the same ratio, so it only matters in the moment before the right srcset candidate
      lands. Remove it and a sub-pixel rounding difference between the reserved box and the
      returned file shows as a hairline of background.

      `fetchPriority` is camelCase in React and lowercase in the DOM; React maps it. Vue needed
      the lowercase spelling — one of the few places the two genuinely differ.
    */
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={at(fallbackWidth)}
      srcSet={srcSet}
      sizes={sizes}
      alt={photo.alt}
      style={{ aspectRatio, backgroundImage }}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      className={`block w-full bg-canvas-soft bg-cover bg-center${crop ? ' h-full object-cover' : ''}`}
    />
  )
}
