import type {SchemaTypeDefinition} from 'sanity'

import gallery from './documents/gallery'
import photo from './documents/photo'

export const schemaTypes = [photo, gallery] satisfies SchemaTypeDefinition[]
