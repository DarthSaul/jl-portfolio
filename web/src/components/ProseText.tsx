import { PortableText } from '@portabletext/react'
import type { InferComponents } from '@portabletext/react'

import type { ProseText as ProseTextValue } from '~~/sanity.types'

import { ProseLink } from './ProseLink'

/**
 * Renders a `proseText` field — the front page's blurb, /bio's introduction.
 *
 * The rendering is delegated to `<PortableText>` rather than hand-rolled, and it is worth saying
 * why given how small the allowed subset is. Marks in Portable Text are a flat array of ids on
 * each span, and turning that back into correctly nested elements — an italic inside a link, a
 * link that spans a bold run — is the one genuinely fiddly part of the format.
 *
 * `@portabletext/react` is a direct dependency here, where the Nuxt app got `@portabletext/vue`
 * transitively through `@nuxtjs/sanity`'s `SanityContent`. Same library family, same `components`
 * map shape; the wrapper is now ours to declare rather than the module's.
 *
 * Only the pieces the schema can actually produce are overridden. Anything else — a heading, a
 * list, a code decorator — cannot appear, because `objects/proseText.ts` replaces Sanity's
 * defaults rather than extending them. A partial map merges with the library's own, which is what
 * leaves `normal` an ordinary paragraph and `strong`/`em` as `<strong>`/`<em>`.
 *
 * ## `className` is an explicit prop
 *
 * Vue passed it down by attribute fallthrough onto the `<div>`. React has no fallthrough, so
 * callers that style this — `about/Intro` hands it `type-body-serif-lg` — name the prop. The
 * `<div>` itself is not negotiable either way: `<PortableText>` renders no wrapper of its own, so
 * without one there is nothing for the vertical rhythm to sit on.
 */
const components = {
  marks: { hyperlink: ProseLink },
} satisfies InferComponents<ProseTextValue>

export function ProseText({ value, className }: { value: ProseTextValue, className?: string }) {
  return (
    <div className={['space-y-6', className].filter(Boolean).join(' ')}>
      <PortableText value={value} components={components} />
    </div>
  )
}
