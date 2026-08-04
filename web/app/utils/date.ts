/**
 * How every date on the site is written.
 *
 * Lived inside `components/home/FeaturedWriting.vue` until /writing needed the same thing in
 * two more places. Nuxt auto-imports `app/utils/`, so there is nothing to import at the call
 * site — the same arrangement as the components next door.
 *
 * THE TIMEZONE PIN IS LOAD-BEARING. `publishedAt` is a plain `YYYY-MM-DD` date, which
 * `new Date()` reads as UTC midnight. Formatting that in the server's timezone and again in
 * the visitor's lands on different days for anyone west of Greenwich — the server says
 * "July 21", the browser says "July 20", and Vue reports a hydration mismatch on a page that
 * looks fine. Pinning both ends to UTC is what stops that, and it is why this is one shared
 * function rather than a `toLocaleDateString` call at each site.
 */
export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
