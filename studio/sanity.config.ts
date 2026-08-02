import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'

import {requireDataset} from './dataset'
import {schemaTypes} from './schemaTypes'
import {SINGLETON_TYPES, structure} from './structure'

/** Actions that make no sense on a document the site expects to always be there. */
const SINGLETON_BLOCKED_ACTIONS = new Set(['delete', 'duplicate', 'unpublish'])

/**
 * Rule 1: one photograph is one record with one alt text. Duplicating a photo makes two
 * records for the same photograph, and their alt texts drift apart the first time she
 * fixes a typo in one of them.
 *
 * Deleting a photo that a gallery references is already blocked by Sanity, so reference
 * integrity needs nothing extra here.
 */
const NO_DUPLICATE_TYPES = new Set(['photo'])

export default defineConfig({
  name: 'default',
  title: 'Portfolio: Joan Lebow',

  projectId: 'c3808h1v',
  // Required, never defaulted. See ./dataset.ts.
  dataset: requireDataset(),

  plugins: [structureTool({structure}), visionTool()],

  schema: {
    types: schemaTypes,
  },

  document: {
    // Keep the singletons out of the global Create menu. Reaching them through Pages is
    // the only way in, and that route is pinned to a fixed document id.
    newDocumentOptions: (prev) =>
      prev.filter((template) => !SINGLETON_TYPES.has(template.templateId)),

    actions: (prev, {schemaType}) =>
      prev.filter((action) => {
        // `action` is undefined on custom and third-party actions. Leave those alone —
        // this filter is only meant to remove specific built-ins.
        if (action.action === undefined) return true
        if (SINGLETON_TYPES.has(schemaType)) return !SINGLETON_BLOCKED_ACTIONS.has(action.action)
        if (NO_DUPLICATE_TYPES.has(schemaType)) return action.action !== 'duplicate'
        return true
      }),
  },
})
