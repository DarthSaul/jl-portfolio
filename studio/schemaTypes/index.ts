import type {SchemaTypeDefinition} from 'sanity'

import aboutPage from './documents/aboutPage'
import article from './documents/article'
import contactPage from './documents/contactPage'
import gallery from './documents/gallery'
import homePage from './documents/homePage'
import photo from './documents/photo'
import post from './documents/post'
import siteSettings from './documents/siteSettings'
import tag from './documents/tag'
import writingPage from './documents/writingPage'
import featuredPhoto from './objects/featuredPhoto'
import link from './objects/link'
import postPhoto from './objects/postPhoto'
import proseText from './objects/proseText'

export const schemaTypes = [
  // Content
  photo,
  gallery,
  tag,
  post,
  article,

  // One per route, exactly one document each. studio/structure.ts pins their ids and
  // sanity.config.ts keeps them out of the Create menu.
  homePage,
  writingPage,
  aboutPage,
  contactPage,
  siteSettings,

  // Objects
  featuredPhoto,
  link,
  postPhoto,
  proseText,
] satisfies SchemaTypeDefinition[]
