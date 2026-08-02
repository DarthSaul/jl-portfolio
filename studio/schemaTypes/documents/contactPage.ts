import {EnvelopeIcon} from '@sanity/icons/Envelope'
import {defineField, defineType} from 'sanity'

/**
 * /contact — text and links. No form, by design; see the non-goals in CLAUDE.md.
 *
 * The links themselves live on siteSettings, because the same set is used in more
 * than one place. The intro's description says so, because otherwise the obvious
 * place to look for "where do I change my Instagram link" is right here.
 *
 * A singleton. See homePage.ts for how that is enforced.
 */
export default defineType({
  name: 'contactPage',
  title: 'Contact page',
  type: 'document',
  icon: EnvelopeIcon,

  fields: [
    defineField({
      name: 'title',
      title: 'Browser tab title',
      type: 'string',
      description: 'Shown in the browser tab and in search results. Not shown on the page.',
      initialValue: 'Contact — Joan Lebow',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'intro',
      title: 'Introduction',
      type: 'text',
      rows: 4,
      description:
        'Optional. How to get in touch, in your own words. The links themselves — email, ' +
        'Instagram — are edited under “Site settings” at the bottom of the sidebar.',
      validation: (rule) => rule.max(400).warning('Short is better here.'),
    }),
  ],

  preview: {
    prepare: () => ({title: 'Contact page'}),
  },
})
