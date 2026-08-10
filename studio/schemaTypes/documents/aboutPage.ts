import {UserIcon} from '@sanity/icons/User'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {proseBlock} from '../objects/proseText'

/**
 * /bio — her bio: an opening line, then a few paragraphs with photographs among them.
 *
 * Called "Bio" in the Studio and in the sidebar, because that is the word in her nav. It was
 * "Bio", then "About", and is "Bio" again; the rule behind all three is the same and is the
 * only part worth remembering: the label follows her word, and nothing underneath it moves.
 * The type is still `aboutPage`, the query is still `ABOUT_QUERY`, and only the route went
 * with the label — renaming a document type is a content migration, and three names cost
 * nothing as long as the one she reads is hers.
 *
 * ## The heading and introduction came from the front page
 *
 * `introHeading` and `intro` were `homePage`'s and opened the site; they now open this page
 * instead. They are a *separate* field pair rather than the first two blocks of `body` on
 * purpose: the intro is set larger and is not part of the running prose, and folding it into
 * the body would mean the first paragraph rendering differently from the rest for reasons
 * invisible in the editor.
 *
 * ## Why the body is the same shape as a writing post
 *
 * It holds prose with photographs between the paragraphs, which is exactly what `post.body`
 * is, so it is built from the same two pieces — `proseBlock` for the text and `postPhoto` for
 * a photograph. The renderer on the Nuxt side is shared for the same reason.
 *
 * That is also why **there is no longer a `portrait` field**. This page used to be a plain
 * `text` body plus one required photo reference pinned outside it, which left the component
 * deciding where the portrait sat. With photographs inside the body she places them by typing
 * around them, and a separate field would be a second way to do the same thing — the kind of
 * knob CLAUDE.md says to delete rather than document. Nothing is lost: a photo first in the
 * body is a portrait at the top of the page.
 *
 * That decision is also the reason the intro above arrived as two fields and a photograph did
 * not. `/bio` briefly rendered one below the body, read across from `homePage.introPhoto`
 * because the front page had stopped showing it. That field and that cross-document read are
 * both gone: photographs on this page come from the body, and there is nothing else to reach
 * for. See the note in `queries/about.ts`.
 *
 * ## One style, not three
 *
 * `post.body` allows a subheading and a pulled-out quote because her essays use them. A bio
 * is a few paragraphs about a person, so this starts at `normal` alone. That direction is the
 * cheap one: adding a style later costs a line, while removing one she has already used
 * leaves blocks in the document whose style no longer matches the list. Add one when a bio
 * actually needs it, not in advance.
 *
 * This used to cite `PHOTO_TAGS` as the same asymmetry, and that comparison has expired: tags
 * are documents now, so removing one is blocked rather than silently destructive. The block
 * `styles` list is still a hardcoded array and still carries the old asymmetry, which is
 * exactly why it is worth naming here rather than leaning on a neighbour that has moved on.
 *
 * A singleton. See homePage.ts for how that is enforced.
 */
export default defineType({
  name: 'aboutPage',
  title: 'Bio page',
  type: 'document',
  icon: UserIcon,

  fields: [
    defineField({
      name: 'title',
      title: 'Browser tab title',
      type: 'string',
      description: 'Shown in the browser tab and in search results. Not shown on the page.',
      initialValue: 'Bio — Joan Lebow',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'introHeading',
      title: 'Heading',
      type: 'string',
      description:
        'Optional. The large line at the top of the page. Leave it empty and the ' +
        'introduction simply starts on its own.',
    }),

    defineField({
      name: 'intro',
      title: 'Introduction',
      type: 'proseText',
      description: 'A few sentences under the heading, set larger than the writing below.',
    }),

    defineField({
      name: 'body',
      title: 'About you',
      type: 'array',
      description:
        'A few paragraphs. Use the Insert button to put a photo between them — its ' +
        'description comes from the photo itself, so fixing it there fixes it everywhere.',
      of: [
        proseBlock([{title: 'Normal', value: 'normal'}]),

        // RULE 1. A photograph here is a reference to a photo document, exactly as in a
        // writing post and in a gallery. `postPhoto` is shared rather than copied: the object
        // is named for where it first appeared, not for what it can hold, and a second
        // identical type would be a second thing to keep in step. See objects/postPhoto.ts.
        defineArrayMember({type: 'postPhoto'}),
      ],
      // No `unique()`, for the same reason post.body has none: it compares members ignoring
      // `_key`, so on an array that is mostly prose it would reject a bio that happens to use
      // the same short sentence twice.
      validation: (rule) => rule.required().min(1).error('The bio needs something on it.'),
    }),
  ],

  preview: {
    prepare: () => ({title: 'Bio page'}),
  },
})
