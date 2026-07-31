import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID,
    dataset: process.env.SANITY_STUDIO_DATASET || 'development',
  },

  // `studioHost` is deliberately unset: the first `npm run studio:deploy` prompts
  // for a hostname and writes it here. Once claimed, that hostname is also the
  // value of NUXT_PUBLIC_SANITY_STUDIO_URL.
})
