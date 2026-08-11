import type { NextConfig } from 'next'

/**
 * Her words, our internals — see CLAUDE.md. `/copy` and `/bio` were `/writing` and `/about`
 * until she asked for the Squarespace vocabulary back, and `/shots/all` was `/shots/everything`.
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
 */
const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/writing', destination: '/copy', permanent: false },
      { source: '/writing/:path*', destination: '/copy/:path*', permanent: false },
      { source: '/about', destination: '/bio', permanent: false },
      { source: '/shots/everything', destination: '/shots/all', permanent: false },
    ]
  },
}

export default nextConfig
