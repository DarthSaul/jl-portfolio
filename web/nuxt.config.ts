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

  // `web/sanity.types.ts` sits at the app root, which matches neither `../app/**/*` nor
  // `../*.d.ts` in the tsconfig Nuxt generates — so without this it falls outside the
  // program. That matters more than it looks: typegen runs with `overloadClientMethods`, and
  // the `declare module '@sanity/client'` block it appends is the only thing that maps a
  // query string to its result type. Outside the program the augmentation never applies and
  // every `useSanityQuery` result silently types as `unknown` instead of failing loudly.
  typescript: {
    tsConfig: {
      include: ['../sanity.types.ts'],
    },
  },

  runtimeConfig: {
    public: {
      // Redirect target for /admin, resolved at runtime by server/routes/admin.ts.
      // Empty until `npm run deploy` in studio/ claims a Studio hostname.
      sanityStudioUrl: '',
    },
  },

  // The routes she renamed, kept alive.
  //
  // /writing, /about and /shots/everything were this site's addresses until her words replaced
  // ours — COPY, BIO and ALL SHOTS. Nothing external points at the old three (joanatstake.com
  // is not connected yet), so these are for links already shared out of a preview deploy and
  // for anyone's bookmarks, and they cost three lines.
  //
  // `302`, not `301`, for the reason `/admin` is: a permanent redirect gets cached in a browser
  // and is genuinely annoying to undo. These are temporary in the sense that they can be
  // deleted once nothing has followed them for a while — a `301` would decide that for us.
  //
  // ISR route rules land here too, once there is content to cache. See CLAUDE.md.
  routeRules: {
    '/writing': { redirect: { to: '/copy', statusCode: 302 } },
    '/writing/**': { redirect: { to: '/copy/**', statusCode: 302 } },
    '/about': { redirect: { to: '/bio', statusCode: 302 } },
    '/shots/everything': { redirect: { to: '/shots/all', statusCode: 302 } },
  },
})
