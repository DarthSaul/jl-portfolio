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
