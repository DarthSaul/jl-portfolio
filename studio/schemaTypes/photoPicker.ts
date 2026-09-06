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
 * For `gallery.leadPhotos` ("Photo order"): only photos carrying any of the gallery's tags,
 * minus the ones already chosen. The list sets the order of a tag-filled gallery, so offering
 * a photo the gallery does not contain would let her "order" something that is not on the page.
 *
 * `references()` with an array of ids is a union — the same any-of reading the site's
 * `GALLERY_QUERY` gives the tags — so the picker and the page agree on what "in the gallery"
 * means.
 *
 * The field is hidden when there are no tags, but a filter must not crash on the half-cleared
 * states — an unset array, or members with no `_ref` yet — so it collects only real ids and
 * falls back to the plain exclusion above when none exist.
 */
export function taggedPhotosNotAlreadyChosen({
  document,
  parent,
}: {
  document?: unknown
  parent?: unknown
}) {
  const base = excludeAlreadyChosen({parent})
  const tags = (document as {tags?: {_ref?: string}[] | null} | undefined)?.tags
  const tagIds = (Array.isArray(tags) ? tags : [])
    .map((entry) => entry?._ref)
    .filter((ref): ref is string => Boolean(ref))
  if (tagIds.length === 0) return base

  return {
    filter: `references($tagIds) && ${base.filter}`,
    params: {...base.params, tagIds},
  }
}
