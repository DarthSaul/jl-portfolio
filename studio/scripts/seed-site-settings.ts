import {getCliClient} from 'sanity/cli'

import {randomKey} from '../components/orderInputParts'

/**
 * Bring the `siteSettings` and `featuredPage` singletons up to the current schema, filled with
 * what the site showed before each field existed.
 *
 *   SANITY_STUDIO_DATASET=development npx sanity exec scripts/seed-site-settings.ts --with-user-token
 *
 * Authenticates as the logged-in CLI user (`--with-user-token`), so no SANITY_WRITE_TOKEN — the
 * same argument that keeps `promote.mjs` and `migrations/` in `studio/`. The dataset is
 * `sanity.cli.ts`'s, which `requireDataset()` refuses to default: name it on the command line.
 *
 * ## What it seeds
 *
 * The text is the hardcoded copy from `web/src/content/site.ts` at the time `siteSettings` was
 * created, so the live site read exactly the same the moment the app switched over. The gallery
 * order is `gallery.navOrder` turned into a list, sorted the way the old `NAV_QUERY` sorted it —
 * numbered galleries lowest first, ties and numberless ones A–Z — so the menu did not move either.
 * (`migrations/unset-gallery-nav-order` has since deleted those numbers; on a dataset that has
 * been through it, the list seeds A–Z.)
 *
 * **Run it before `migrations/unset-gallery-nav-order`** on any dataset that lacks the document.
 *
 * ## Idempotent, and never overwrites her
 *
 * `createIfNotExists` for each document, then `setIfMissing` per field: a second run changes no
 * content, and a run against a document she has already edited fills only the fields she has
 * never set. (It does bump `_rev` — Sanity commits a revision for a patch that changes nothing.
 * Measured; harmless, but it means "the revision moved" is not evidence the seed wrote.) Writes
 * the published documents directly — the site reads published content, and a draft would leave
 * the site on its fallback until someone pressed Publish.
 *
 * Labels are set by PATH (`navLabels.featured`), not as one `navLabels` object, so a menu item
 * added after the document exists still gets its label without touching the ones she wrote.
 *
 * `menuOrder` is the one field `setIfMissing` cannot extend: it is a list that already exists
 * on a seeded document, and a new item has to be inserted into it. Each page missing from her
 * order goes in after the item that precedes it in `MENU_DEFAULT` — the same rule `orderNav` in
 * `web/src/content/site.ts` applies on read — so Galleries lands beside Front page rather than
 * at the bottom of the menu. The patch carries `ifRevisionID`, so an edit landing between the
 * read and the write fails the run instead of being overwritten.
 *
 * Creating a document and writing strong references to galleries in the same transaction is
 * safe: every gallery already exists. The concurrency rule in CLAUDE.md is about creating the
 * reference *target* in the same run.
 */

const client = getCliClient({apiVersion: '2026-07-31'})

const ORDER_QUERY = `*[_type == "gallery" && defined(slug.current) && !(_id in path("drafts.**"))]
  | order(coalesce(navOrder, 999999) asc, title asc){_id, title, navOrder}`

/** `SITE.nav`'s keys in its default order. Keep in step with `MENU_PAGES` in siteSettings.ts. */
const MENU_DEFAULT = ['start', 'galleries', 'featured', 'copy', 'bio']

const menuItem = (page: string) => ({_type: 'menuItem', _key: page, page})

const SEED = {
  title: 'Joan Lebow',
  byline: 'Staking things out, making a few claims',
  description:
    'Essays, blog posts and street photography from Joan Lebow — a former newspaper ' +
    'reporter with a taste for the wry side of real life.',
  showPortrait: false,
  'navLabels.start': 'Start',
  'navLabels.galleries': 'Galleries',
  'navLabels.featured': 'Featured',
  'navLabels.allShots': 'All Shots',
  'navLabels.copy': 'Copy',
  'navLabels.bio': 'Bio',
  // Stable _keys rather than random ones: one per page, and the schema's initialValue uses the
  // same, so an inserted item can never collide with an existing one.
  menuOrder: MENU_DEFAULT.map(menuItem),
}

/** Her order, with any missing page inserted after its default predecessor. */
function completeMenu(stored: string[]): string[] {
  const order = stored.filter(
    (page, index) => MENU_DEFAULT.includes(page) && stored.indexOf(page) === index,
  )
  MENU_DEFAULT.forEach((page, index) => {
    if (order.includes(page)) return
    order.splice(index === 0 ? 0 : order.indexOf(MENU_DEFAULT[index - 1]) + 1, 0, page)
  })
  return order
}

async function main() {
  const {dataset} = client.config()
  const galleries = await client.fetch<{_id: string; title: string; navOrder?: number}[]>(
    ORDER_QUERY,
  )

  const galleryOrder = galleries.map((gallery) => ({
    _type: 'reference',
    _ref: gallery._id,
    _key: randomKey(),
  }))

  console.log(`Dataset: ${dataset}`)

  const seeded = await client
    .transaction()
    .createIfNotExists({_id: 'siteSettings', _type: 'siteSettings'})
    .patch('siteSettings', (patch) => patch.setIfMissing({...SEED, galleryOrder}))
    // Title and layout only: which photographs it shows is hers to choose, and an empty page
    // renders "No photos here yet." rather than failing.
    .createIfNotExists({_id: 'featuredPage', _type: 'featuredPage', title: 'Featured', preset: 'grid'})
    .commit()
  console.log(`Seeded — transaction ${seeded.transactionId}.`)

  const settings = await client.getDocument<{_rev: string; menuOrder?: {page?: string}[]}>(
    'siteSettings',
  )
  if (!settings) throw new Error('siteSettings vanished between the seed and the menu check.')

  const stored = (settings.menuOrder ?? []).map((item) => item.page ?? '')
  const complete = completeMenu(stored)
  console.log(`Menu order: ${stored.join(', ')} -> ${complete.join(', ')}`)

  if (complete.join() !== stored.join()) {
    await client
      .patch('siteSettings')
      .ifRevisionId(settings._rev)
      .set({menuOrder: complete.map(menuItem)})
      .commit()
    console.log('Menu order updated.')
  }
}

// No catch: an unhandled rejection prints the error and exits non-zero, which is the behaviour
// wanted, and it keeps this file free of Node globals the studio's tsconfig does not type.
void main()
