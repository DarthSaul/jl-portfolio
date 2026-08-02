import {defineField, defineType} from 'sanity'

/**
 * A labelled link. Used only by siteSettings.links, which is what the Contact page
 * shows. Kept as its own object type so the label/url pair has one definition.
 */
export default defineType({
  name: 'link',
  title: 'Link',
  type: 'object',

  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      description: 'What the link says, e.g. “Instagram” or “Email”.',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'url',
      title: 'Address',
      type: 'url',
      description: 'A web address starting with https://, or an email as mailto:you@example.com',
      // mailto is allowed on purpose: /contact is text and links, and her email address
      // is one of them. There is no contact form — see the non-goals in CLAUDE.md.
      validation: (rule) => rule.required().uri({scheme: ['http', 'https', 'mailto']}),
    }),
  ],

  preview: {
    select: {title: 'label', subtitle: 'url'},
  },
})
