import {CogIcon} from '@sanity/icons/Cog'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {GalleryOrderInput} from '../../components/GalleryOrderInput'
import {excludeAlreadyChosen} from '../photoPicker'

/**
 * The top-level items in the menu, in their default order. Four are pages; Galleries is the
 * heading the galleries are listed under, and opens and closes that list rather than linking.
 * The `value`s are the keys of `SITE.nav` in `web/src/content/site.ts`, which owns the routes;
 * the titles match the `navLabels` fields below, so each item is called the same thing in both
 * places.
 */
const MENU_PAGES = [
  {value: 'start', title: 'Front page', subtitle: undefined},
  {value: 'galleries', title: 'Galleries', subtitle: 'Opens to list your galleries and All Shots'},
  {value: 'featured', title: 'Featured', subtitle: undefined},
  {value: 'copy', title: 'Writing', subtitle: undefined},
  {value: 'bio', title: 'About you', subtitle: undefined},
]

/**
 * The handful of things that belong to the whole site rather than one page.
 *
 * A singleton. See homePage.ts for how that is enforced.
 *
 * Everything in the sidebar that is words rather than structure reads from here: the site
 * name, the byline, the menu labels, the order of the top-level menu items, and the order of the
 * galleries under Galleries. The routes those labels point at stay in code
 * (`web/src/content/site.ts`) — she names and orders the pages, she does not create or remove
 * them. The app keeps a fallback copy of the text for
 * when this document cannot be read; see `web/src/sanity/siteSettings.ts`.
 */
export default defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  icon: CogIcon,

  groups: [
    {name: 'site', title: 'Site', default: true},
    {name: 'menu', title: 'Menu'},
  ],

  fields: [
    defineField({
      name: 'title',
      title: 'Site name',
      type: 'string',
      group: 'site',
      description:
        'Your name at the top of the sidebar. Also used in the browser tab and when a link ' +
        'to the site is shared.',
      initialValue: 'Joan Lebow',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'byline',
      title: 'Byline',
      type: 'string',
      group: 'site',
      description:
        'The line under your name in the sidebar, on every page. Type it normally — the site ' +
        'puts it in capitals for you.',
      // Sentence case on purpose: the sidebar uppercases it in CSS, and text stored in capitals
      // cannot be un-shouted by a stylesheet if the design ever changes.
      initialValue: 'Staking things out, making a few claims',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'description',
      title: 'Site description',
      type: 'text',
      rows: 2,
      group: 'site',
      description:
        'One sentence describing the site. Shown in search results and when a link is ' +
        'shared. This is not shown anywhere on the site itself.',
      validation: (rule) => [
        rule.required(),
        rule.max(160).warning('Search results cut off after about 160 characters.'),
      ],
    }),

    defineField({
      name: 'showPortrait',
      title: 'Show the illustrated portrait in the sidebar',
      type: 'boolean',
      group: 'site',
      description: 'The drawing of you at the bottom of the sidebar. Off hides it.',
      initialValue: false,
    }),

    defineField({
      name: 'shareImage',
      title: 'Sharing image',
      type: 'reference',
      to: [{type: 'photo'}],
      group: 'site',
      description:
        'The photo shown when someone shares a link to the site. Pick one from your ' +
        'photos — a wide one works best, since it gets cropped to a wide shape by the ' +
        'apps doing the sharing.',
      // Recommended, not required — and spelled as a custom rule rather than
      // `required().warning()`, because typegen reads `required()` and would type the field as
      // always present. See CLAUDE.md. A hard `required()` here would also stop her publishing
      // a label change until she had picked a sharing photo, which nothing renders yet.
      validation: (rule) =>
        rule
          .custom((value) => (value ? true : 'Pick a photo for link previews when you can.'))
          .warning(),
    }),

    defineField({
      name: 'links',
      title: 'Links shown on the Contact page',
      type: 'array',
      group: 'site',
      description: 'Email, Instagram, anywhere else. Drag to reorder.',
      of: [defineArrayMember({type: 'link'})],
    }),

    defineField({
      name: 'navLabels',
      title: 'Menu labels',
      type: 'object',
      group: 'menu',
      description:
        'The words in the site menu. Type them normally — the site puts them in capitals for ' +
        'you. This changes the words only; the pages they lead to stay the same.',
      // Stored sentence case so assistive tech reads "Copy" rather than spelling C-O-P-Y; the
      // capitals are a class in SiteNavList, beside the text it changes.
      fields: [
        defineField({
          name: 'start',
          title: 'Front page',
          type: 'string',
          initialValue: 'Start',
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'galleries',
          title: 'Galleries',
          type: 'string',
          description:
            'The heading your galleries are listed under. Click it on the site to open or ' +
            'close the list. “Images” or “Photos” work too.',
          initialValue: 'Galleries',
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'featured',
          title: 'Featured',
          type: 'string',
          description: 'Leads to your Featured page.',
          initialValue: 'Featured',
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'allShots',
          title: 'Every photo',
          type: 'string',
          description: 'The last item under the galleries, leading to all your photos.',
          initialValue: 'All Shots',
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'copy',
          title: 'Writing',
          type: 'string',
          initialValue: 'Copy',
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'bio',
          title: 'About you',
          type: 'string',
          initialValue: 'Bio',
          validation: (rule) => rule.required(),
        }),
      ],
    }),

    defineField({
      name: 'menuOrder',
      title: 'Menu order',
      type: 'array',
      group: 'menu',
      description:
        'Drag to set the order of the main items in the menu. Your galleries and All Shots ' +
        'stay listed under Galleries wherever it goes.',
      // The pages are ours and the order is hers — so this is a list she can only drag. No add,
      // no remove, no duplicate: a menu missing Bio, or with Copy twice, is not a choice she
      // should be one mis-click from. The site enforces the same thing again on read (unknown
      // or repeated pages dropped, missing ones appended in the default order), because a
      // pasted or half-edited value can still get past a Studio control.
      options: {
        disableActions: ['add', 'addBefore', 'addAfter', 'remove', 'duplicate', 'copy'],
      },
      of: [
        defineArrayMember({
          name: 'menuItem',
          title: 'Menu item',
          type: 'object',
          fields: [
            defineField({
              name: 'page',
              title: 'Page',
              type: 'string',
              // Fixed: which page an item is never changes, only where it sits.
              readOnly: true,
              options: {list: MENU_PAGES.map(({value, title}) => ({value, title}))},
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: {page: 'page'},
            prepare: ({page}) => {
              const entry = MENU_PAGES.find((p) => p.value === page)
              return {title: entry?.title ?? 'Unknown page', subtitle: entry?.subtitle}
            },
          },
        }),
      ],
      initialValue: MENU_PAGES.map(({value}) => ({_type: 'menuItem', _key: value, page: value})),
      validation: (rule) =>
        rule.custom((items: {page?: string}[] | undefined) => {
          const pages = (items ?? []).map((item) => item.page)
          const complete =
            pages.length === MENU_PAGES.length &&
            MENU_PAGES.every(({value}) => pages.filter((p) => p === value).length === 1)
          return complete || 'The menu needs each of these items exactly once.'
        }),
    }),

    defineField({
      name: 'galleryOrder',
      title: 'Gallery order',
      type: 'array',
      group: 'menu',
      description:
        'Drag to set the order your galleries appear in the menu, under Galleries. ' +
        'Galleries you haven’t placed are listed underneath and appear after these, A–Z.',
      // Without this the field shows only the placed galleries, and a new one is invisible
      // here while still appearing on the site. See the component.
      components: {input: GalleryOrderInput},
      of: [
        defineArrayMember({
          // Strong, like `photo.tags`: deleting a gallery that is in the menu is refused, and
          // Sanity names Site settings as the reason — rather than a weak reference leaving a
          // broken row in this list that she has to work out how to clear.
          type: 'reference',
          to: [{type: 'gallery'}],
          // Ergonomics only — `unique()` below is the guarantee. On the MEMBER, always.
          options: {filter: excludeAlreadyChosen},
        }),
      ],
      validation: (rule) => rule.unique().error('That gallery is already in the list.'),
    }),
  ],

  preview: {
    prepare: () => ({title: 'Site settings'}),
  },
})
