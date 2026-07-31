import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'

export default defineConfig({
  name: 'default',
  title: 'JL Portfolio',

  projectId: process.env.SANITY_STUDIO_PROJECT_ID!,
  dataset: process.env.SANITY_STUDIO_DATASET || 'development',

  // basePath stays at the root: the deployed Studio is served from its own
  // host (<host>.sanity.studio), not from /admin on the Nuxt site.

  plugins: [structureTool()],

  schema: {
    // Intentionally empty. Phase 1 only confirms the Studio builds, deploys,
    // and accepts a login. Content schemas come next — see CLAUDE.md Rule 1
    // before adding any (photos are standalone documents; galleries reference them).
    types: [],
  },
})
