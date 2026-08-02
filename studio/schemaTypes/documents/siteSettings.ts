import {CogIcon} from '@sanity/icons/Cog'
import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * The handful of things that belong to the whole site rather than one page.
 *
 * A singleton. See homePage.ts for how that is enforced.
 */
export default defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  icon: CogIcon,

  fields: [
    defineField({
      name: 'title',
      title: 'Site name',
      type: 'string',
      description: 'Used when a link to the site is shared, and as a fallback browser tab title.',
      initialValue: 'Joan Lebow',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'description',
      title: 'Site description',
      type: 'text',
      rows: 2,
      description:
        'One sentence describing the site. Shown in search results and when a link is ' +
        'shared. This is not shown anywhere on the site itself.',
      validation: (rule) => [
        rule.required(),
        rule.max(160).warning('Search results cut off after about 160 characters.'),
      ],
    }),

    defineField({
      name: 'shareImage',
      title: 'Sharing image',
      type: 'reference',
      to: [{type: 'photo'}],
      description:
        'The photo shown when someone shares a link to the site. Pick one from your ' +
        'photos — a wide one works best, since it gets cropped to a wide shape by the ' +
        'apps doing the sharing.',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'links',
      title: 'Links shown on the Contact page',
      type: 'array',
      description: 'Email, Instagram, anywhere else. Drag to reorder.',
      of: [defineArrayMember({type: 'link'})],
    }),
  ],

  preview: {
    prepare: () => ({title: 'Site settings'}),
  },
})
