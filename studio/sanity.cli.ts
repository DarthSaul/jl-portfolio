import {defineCliConfig} from 'sanity/cli'
import {requireDataset} from './dataset'

export default defineCliConfig({
  // The claimed hostname → https://joanatstake.sanity.studio
  // Pinned here so deploys stop prompting and can't land on a different host by typo.
  studioHost: 'joanatstake',

  api: {
    projectId: 'c3808h1v',
    // Required, never defaulted. See ./dataset.ts.
    dataset: requireDataset(),
  },
  deployment: {
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
    // The application the first deploy created, pinned for the same reason as `studioHost`
    // above: unpinned, a later deploy prompts for an app id, and the wrong answer creates a
    // *second* application rather than updating this one. The CLI printed this value at the
    // end of that deploy and asked for it to be recorded here.
    appId: 'mvg46t87wy5dtnu0x526ldd9',
  },
  schemaExtraction: {
    // Re-extract schema.json during `sanity dev` and `sanity build`, so a schema edit
    // can't drift from web/sanity.types.ts unnoticed while the dev server is running.
    enabled: true,
    // Turns `validation: (rule) => rule.required()` into a non-optional field in the
    // extracted schema, so photo.alt types as `string` rather than `string | undefined`
    // and SanityPhoto has no fallback branch to write.
    //
    // The documented caveat is that a draft can be invalid, so a required field can
    // still be missing under a preview perspective. That does not apply here: the app
    // reads published content over the CDN, there is no preview token, and visual
    // editing is deferred. REVISIT THIS FLAG the day Presentation lands.
    enforceRequiredFields: true,
  },
  typegen: {
    // The Studio owns the schema, so it owns typegen — but the types are consumed
    // by the Nuxt app next door. Reads GROQ from app/queries/*.ts (and any .vue that
    // uses defineQuery) and writes a single generated file into web/.
    path: '../web/src/**/*.{ts,tsx}',
    schema: 'schema.json',
    generates: '../web/sanity.types.ts',
    overloadClientMethods: true,
  },
})
