import type {SchemaTypeDefinition} from 'sanity'

import aboutPage from './documents/aboutPage'
import article from './documents/article'
import contactPage from './documents/contactPage'
import gallery from './documents/gallery'
import homePage from './documents/homePage'
import photo from './documents/photo'
import shotsPage from './documents/shotsPage'
import siteSettings from './documents/siteSettings'
import writingPage from './documents/writingPage'
import link from './objects/link'

export const schemaTypes = [
  // Content
  photo,
  gallery,
  article,

  // One per route, exactly one document each. studio/structure.ts pins their ids and
  // sanity.config.ts keeps them out of the Create menu.
  homePage,
  shotsPage,
  writingPage,
  aboutPage,
  contactPage,
  siteSettings,

  // Objects
  link,
] satisfies SchemaTypeDefinition[]
