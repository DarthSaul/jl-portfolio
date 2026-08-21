import { isValidElement } from 'react'
import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'

import { slugifyHeading } from '@/lib/docs'

import { DocImage } from './DocImage'

/**
 * The Field Guide's markdown, rendered — the docs counterpart of `ProseBody`, and shaped like
 * it on purpose: a `space-y-6` wrapper whose caller supplies the type token, one component per
 * element in place of the Portable Text `components` map.
 *
 * A Server Component in practice: the page renders it on the server, so react-markdown never
 * ships to the browser. Nothing here needs a hook, so there is no directive to add.
 *
 * ## Headings demote one level
 *
 * `SiteSidebar` owns the site's only `<h1>` (the wordmark), so the markdown's `#` renders as
 * `<h2>`, `##` as `<h3>`, `###` as `<h4>` — same reason every page heading on the site starts
 * at h2. The `##` sections carry ids from `slugifyHeading`, the same function `extractSections`
 * uses to build the TOC, so an anchor and its target cannot disagree — see `lib/docs.ts`.
 * The print rules in `globals.css` lean on this mapping too (`.docs-article h3` is a section).
 *
 * ## The blue
 *
 * The link renderer is the second consumer of `--color-link`, after `ProseLink` — inside
 * DESIGN.md's scope for it ("inline body links inside articles only"): the guide is long-form
 * body copy. The classes are `ProseLink`'s verbatim; if either changes, change both.
 *
 * ## Lists are new ground
 *
 * Portable Text on this site deliberately allows no lists (`lists: []` in `proseText`), so
 * `list-disc`/`list-decimal` below have no precedent to match — they exist only here.
 */

/** Concatenated text of a rendered node — what a heading reads as, for slugging. */
function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children)
  return ''
}

const components: Components = {
  h1: ({ children }) => <h2 className="type-display-lg text-ink">{children}</h2>,

  /*
   * `scroll-mt`: the sidebar's mobile bar is sticky (3.5rem tall), so a TOC jump without the
   * offset lands the heading underneath it. Desktop has no bar; a small offset just breathes.
   */
  h2: ({ children }) => (
    <h3
      id={slugifyHeading(textOf(children))}
      className="type-display-md mt-16 scroll-mt-20 border-t border-hairline pt-8 text-ink lg:scroll-mt-8"
    >
      {children}
    </h3>
  ),

  h3: ({ children }) => <h4 className="type-display-sm mt-10 text-ink">{children}</h4>,

  /*
   * A paragraph whose only child is an image unwraps to just the image. Markdown treats images
   * as inline, so a screenshot standing on its own line still arrives wrapped in a `<p>` — and
   * `DocImage` renders a `<figure>`, which is not valid inside one. Every screenshot in the
   * guide stands alone, so the unwrap covers them all.
   */
  p: ({ node, children }) => {
    const only = node?.children.length === 1 ? node.children[0] : undefined
    if (only?.type === 'element' && only.tagName === 'img') return <>{children}</>
    return <p>{children}</p>
  },

  a: ({ href, children }) => (
    <a
      href={href}
      {...(href?.startsWith('http') ? { target: '_blank', rel: 'noopener' } : {})}
      className="text-link underline underline-offset-2 transition-colors hover:text-ink"
    >
      {children}
    </a>
  ),

  ul: ({ children }) => <ul className="list-disc space-y-2 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal space-y-2 pl-5">{children}</ol>,

  blockquote: ({ children }) => (
    <blockquote className="border-l border-hairline pl-6 italic text-muted">{children}</blockquote>
  ),

  img: ({ src, alt }) => <DocImage src={typeof src === 'string' ? src : undefined} alt={alt} />,
}

export function DocsMarkdown({ markdown, className = '' }: { markdown: string, className?: string }) {
  /*
   * `skipHtml`: react-markdown does not parse raw HTML — without the flag it prints an HTML
   * node's source as visible text, which turned the guide's editorial comment into the first
   * paragraph of the page. Skipping makes `<!-- … -->` a comment in practice: notes to the
   * next editor of field-guide.md, invisible to Joan.
   */
  return (
    <div className={`docs-article space-y-6 ${className}`}>
      <ReactMarkdown components={components} skipHtml>{markdown}</ReactMarkdown>
    </div>
  )
}
