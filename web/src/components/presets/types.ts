import type { ReactNode } from 'react'

import type { PhotoProjection } from '@/sanity/queries/photo'

/**
 * The contract every layout preset satisfies — RULE 2's type-level half.
 *
 * The gallery schema's `LAYOUT_PRESETS` list and the components here have to stay in step: a
 * preset value with no component must be impossible. `PRESETS` in `shots/GalleryView.tsx` is
 * where that is enforced, and this is the shape it enforces *against* — without a shared type
 * the map would have to fall back to `unknown` and the guarantee would only cover existence, not
 * the interface.
 *
 * ## `renderPhoto` replaces Vue's scoped slot
 *
 * Rendering one photograph is the caller's business: the front page wraps each in a link to its
 * gallery, a gallery page wraps each in a link to the showcase, and a caller that wants neither
 * passes nothing and gets a bare `SanityPhoto`.
 *
 * **Both presets must declare the identical signature**, including the `sizes` in the argument.
 * That is what lets one call site render `PRESETS[gallery.preset]` with one render prop that
 * works for either. `sizes` is handed down rather than left to the caller because the ladder is
 * the preset's decision: a caller that overrode it would have to restate the grid's breakpoints,
 * which is exactly the number that must not exist twice.
 *
 * It is not a Rule 2 control. A caller decides what wraps a photograph, never how it is framed
 * or how wide it is — those stay inside the preset and inside `SanityPhoto`.
 */
export type RenderPhoto = (args: {
  photo: PhotoProjection
  index: number
  sizes: string
}) => ReactNode

export type GalleryPresetProps = {
  photos: PhotoProjection[]
  renderPhoto?: RenderPhoto
}
