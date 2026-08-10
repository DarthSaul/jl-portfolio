import {DocumentsIcon} from '@sanity/icons/Documents'
import {defineField, defineType} from 'sanity'

/**
 * /copy — the wrapper around the list of links.
 *
 * There is no list of articles here on purpose. The page queries every Copy link
 * and shows them newest first, so adding one is a single step: create the link.
 *
 * A singleton. See homePage.ts for how that is enforced.
 */
export default defineType({
  name: 'writingPage',
  title: 'Copy page',
  type: 'document',
  icon: DocumentsIcon,

  fields: [
    defineField({
      name: 'title',
      title: 'Browser tab title',
      type: 'string',
      description: 'Shown in the browser tab and in search results. Not shown on the page.',
      initialValue: 'Copy — Joan Lebow',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'intro',
      title: 'Introduction',
      type: 'text',
      rows: 3,
      description:
        'Optional. A line or two at the top of the page. The links themselves are added ' +
        'under “Copy links” in the sidebar — everything there appears here, newest first.',
      validation: (rule) => rule.max(300).warning('A line or two is plenty here.'),
    }),

    /**
     * The piece that leads the page, if she wants to choose it.
     *
     * **This reverses a decision, deliberately.** The lead used to be whatever she published
     * most recently, chosen by date in GROQ, and `writing/Lead.vue` argued at length that a
     * featured flag was the wrong shape: a second thing to remember on every publish, whose
     * failure mode is a "featured" essay from four years ago sitting above six newer ones,
     * where sorting by date cannot go stale. That reasoning is still correct about what an
     * unattended flag costs. It was simply answering a question she had not asked yet, and she
     * has now asked it.
     *
     * What keeps the old argument's teeth is that this is **one optional field, not a mode**.
     * Empty *means* automatic — there is no "choose the lead: latest / featured" toggle to set
     * inconsistently with the reference beside it, and no way to have a featured piece selected
     * and not used. Leave it alone and the page behaves exactly as it did.
     *
     * A reference and not a boolean on `post`/`article`, for the reason `featuredPhoto.gallery`
     * is a reference and not a typed-in path: exactly one thing can be featured, and a flag
     * spread across two document types has no way to say that. Sanity also refuses to delete a
     * document something references, so the lead cannot silently become a piece that no longer
     * exists.
     */
    defineField({
      name: 'featured',
      title: 'Featured piece',
      type: 'reference',
      to: [{type: 'post'}, {type: 'article'}],
      description:
        'Optional. Pick one piece to lead the page. Leave this empty and whatever you ' +
        'published most recently leads it, which needs no upkeep.',
    }),
  ],

  preview: {
    prepare: () => ({title: 'Copy page'}),
  },
})
