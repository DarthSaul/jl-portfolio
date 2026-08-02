import type {SchemaTypeDefinition} from 'sanity'

import article from './documents/article'
import gallery from './documents/gallery'
import photo from './documents/photo'

export const schemaTypes = [photo, gallery, article] satisfies SchemaTypeDefinition[]
