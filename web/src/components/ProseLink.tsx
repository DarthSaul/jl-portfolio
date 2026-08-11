import type { PortableTextMarkComponentProps } from '@portabletext/react'

/**
 * The `hyperlink` annotation from `proseText`, rendered.
 *
 * Named `hyperlink` in the schema rather than `link` so it cannot collide with the registered
 * `link` object type — see studio/schemaTypes/objects/proseText.ts. That name is what the `marks`
 * map in `ProseText` and `ProseBody` keys on, so the two have to stay in step.
 *
 * The props type is imported rather than hand-written because a mark component is handed `text`,
 * `markType` and `renderNode` alongside the annotation itself, and declaring only the bit we use
 * makes the component unassignable to the `components` map.
 *
 * Underline is deliberate here and deliberately absent from the editor's toolbar: the one thing on
 * the page allowed to look like a link is a link.
 *
 * ## The blue
 *
 * This is the only consumer of `--color-link`, and it should stay that way. DESIGN.md is a strict
 * black-and-white duet with exactly one chromatic exception, and it scopes that exception tightly:
 * the blue is "used only inside long-form article body copy, never on UI buttons or navigation".
 * So it lives on the annotation that only appears inside prose.
 *
 * `ProseHeading` is the one caller that can reach this from outside running prose — it renders
 * `homePage.featuredTitle`, which is `proseText` and can carry a link. That field is not rendered
 * anywhere at the moment; whatever component picks it up needs to neutralise both the colour and
 * the underline.
 */
export function ProseLink({
  value,
  children,
}: PortableTextMarkComponentProps<{ _type: 'hyperlink', _key: string, url?: string }>) {
  return (
    <a
      href={value?.url}
      target="_blank"
      rel="noopener"
      className="text-link underline underline-offset-2 transition-colors hover:text-ink"
    >
      {children}
    </a>
  )
}
