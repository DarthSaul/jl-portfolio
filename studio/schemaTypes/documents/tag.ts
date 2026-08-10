import {TagIcon} from '@sanity/icons/Tag'
import {defineField, defineType} from 'sanity'

/**
 * A tag is a document now, and that is the whole point: the vocabulary is hers.
 *
 * It used to be `PHOTO_TAGS`, a hardcoded array in photo.ts, and adding a tag meant an edit,
 * a typegen run and a Studio deploy. She asked to add, rename and remove them herself, and
 * nothing about that conflicts with the two rules — a tag is a *topic*, not a layout and not a
 * measurement. Rule 2 is about who decides how a page is arranged, and this decides none of it.
 *
 * ## What the old array warned about, and how both halves inverted
 *
 * The comment it replaces said: adding a tag is free, renaming or removing one is not — the old
 * string stays on every photo already using it, stops matching the list, and its checkbox
 * quietly disappears. Both halves are gone, in opposite directions:
 *
 *  - **Renaming is now free.** The name lives on one document and every photo points at it, so
 *    a rename is one edit and the site follows.
 *  - **Removing is now blocked rather than silent.** These are strong references, so Sanity
 *    refuses to delete a tag that is in use and names the documents using it. She has to take
 *    the tag off the photographs first, which is the right order and is now the only order
 *    available. That guardrail is the single biggest thing this change buys, and it is why the
 *    references are not weak.
 *
 * What still costs something is changing the `slug`. It is the `?tag=` in a shared address and
 * it is what /shots/all filters on, so it is the one field with a URL behind it. Change names
 * freely; leave addresses alone. That is the same bargain `gallery.slug` offers, said the same
 * way in its description.
 *
 * ## Two fields, and no third
 *
 * No colour, no description, no "show in the filter row" toggle, no ordering field. The filter
 * row is built from the tags photographs actually carry, and "does this tag have a page" is
 * still answered by whether a gallery points at it — one fact in one place, rather than a flag
 * here that could disagree with reality. Prefer deleting a knob to documenting it.
 *
 * The cost this change does carry, and it is real: `photo.tags` is a reference array now, so it
 * renders as an "Add item" list rather than the grid of checkboxes it used to be. Tagging a
 * photograph is a click slower. That was weighed and accepted — with a vocabulary this size the
 * picker lists every tag at once — but if it bites across ~250 photographs, the shaped fix is a
 * custom input component on that field which reads these documents and draws the grid back. It
 * is not a plugin and not a dependency.
 */
export default defineType({
  name: 'tag',
  title: 'Tag',
  type: 'document',
  icon: TagIcon,

  fields: [
    defineField({
      name: 'title',
      title: 'Name',
      type: 'string',
      description:
        'How this tag is written on the site — “Mexico 2022”, “South Africa”. Change it ' +
        'whenever you like; every photo using this tag follows.',
      validation: (rule) => [
        rule.required(),
        rule.max(40).warning('Long names crowd the filter row on the All Shots page.'),
      ],
    }),

    defineField({
      name: 'slug',
      title: 'Web address',
      type: 'slug',
      description:
        'The end of this tag’s address, e.g. “mexico-2022” makes ' +
        '/shots/all?tag=mexico-2022. Press Generate to make one from the name. Changing it ' +
        'later breaks any link someone has already shared.',
      // Uniqueness comes from the `slug` type's own per-type check, exactly as gallery.slug
      // relies on it. A custom `isUnique` here would be a second implementation of something
      // already correct.
      options: {source: 'title', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
  ],

  orderings: [
    {name: 'titleAsc', title: 'Name, A–Z', by: [{field: 'title', direction: 'asc'}]},
  ],

  preview: {
    select: {title: 'title', subtitle: 'slug.current'},
  },
})
