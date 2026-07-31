import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'Portfolio: Joan Lebow',

  projectId: 'c3808h1v',
  // Defaults to production so `sanity deploy` ships the real dataset. Override with
  // SANITY_STUDIO_DATASET=development for local work — see CLAUDE.md: stock content
  // and seed scripts never touch production.
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',

  plugins: [structureTool(), visionTool()],

  schema: {
    types: schemaTypes,
  },
})
