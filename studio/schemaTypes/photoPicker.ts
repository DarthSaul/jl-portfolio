/**
 * Shared reference-picker helper. Exports no schema type — it is imported by every
 * field that holds an ordered list of references, so the behaviour is written once.
 */

/**
 * Hides items already chosen elsewhere in the same list from the reference picker.
 *
 * Sanity resolves an array member's `parentPath` as `valuePath.slice(0, -1)`, so
 * `parent` here is the whole array — every reference picked so far.
 *
 * The parameter is typed structurally rather than as Sanity's `ReferenceFilterResolver`:
 * that type lives in `@sanity/types`, which is a transitive dependency, not one we
 * declare. Assignability is still checked at the call site.
 */
export function excludeAlreadyChosen({parent}: {parent?: unknown}) {
  const chosen = (Array.isArray(parent) ? parent : []).flatMap((item) => {
    const ref = (item as {_ref?: string} | null)?._ref
    // The draft id has to go in too, or the draft of an already-chosen photo still
    // turns up in the picker as a separate-looking result.
    return ref ? [ref, `drafts.${ref}`] : []
  })

  return {filter: '!(_id in $chosen)', params: {chosen}}
}

/**
 * For `gallery.leadPhotos`: only photos carrying the gallery's tag, minus the ones already
 * chosen. The list arranges the front of a tag-filled gallery, so offering an untagged
 * photo would let her "arrange" something the gallery does not contain.
 *
 * The field is hidden when there is no tag, but a filter must not crash on the half-cleared
 * state — with no `tag._ref` it falls back to the plain exclusion above.
 */
export function taggedPhotosNotAlreadyChosen({
  document,
  parent,
}: {
  document?: unknown
  parent?: unknown
}) {
  const base = excludeAlreadyChosen({parent})
  const tagId = (document as {tag?: {_ref?: string}} | undefined)?.tag?._ref
  if (!tagId) return base

  return {
    filter: `references($tagId) && ${base.filter}`,
    params: {...base.params, tagId},
  }
}
