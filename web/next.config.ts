import type { NextConfig } from 'next'

/**
 * Her words, our internals — see CLAUDE.md. `/copy` and `/bio` were `/writing` and `/about`
 * until she asked for the Squarespace vocabulary back; `/shots/everything` became `/shots/all`, and
 * then every `/shots/*` address became `/gallery/*`.
 * Only the addresses moved; the document types, the queries and the components kept their names.
 *
 * **Temporary, not permanent.** A 308 gets cached in the visitor's browser and is genuinely
 * painful to undo if an address ever moves back. `permanent: false` emits a **307** — Next has
 * no 302 in this shorthand, and the property that matters here (not cached, not a promise about
 * the future) is the same. If a literal 302 is ever needed, the other arm of Next's `Redirect`
 * union takes `statusCode: 302` instead of `permanent`.
 *
 * `/writing/:path*` matches a bare `/writing` too, with a zero-length `path` — and interpolates
 * to `/copy/` with a trailing slash. So the exact rule stays, above it, and wins.
 *
 * The two `/shots` rules are ordered for the same reason: `/shots/everything` must win over the
 * catch-all, or it would land on `/gallery/everything`, a gallery nobody has made. The catch-all
 * is `:path+`, not `:path*`, so a bare `/shots` 404s instead of redirecting to `/gallery/`, which
 * is not a page either.
 */
const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/writing', destination: '/copy', permanent: false },
      { source: '/writing/:path*', destination: '/copy/:path*', permanent: false },
      { source: '/about', destination: '/bio', permanent: false },
      { source: '/shots/everything', destination: '/gallery/all', permanent: false },
      { source: '/shots/:path+', destination: '/gallery/:path+', permanent: false },
    ]
  },
}

export default nextConfig
