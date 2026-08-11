import type { MouseEvent } from 'react'

/**
 * URL helpers shared by the two `/shots/*` pages, on both sides of the server boundary.
 *
 * Pure functions only — no hooks, no `window`. The page reads `searchParams` on the server with
 * these; the view reads `useSearchParams()` on the client with the same ones, so the two halves
 * cannot disagree about what an address means.
 */

/**
 * The selected tag slugs, from a repeated `?tag=` parameter. Empty means unfiltered.
 *
 * The *URL* parameter stays `?tag=` because that is what a visitor reads, and it repeats —
 * `?tag=life&tag=chile-2021`. Only the GROQ parameter is `$filterTags`, and
 * `sanity/queries/allShots` explains why it cannot be `$tag`.
 *
 * Sorted, so the same selection is always the same array whichever order she ticked the chips in.
 * That matters more than it looks: the array goes into a fetch whose cache key is derived from it,
 * so an unsorted one would make `?tag=a&tag=b` and `?tag=b&tag=a` two separate cache entries for
 * one set of photographs.
 *
 * Takes the shape Next hands a page (`string | string[] | undefined`) so the server can call it
 * directly; the client passes `searchParams.getAll('tag')`, which is already an array.
 */
export function readTags(value: string | string[] | undefined): string[] {
  const list = Array.isArray(value) ? value : value == null ? [] : [value]
  return list.filter(entry => Boolean(entry)).sort()
}

/**
 * The showcased photo id, or `''` for none.
 *
 * A visitor can type `?photo=a&photo=b`. Anything that is not exactly one value is treated as no
 * showcase rather than guessed at, which is the same posture `readTags` takes on a malformed tag.
 */
export function readPhotoId(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value.length === 1) return value[0] ?? ''
  return ''
}

/**
 * The same address with `photo` set, or removed when `photoId` is null.
 *
 * Every other parameter is carried through, which is what makes `?tag=life&photo=X` a photograph
 * reached *from a filtered index* — closing it returns to that filter rather than to the
 * unfiltered pile.
 */
export function showcaseHref(
  pathname: string,
  params: URLSearchParams,
  photoId: string | null,
): string {
  const next = new URLSearchParams(params)
  if (photoId) next.set('photo', photoId)
  else next.delete('photo')

  const query = next.toString()
  return query ? `${pathname}?${query}` : pathname
}

/**
 * The surrounding view — every parameter except `photo`, sorted so two URLs describing the same
 * view compare equal regardless of the order the parameters happen to appear in.
 *
 * On `/shots/all` that is the filter selection; on a gallery page there is nothing else and this
 * is always `''`. Used to decide whether a saved scroll position still describes the list on
 * screen — see `useShowcase`.
 */
export function viewKey(params: URLSearchParams): string {
  const rest = new URLSearchParams(params)
  rest.delete('photo')
  rest.sort()
  return rest.toString()
}

/**
 * Whether a click belongs to the browser rather than to us.
 *
 * The photo tiles and the showcase controls are real `<a href>` elements whose left-click is
 * intercepted so the navigation can be a `pushState` — see `useShowcase` for why that matters. A
 * middle-click, a Cmd/Ctrl-click or a shift-click must fall through untouched, so "open in a new
 * tab" opens the real address and the server renders it correctly.
 *
 * Modern Chrome and Firefox fire `auxclick` rather than `click` for the middle button, so it never
 * reaches the handler at all; `button !== 0` covers older behaviour and costs nothing. This is the
 * same test `next/link` makes internally.
 */
export function isModifiedEvent(event: MouseEvent): boolean {
  return (
    event.metaKey
    || event.ctrlKey
    || event.shiftKey
    || event.altKey
    || event.button !== 0
  )
}
