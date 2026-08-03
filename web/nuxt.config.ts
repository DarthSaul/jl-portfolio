import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-07-31',
  devtools: { enabled: true },

  modules: ['@nuxtjs/sanity'],

  css: ['~/assets/css/tailwind.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  // The `titleTemplate` is deliberately not here: Nuxt cannot serialise a function into
  // app.head, so it is set with useHead() in app/app.vue instead.
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      meta: [
        {
          name: 'description',
          content:
            'Essays, blog posts and street photography from Joan Lebow — a former '
            + 'newspaper reporter with a taste for the wry side of real life.',
        },
      ],
    },
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
      // Empty until `npm run deploy` in studio/ claims a Studio hostname.
      sanityStudioUrl: '',
    },
  },

  // ISR route rules land here once there is content to cache. See CLAUDE.md.
})
