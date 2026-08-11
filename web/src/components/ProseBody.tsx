import { PortableText } from '@portabletext/react'
import type { InferComponents } from '@portabletext/react'

import type { POST_QUERY_RESULT } from '~~/sanity.types'

import { BodyPhoto } from './BodyPhoto'
import { ProseLink } from './ProseLink'

type Body = NonNullable<POST_QUERY_RESULT>['body']

/**
 * A body of prose with photographs in it, rendered. Shared by `post.body` and `aboutPage.body`,
 * which are the same shape in the schema and get the same treatment here.
 *
 * It sits at the root of `components/` rather than under `writing/` for exactly that reason. The
 * prop is still typed off `POST_QUERY_RESULT`: the two bodies generate structurally identical
 * types, and picking the one that allows the most styles means the renderer is checked against the
 * widest input either caller can hand it.
 *
 * Only what the schema can actually produce is overridden. `post.body` allows three styles, two
 * decorators, one annotation and one block type, because `objects/proseText.ts` replaces Sanity's
 * defaults rather than extending them — there are no lists, no h1, no code decorator to write a
 * component for. A partial map merges with the library's defaults, which is what leaves `normal`
 * an ordinary paragraph and `strong`/`em` as `<strong>`/`<em>`.
 *
 * ## Why the "Subheading" style renders as an `<h3>`
 *
 * The style is *stored* as `h2` — that is the value in the schema, and Sanity's convention is to
 * name block styles after the element they resemble. It is not an instruction about depth. On this
 * site `SiteSidebar` puts the wordmark in an `<h1>` on every page and the post's own title is the
 * `<h2>`, so rendering a subheading as a literal `<h2>` would put it level with the title of the
 * piece it sits inside. `<h3>` is what the outline actually calls for.
 *
 * ## Two things the React port simplified, and one it did not
 *
 * The Vue version built `Subheading` and `Quote` as functional components with
 * `inheritAttrs = false`, because Portable Text passes each block component its block props and
 * without that they landed on the element as junk attributes and warned on every render. React
 * passes only what a component destructures, so both are plain inline components now.
 *
 * A **type** component receives no `children` — `PortableTextTypeComponentProps` is
 * `Omit<…, 'children'>` — which is why `postPhoto` below destructures only `value`. A block or
 * mark component does receive them.
 *
 * What did *not* simplify: `components` closes over `sides`, so it is rebuilt on every render.
 * That is fine **only because this is a Server Component** and renders once. If it ever moves into
 * the client tree it needs `useMemo`, or a new object identity remounts every block on each
 * render. Currently it is reached from `/copy/[slug]` and `/bio`, both Server Components.
 */

/**
 * Which way each *wrapped* photograph floats, keyed by `_key`.
 *
 * The alternation used to be pure CSS — `md:[&>figure:nth-of-type(odd)]:float-right` and its even
 * twin on the wrapper — and that stopped working the day a photograph could be full width.
 * `nth-of-type` counts every figure, so a full-width one in the middle consumes a turn and the two
 * wrapped photographs on either side of it both float the same way. There is no selector for "odd
 * among those that are wrapped" that is safe at this project's browser floor, so the count lives
 * here, where it can simply skip the ones that do not participate.
 *
 * It stays a *derived* value rather than a field: which side a photograph takes is a consequence
 * of how many wrapped ones precede it, and Rule 2 keeps that out of her hands. `?? 'wrap'` matches
 * `BodyPhoto` — a photograph placed before the field existed alternates exactly as it always did.
 */
function floatSides(blocks: Body) {
  const sides = new Map<string, 'left' | 'right'>()
  let wrapped = 0

  for (const block of blocks ?? []) {
    if (block._type === 'postPhoto' && (block.layout ?? 'wrap') === 'wrap') {
      sides.set(block._key, wrapped % 2 === 0 ? 'right' : 'left')
      wrapped++
    }
  }

  return sides
}

export function ProseBody({ value, className }: { value: Body, className?: string }) {
  const sides = floatSides(value)

  const components = {
    block: {
      h2: ({ children }) => <h3 className="type-display-sm mt-12">{children}</h3>,

      /*
        A hairline in the margin, which is the only elevation cue DESIGN.md gives — "surface
        contrast and hairline borders carry all visual hierarchy", and there are no shadows and no
        fills to reach for. The italic is a real one: Lora ships an italic face and it is loaded,
        so the browser is not shearing an upright into an oblique.
      */
      blockquote: ({ children }) => (
        <blockquote className="border-l border-hairline pl-6 italic text-muted">
          {children}
        </blockquote>
      ),
    },
    marks: { hyperlink: ProseLink },
    types: {
      postPhoto: ({ value: photo }) => <BodyPhoto value={photo} side={sides.get(photo._key)} />,
    },
  } satisfies InferComponents<Body>

  return (
    /*
      The wrapper carries the vertical rhythm and the typography classes handed down by the page.

      ## The alternating float used to live here, in CSS

      It was `md:[&>figure:nth-of-type(odd)]:float-right` and an even twin, which worked perfectly
      while every photograph was floated: `nth-of-type` counts figures among their siblings and
      ignores the paragraphs between them, so the first went right, the second left, however much
      prose separated them.

      A full-width photograph breaks that, and quietly. It is still a figure, so it still consumes
      an ordinal, and the two wrapped photographs on either side of it both come out on the same
      side. The count moved into `floatSides` above, where it can skip the ones that do not
      participate; the float classes now sit on the figure itself. See `BodyPhoto.tsx`.

      The `after:` clearfix stays and still earns its place — it stops the last float escaping the
      bottom of the article.
    */
    <div
      className={['space-y-6 after:block after:clear-both after:content-[\'\']', className]
        .filter(Boolean)
        .join(' ')}
    >
      <PortableText value={value} components={components} />
    </div>
  )
}
