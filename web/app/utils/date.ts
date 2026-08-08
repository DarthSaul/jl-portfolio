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

/**
 * The same date with the day dropped — `Jul 2023`.
 *
 * For /writing's ledger, where the date sits in a 128px rail beside the headline rather than
 * under it. At that width the day is precision nobody reads, and it is what pushes the line to
 * wrap.
 *
 * THE TIMEZONE PIN MATTERS MORE HERE THAN ABOVE, for a second reason on top of the hydration
 * mismatch. Dropping the day does not drop the risk of shifting one — it hides it. A
 * `2019-01-01` read west of Greenwich is December 31st *of the previous year*, so an unpinned
 * version of this function prints `Dec 2018` for a piece published in January 2019. Half of
 * what this format says is the year, and that is the half it would get wrong.
 */
export const formatShortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
