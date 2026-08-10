import type { MaybeRefOrGetter } from 'vue'

import { NuxtLink } from '#components'
import type { WRITING_QUERY_RESULT } from '~~/sanity.types'

/** One entry in her writing — a `post` or an `article`, as `WRITING_QUERY` projects it. */
export type WritingItem = WRITING_QUERY_RESULT['items'][number]

/**
 * Where an entry goes when you click it.
 *
 * `post` and `article` split her writing by where it lives, and this is the one place that split
 * becomes a decision: a post opens its page here, a link out opens the site that published it in
 * a new tab. Everything else about the two is identical to a reader.
 *
 * It returns the props for a `<component :is>` rather than a URL, because the two destinations
 * are not the same element — an internal route wants `NuxtLink` and its client-side navigation,
 * an external one wants a plain `<a>` with `rel="noopener"`. A single `href` string would have
 * given /copy full page loads.
 *
 * The union is discriminated on `_type` because `WRITING_QUERY` projects `slug` or `url`
 * conditionally beside it: `url` and `publication` exist only on an `article`, `slug` only on a
 * `post`, and reading either off the wrong branch is a type error rather than a runtime `undefined`.
 *
 * Lived inside `writing/ListItem.vue` until the redesign split that row into `writing/Lead.vue`
 * and `writing/Row.vue` and both needed it. `components/home/FeaturedWriting.vue` still carries
 * its own copy — it renders the same union on the front page and should adopt this, but that is
 * a change to the front page and did not ride along with /copy.
 *
 * The route is `/copy` now, not `/writing`. The document types are still `post` and `article`
 * and this file is still `useWritingLink` — only her words and the addresses moved, and
 * renaming a Sanity document type is a content migration bought with nothing.
 */
export function useWritingLink(item: MaybeRefOrGetter<WritingItem>) {
  return computed(() => {
    const value = toValue(item)
    return value._type === 'article'
      ? { is: 'a', href: value.url, target: '_blank', rel: 'noopener' }
      : { is: NuxtLink, to: `/copy/${value.slug}` }
  })
}
