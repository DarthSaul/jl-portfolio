import { PortableText } from '@portabletext/react'
import type { InferComponents } from '@portabletext/react'

import type { ProseText as ProseTextValue } from '~~/sanity.types'

import { ProseLink } from './ProseLink'

/**
 * Renders a `proseText` field as a heading — so far the only editable heading on the site that
 * can carry emphasis or a link.
 *
 * **It has no caller right now.** It rendered `homePage.featuredTitle` above the photographs
 * until that row became a grid, and the field is looking for a new home — see the front-page note
 * in CLAUDE.md. It is not dead code yet, and the field is not to be deleted to tidy up: that is a
 * content decision.
 *
 * ## Why this is not just `ProseText`
 *
 * Portable Text renders one element per block, and for a `normal` block that element is a `<p>`.
 * Pointing `ProseText` at a heading would therefore produce a `<div>` wrapping a `<p>` styled to
 * look like a heading — no `<h2>` in the document outline, and nothing for a screen reader to
 * navigate by. So the `<h2>` below is the real element, and each block renders as nothing but its
 * children.
 *
 * In Vue that unwrapping needed a functional component with `inheritAttrs = false`, because
 * returning a fragment left the block's props with no single root to land on and every render
 * warned. React passes only the props a component destructures, so the whole workaround
 * disappears: `({ children }) => <>{children}</>` is the entire thing.
 *
 * `featuredTitle` is capped at one block in the schema, so "each block" is only ever one.
 */
const components = {
  /** A block renders as its children alone; the heading element is the `<h2>` below. */
  block: { normal: ({ children }) => <>{children}</> },
  marks: { hyperlink: ProseLink },
} satisfies InferComponents<ProseTextValue>

export function ProseHeading({ value, className }: { value: ProseTextValue, className?: string }) {
  return (
    <h2 className={className}>
      <PortableText value={value} components={components} />
    </h2>
  )
}
