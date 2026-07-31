import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-07-31',
  devtools: { enabled: true },

  modules: ['@nuxtjs/sanity'],

  css: ['~/assets/css/tailwind.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  // @nuxtjs/sanity merges these onto runtimeConfig.public.sanity, which is what
  // makes the NUXT_PUBLIC_SANITY_* names in .env.example work as runtime overrides.
  // The values below are build-time defaults, not the source of truth.
  sanity: {
    projectId: process.env.NUXT_PUBLIC_SANITY_PROJECT_ID || '',
    dataset: process.env.NUXT_PUBLIC_SANITY_DATASET || 'development',
    apiVersion: process.env.NUXT_PUBLIC_SANITY_API_VERSION || '2026-07-31',
    useCdn: true,
  },

  runtimeConfig: {
    public: {
      // Redirect target for /admin, resolved at runtime by server/routes/admin.ts.
      // Empty until `npm run studio:deploy` claims a Studio hostname.
      sanityStudioUrl: '',
    },
  },

  // ISR route rules land here once there is content to cache. See CLAUDE.md.
})
