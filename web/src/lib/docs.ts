/**
 * The Field Guide's markdown, shared between the two places that must agree about it.
 *
 * `slugifyHeading` is called from both sides of one contract: `extractSections` derives the
 * table of contents from the raw markdown on `/docs`, and `DocsMarkdown`'s heading renderer
 * derives each section's `id` from its rendered text. One function, imported by both, is what
 * keeps a TOC anchor from ever pointing at an id that was slugged differently — the same move
 * `lib/showcase.ts` makes for showcase addresses.
 *
 * The two inputs are not literally identical — the extractor sees raw markdown ("The **big**
 * picture") where the renderer sees rendered text ("The big picture") — and they still slug the
 * same, because every run of non-alphanumerics collapses to a single hyphen, so emphasis marks
 * around a word vanish into the same separator the space became. The case that would diverge is
 * emphasis *inside* a word ("foo**bar**" → foo-bar vs foobar), which no heading here has.
 */

export interface DocSection {
  id: string
  title: string
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Every `## ` heading in the guide, in document order — the table of contents. */
export function extractSections(markdown: string): DocSection[] {
  return [...markdown.matchAll(/^## (.+)$/gm)].map((match) => {
    const title = (match[1] ?? '').trim()
    return { id: slugifyHeading(title), title }
  })
}
