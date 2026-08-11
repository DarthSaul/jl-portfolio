import type { PhotoProjection } from '@/sanity/queries/photo'

/**
 * The photograph's shape as a bare number — width over height.
 *
 * Shared because three call sites needed the identical fallback and the identical
 * arithmetic. `GalleryGrid` divides by it
 * to pack rows, `GalleryStack` does not need it, and `PhotoShowcase` multiplies by it to bound a
 * photograph against the viewport height. A second copy that rounded differently, or fell back
 * differently, would show up as one preset packing a photograph slightly unlike another.
 *
 * **3:2 when the asset has no dimensions.** Sanity computes image metadata at upload and never
 * backfills it, so every photograph uploaded through this Studio has it and anything imported
 * around the Studio might not. A wrong-ish shape beats a zero — a zero collapses a grid column
 * to nothing and collapses the showcase's `max-width` to nothing, both of which look like the
 * photograph failed to load.
 *
 * This is not a Rule 2 control. It reads the photograph's own proportions out of the asset and
 * hands them to a layout; nothing here is settable, at a call site or in the Studio, and no
 * caller may pass a shape in.
 */
export const photoRatio = (photo: PhotoProjection) => {
  const { width, height } = photo.asset
  return width && height ? width / height : 1.5
}
