import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'c3808h1v',
    dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  },
  deployment: {
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
  },
  typegen: {
    // The Studio owns the schema, so it owns typegen — but the types are consumed
    // by the Nuxt app next door. Reads GROQ from app/queries/*.ts (and any .vue that
    // uses defineQuery) and writes a single generated file into web/.
    path: '../web/app/**/*.{ts,vue}',
    schema: 'schema.json',
    generates: '../web/sanity.types.ts',
    overloadClientMethods: true,
  },
})
