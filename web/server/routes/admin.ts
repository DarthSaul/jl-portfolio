/**
 * /admin -> the Sanity-hosted Studio.
 *
 * A server route rather than a routeRule so the target resolves at request time:
 * the Studio hostname is not known until `sanity deploy` claims one, and an unset
 * value should produce a legible error instead of a broken build.
 */
export default defineEventHandler((event) => {
  const studioUrl = useRuntimeConfig(event).public.sanityStudioUrl

  if (!studioUrl) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Studio URL is not configured. Set NUXT_PUBLIC_SANITY_STUDIO_URL.',
    })
  }

  // 302, not 301. A permanent redirect gets cached in the editor's browser and is
  // painful to undo if the Studio ever moves or gets embedded. See CLAUDE.md.
  return sendRedirect(event, studioUrl, 302)
})
