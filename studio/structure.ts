import {CogIcon} from '@sanity/icons/Cog'
import {DocumentsIcon} from '@sanity/icons/Documents'
import {EnvelopeIcon} from '@sanity/icons/Envelope'
import {HomeIcon} from '@sanity/icons/Home'
import {ImageIcon} from '@sanity/icons/Image'
import {ImagesIcon} from '@sanity/icons/Images'
import {LinkIcon} from '@sanity/icons/Link'
import {TagIcon} from '@sanity/icons/Tag'
import {UserIcon} from '@sanity/icons/User'
import type {ComponentType} from 'react'
import type {StructureBuilder, StructureResolver} from 'sanity/structure'

import {PHOTO_TAGS} from './schemaTypes/documents/photo'

/**
 * The document types that exist exactly once.
 *
 * Locking a singleton down takes three separate pieces, and any one on its own leaves a
 * hole:
 *
 *   1. a pinned `documentId` here in the structure, so the Pages list always opens the
 *      same document rather than creating a second one;
 *   2. `document.newDocumentOptions` in sanity.config.ts, so these types never appear in
 *      the global Create menu;
 *   3. `document.actions` in sanity.config.ts, so Delete / Duplicate / Unpublish are not
 *      offered on a document the site expects to be there.
 */
export const SINGLETON_TYPES = new Set([
  'homePage',
  'shotsPage',
  'writingPage',
  'aboutPage',
  'contactPage',
  'siteSettings',
])

/**
 * Pinned to the same date as NUXT_PUBLIC_SANITY_API_VERSION in web/.env.
 *
 * Filtered document lists fall back to a Studio-wide default when this is unset, and
 * `autoUpdates: true` means that default can move underneath us without a deploy. Pin it.
 */
const API_VERSION = '2026-07-31'

/** Every type placed by hand below. Anything missing here falls through to the bottom. */
const PLACED_TYPES = new Set([...SINGLETON_TYPES, 'photo', 'gallery', 'article'])

function singleton(S: StructureBuilder, typeName: string, title: string, icon: ComponentType) {
  return S.listItem()
    .id(typeName)
    .title(title)
    .icon(icon)
    .child(S.document().schemaType(typeName).documentId(typeName).title(title))
}

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Pages')
        .icon(DocumentsIcon)
        .child(
          S.list()
            .title('Pages')
            .items([
              singleton(S, 'homePage', 'Home', HomeIcon),
              singleton(S, 'shotsPage', 'Shots', ImagesIcon),
              singleton(S, 'writingPage', 'Writing', DocumentsIcon),
              singleton(S, 'aboutPage', 'About', UserIcon),
              singleton(S, 'contactPage', 'Contact', EnvelopeIcon),
            ]),
        ),

      S.divider(),

      S.documentTypeListItem('gallery').title('Galleries'),

      S.listItem()
        .title('Photos')
        .icon(ImageIcon)
        .child(
          S.list()
            .title('Photos')
            .items([
              // documentTypeList rather than documentList, so the orderings declared on
              // the photo schema (date taken, place) show up in the sort menu.
              S.listItem()
                .id('allPhotos')
                .title('All photos')
                .icon(ImageIcon)
                .child(
                  S.documentTypeList('photo')
                    .title('All photos')
                    .defaultOrdering([{field: '_createdAt', direction: 'desc'}]),
                ),

              S.listItem()
                .id('untaggedPhotos')
                .title('Not tagged yet')
                .icon(ImageIcon)
                .child(
                  S.documentList()
                    .id('untaggedPhotos')
                    .title('Not tagged yet')
                    .schemaType('photo')
                    .apiVersion(API_VERSION)
                    .filter('_type == "photo" && (!defined(tags) || count(tags) == 0)')
                    .defaultOrdering([{field: '_createdAt', direction: 'desc'}]),
                ),

              S.divider(),

              // One browse list per tag, generated from the vocabulary itself — adding a
              // tag in photo.ts adds its list here with no second edit.
              ...PHOTO_TAGS.map(({title, value}) =>
                S.listItem()
                  .id(`tag-${value}`)
                  .title(title)
                  .icon(TagIcon)
                  .child(
                    S.documentList()
                      .id(`tag-${value}`)
                      .title(title)
                      .schemaType('photo')
                      .apiVersion(API_VERSION)
                      .filter('_type == "photo" && $tag in tags')
                      .params({tag: value})
                      .defaultOrdering([{field: '_createdAt', direction: 'desc'}]),
                  ),
              ),

              // A "not used in any gallery" list is not possible here: documentList
              // filters run per document and do not support joins. That one stays a
              // Vision query.
            ]),
        ),

      S.documentTypeListItem('article').title('Writing links').icon(LinkIcon),

      S.divider(),

      singleton(S, 'siteSettings', 'Site settings', CogIcon),

      // Safety net. A document type added later and never placed above shows up here
      // rather than becoming invisible in the Studio.
      ...S.documentTypeListItems().filter((item) => !PLACED_TYPES.has(item.getId() ?? '')),
    ])
