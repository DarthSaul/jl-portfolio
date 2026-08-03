import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * Rich text, in the smallest useful amount.
 *
 * The house rule is that prose fields are plain `text` — see CLAUDE.md. This is the
 * documented exception, and it exists because her writing carries meaning plain text
 * cannot: italicised book titles, and links out to the things she is talking about.
 *
 * Builds the one block definition both callers share. It is a function rather than a
 * shared constant so each schema type gets its own object, and it takes `styles` because
 * that is the only thing that differs: prose fields here allow one style, a writing post
 * body allows three.
 *
 * THE ARRAYS BELOW REPLACE SANITY'S DEFAULTS RATHER THAN EXTENDING THEM. This is the same
 * trap as the metadata array in photo.ts, and it fails the same quiet way. Omit `styles`
 * and h1–h6 come back. Omit `lists` and bullet and numbered lists come back. Omit
 * `decorators` and code, underline and strike-through come back. The empty `lists: []` is
 * load-bearing, not decoration.
 */
export function proseBlock(styles: {title: string; value: string}[]) {
  return defineArrayMember({
    type: 'block',
    styles,
    lists: [],
    marks: {
      // No underline on purpose. On the web an underline reads as a link, so leaving it
      // out is what stops her making text that looks like one and isn’t.
      decorators: [
        {title: 'Bold', value: 'strong'},
        {title: 'Italic', value: 'em'},
      ],
      annotations: [
        defineArrayMember({
          // Named `hyperlink`, not `link`, so it cannot collide with the registered
          // `link` object type — that one is the label/url pair the Contact page lists,
          // and its required `label` makes no sense here, where the selected text is the
          // label.
          name: 'hyperlink',
          title: 'Link',
          type: 'object',
          fields: [
            defineField({
              name: 'url',
              title: 'Address',
              type: 'url',
              description: 'The full address, starting with https://',
              validation: (rule) => rule.required().uri({scheme: ['http', 'https']}),
            }),
          ],
        }),
      ],
    },
  })
}

/**
 * A few sentences that may need a link or an italic. Used by the front page.
 *
 * One style only: headings are their own fields on the documents that need them, so
 * offering a heading button here would give her two ways to do the same thing.
 */
export default defineType({
  name: 'proseText',
  title: 'Text',
  type: 'array',
  of: [proseBlock([{title: 'Normal', value: 'normal'}])],
})
