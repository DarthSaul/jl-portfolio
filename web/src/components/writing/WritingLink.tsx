import Link from 'next/link'
import type { ReactNode } from 'react'

import type { WRITING_QUERY_RESULT } from '~~/sanity.types'

/** One entry in her writing — a `post` or an `article`, as `WRITING_QUERY` projects it. */
export type WritingItem = WRITING_QUERY_RESULT['items'][number]

/**
 * Where an entry goes when you click it, as one element.
 *
 * `post` and `article` split her writing by where it lives, and this is the one place that split
 * becomes a decision: a post opens its page here, a link out opens the site that published it in a
 * new tab. Everything else about the two is identical to a reader.
 *
 * The two destinations are not the same element — an internal route wants `next/link` and its
 * client-side navigation, an external one wants a plain `<a>` with `rel="noopener"` — so this is a
 * component rather than a function returning an `href`. A single `href` string would have given
 * /copy full page loads.
 *
 * The Nuxt version was a composable returning props for `<component :is>`; React has no such
 * indirection, so the branch moved inside a component. Three call sites — `writing/Lead`,
 * `writing/Row` and `home/FeaturedWriting` — and the third is new: it used to carry its own
 * duplicate copy of this logic, which CLAUDE.md already flagged as something that should adopt the
 * shared version. It has.
 *
 * The union is discriminated on `_type` because `WRITING_QUERY` projects `slug` or `url`
 * conditionally beside it: `url` and `publication` exist only on an `article`, `slug` only on a
 * `post`, and reading either off the wrong branch is a type error rather than a runtime
 * `undefined`.
 *
 * The route is `/copy` now, not `/writing`. The document types are still `post` and `article` and
 * this is still `writing/` — only her words and the addresses moved, and renaming a Sanity
 * document type is a content migration bought with nothing.
 */
export function WritingLink({
  item,
  className,
  children,
  ...rest
}: {
  item: WritingItem
  className?: string
  children: ReactNode
  // Forwarded explicitly rather than by spreading `AnchorHTMLAttributes`: the point of this
  // component is that `href`, `target` and `rel` are decided *here* from `_type`, and a caller
  // able to pass them could send a post to an external address in a new tab.
  tabIndex?: number
  'aria-hidden'?: boolean
  'aria-label'?: string
}) {
  if (item._type === 'article') {
    return (
      <a href={item.url} target="_blank" rel="noopener" className={className} {...rest}>
        {children}
      </a>
    )
  }

  return (
    <Link href={`/copy/${item.slug}`} className={className} {...rest}>
      {children}
    </Link>
  )
}
