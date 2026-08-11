/**
 * /admin -> the Sanity-hosted Studio.
 *
 * A route handler rather than a `redirects()` entry in `next.config.ts` so the target resolves at
 * request time: the Studio hostname is not known until `sanity deploy` claims one, and an unset
 * value should produce a legible error instead of a broken build.
 *
 * **`force-dynamic` is load-bearing.** A GET route handler is statically evaluated at build time
 * by default — it would run once, bake whatever `SANITY_STUDIO_URL` was set during the build into
 * a cached response, and serve that forever. That destroys the one property this file exists for.
 * The symptom would be `/admin` sending her to a stale host with nothing logged.
 */
export const dynamic = 'force-dynamic'

export function GET() {
  const studioUrl = process.env.SANITY_STUDIO_URL

  if (!studioUrl) {
    return new Response('Studio URL is not configured. Set SANITY_STUDIO_URL.', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }

  // 302, not 301/308. A permanent redirect gets cached in the editor's browser and is painful to
  // undo if the Studio ever moves or gets embedded. `NextResponse.redirect` defaults to 307, so
  // the code is stated rather than defaulted. See CLAUDE.md.
  return new Response(null, {
    status: 302,
    headers: { location: studioUrl },
  })
}
