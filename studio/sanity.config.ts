import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {requireDataset} from './dataset'

export default defineConfig({
  name: 'default',
  title: 'Portfolio: Joan Lebow',

  projectId: 'c3808h1v',
  // Required, never defaulted. See ./dataset.ts.
  dataset: requireDataset(),

  plugins: [structureTool(), visionTool()],

  schema: {
    types: schemaTypes,
  },
})
