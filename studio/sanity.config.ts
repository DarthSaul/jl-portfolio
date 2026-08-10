import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'

import {requireDataset} from './dataset'
import {schemaTypes} from './schemaTypes'
import {SINGLETON_TYPES, structure} from './structure'

/** Actions that make no sense on a document the site expects to always be there. */
const SINGLETON_BLOCKED_ACTIONS = new Set(['delete', 'duplicate', 'unpublish'])

/**
 * Types whose whole job is to be *the* record for one thing, so a second copy is never what
 * she meant. Duplicate is removed from both.
 *
 * `photo` is Rule 1: one photograph is one record with one alt text, and two records for the
 * same photograph drift apart the first time she fixes a typo in one of them.
 *
 * `tag` is the same shape of mistake with a different symptom. Duplicate copies the slug
 * verbatim, so two tag documents end up claiming one web address: the filter row on /shots/all
 * shows the same word twice, each showing half the photographs, and **nothing errors** — the
 * slug's uniqueness check runs on the document she is editing, not on the copy Duplicate made
 * for her. A tag is cheap to create from scratch and there is nothing on one worth copying.
 *
 * Deleting a photo or a tag that something references is already blocked by Sanity, so
 * reference integrity needs nothing extra here.
 */
const NO_DUPLICATE_TYPES = new Set(['photo', 'tag'])

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
