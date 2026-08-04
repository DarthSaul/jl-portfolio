#!/usr/bin/env node
/**
 * Promote `development` to `production`.
 *
 * Content is authored in `development` — that is the dataset `sanity dev` and `npm run dev`
 * point at, and the one anyone types into. `production` is a mirror of it, refreshed by this
 * script. See the *Datasets* section of CLAUDE.md for why that is the arrangement.
 *
 * Both dataset names are pinned below rather than taken as arguments. CLAUDE.md requires that
 * anything writing to a dataset name it explicitly, and there is exactly one legal direction
 * here — a flag would only add a way to run it backwards.
 *
 * ## This script has an expiry date
 *
 * The deployed Studio at joanatstake.sanity.studio writes to `production`. This script
 * overwrites `production`. Those two facts collide the day Joan starts editing, and from then
 * on a promote destroys her work.
 *
 * The preflight below is the tripwire for exactly that, and it works in two halves because the
 * two failures are not the same shape. A document she *creates* exists in `production` and
 * nowhere else, so it is a production-only id and this script refuses outright. A document she
 * *edits* — the likelier first move, since the singletons are pinned and can only be edited —
 * leaves the id set untouched, so it can only be surfaced as a content difference and judged
 * by a human. Neither is a --force away from being ignored: a production-only id means the
 * handover has happened and the direction of travel has reversed permanently.
 *
 * ## Why it lives here and not in scripts/
 *
 * `studio/` is where the Sanity CLI is installed and where sanity.cli.ts supplies the project
 * id. It also needs no SANITY_WRITE_TOKEN — `dataset export` and `dataset import` authenticate
 * as the logged-in CLI user, so this reads and writes real content without the repo-root `.env`
 * existing at all.
 *
 * ## Usage
 *
 *   npm run promote -- --dry-run    report what would change, touch nothing
 *   npm run promote                 report, confirm at the prompt, then do it
 *   npm run promote -- --yes        skip the prompt (CI, or a repeat run)
 */
import {execFileSync} from 'node:child_process'
import {existsSync, mkdirSync} from 'node:fs'
import {createInterface} from 'node:readline/promises'
import {fileURLToPath} from 'node:url'

const SOURCE = 'development'
const TARGET = 'production'

/**
 * Hardcoded for the same reason it is hardcoded in sanity.config.ts and sanity.cli.ts: it is
 * public, and this repo only ever talks to one project. The API version is pinned to match
 * NUXT_PUBLIC_SANITY_API_VERSION and the one in structure.ts — an unpinned version can move
 * underneath us, and a preflight that silently changes behaviour is worse than none.
 */
const PROJECT_ID = 'c3808h1v'
const API_VERSION = '2026-07-31'

const WORK_DIR = fileURLToPath(new URL('.promote/', import.meta.url))
const CLI = fileURLToPath(new URL('node_modules/.bin/sanity', import.meta.url))

const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const assumeYes = args.has('--yes')

/**
 * Anonymous read. Both datasets are `public`, which means "everyone can query for content
 * without being authorized" — there is no draft carve-out, and document-level access control
 * is a separate paid feature this project does not use. So `perspective=raw` returns drafts
 * and `versions.*` release documents to an unauthenticated caller, which is what the preflight
 * needs: a draft Joan has not published is still work that exists only in `production`.
 *
 * Verified rather than assumed — `perspective=drafts` answers 200 anonymously here, with no
 * auth challenge. Do not "fix" this by adding a token; it would buy nothing and give the
 * preflight a credential to depend on.
 */
async function query(dataset, groq) {
  const url =
    `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${dataset}` +
    `?query=${encodeURIComponent(groq)}&perspective=raw`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Could not read ${dataset}: HTTP ${response.status} ${response.statusText}`)
  }

  const {result, error} = await response.json()
  if (error) throw new Error(`Could not read ${dataset}: ${error.description ?? error}`)
  return result
}

/**
 * Ids of everything, plus the full content of everything that is not an asset.
 *
 * Asset documents are deliberately fetched id-only. Their ids are content hashes, so a shared
 * id already proves the bytes match — comparing them would be a tautology paid for in
 * megabytes, and asset metadata (lqip, palette) is where the weight in this dataset lives.
 */
const SNAPSHOT = `{
  "ids": *[]._id,
  "docs": *[!(_type in ["sanity.imageAsset", "sanity.fileAsset"])]
}`

/** Fields the Content Lake rewrites on every write. Comparing them would flag everything. */
const VOLATILE = new Set(['_rev', '_createdAt', '_updatedAt'])

/** Key-order-independent JSON, so two equal documents always produce the same string. */
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => !VOLATILE.has(key))
        .sort()
        .map((key) => [key, canonical(value[key])]),
    )
  }
  return value
}

async function snapshot(dataset) {
  const {ids, docs} = await query(dataset, SNAPSHOT)
  return {
    ids: new Set(ids),
    content: new Map(docs.map((doc) => [doc._id, JSON.stringify(canonical(doc))])),
  }
}

function sanity(...cliArgs) {
  if (!existsSync(CLI)) {
    throw new Error(`Sanity CLI not found at ${CLI}. Run \`npm ci\` in studio/ first.`)
  }

  // sanity.cli.ts calls requireDataset() at module load, which throws when
  // SANITY_STUDIO_DATASET is unset — even for a command that names both of its datasets
  // explicitly on the command line. So it is pinned here rather than inherited, which also
  // means the promote does not depend on studio/.env existing. The value is irrelevant to
  // every command below; `development` is the honest one because it is the source.
  execFileSync(CLI, cliArgs, {
    cwd: fileURLToPath(new URL('.', import.meta.url)),
    stdio: 'inherit',
    env: {...process.env, SANITY_STUDIO_DATASET: SOURCE},
  })
}

const [source, target] = await Promise.all([snapshot(SOURCE), snapshot(TARGET)])

const orphaned = [...target.ids].filter((id) => !source.ids.has(id)).sort()
const creating = [...source.ids].filter((id) => !target.ids.has(id)).sort()

// Of the documents present in both, the ones whose content actually differs. Assets are absent
// from `content` by construction, so they never appear here — see the note on SNAPSHOT.
const changing = [...source.content.keys()]
  .filter((id) => target.content.has(id) && target.content.get(id) !== source.content.get(id))
  .sort()

const unchanged = source.ids.size - creating.length - changing.length

console.log(`\n${SOURCE} → ${TARGET}\n`)

if (orphaned.length > 0) {
  console.error(
    `Refusing to promote: ${orphaned.length} document(s) exist in ${TARGET} but not in ` +
      `${SOURCE}.\n\n` +
      orphaned.map((id) => `  ${id}`).join('\n') +
      `\n\nThat means ${TARGET} has been edited directly — almost certainly through the ` +
      `deployed\nStudio, which writes there. Promoting would overwrite whatever else was ` +
      `changed in the\nsame session. See the expiry note at the top of this file: from here ` +
      `the content moves\nthe other way, and ${SOURCE} is the copy that needs updating.\n`,
  )
  process.exit(1)
}

console.log(`  ${creating.length} document(s) will be created${creating.length > 0 ? ':' : '.'}`)
for (const id of creating) console.log(`      ${id}`)
console.log(
  `\n  ${changing.length} document(s) will be replaced with different content` +
    `${changing.length > 0 ? ':' : '.'}`,
)
for (const id of changing) console.log(`      ${id}`)
console.log(`\n  ${unchanged} document(s) are already identical.`)
console.log(`  0 document(s) will be deleted — import never deletes.\n`)

if (changing.length > 0) {
  // The id check above catches a document Joan *created*. It cannot catch one she *edited*,
  // and editing is the likelier first move — the singletons are pinned, so Home and Bio can
  // only ever be edited, never created. This list is what closes that gap, and closing it
  // takes a human: a document differing because `development` changed is the whole point of
  // promoting, and one differing because `production` changed is the thing to stop for. The
  // two are indistinguishable from content alone.
  console.log(
    `  Read that list before continuing. Anything on it that you did not edit in ${SOURCE}\n` +
      `  was edited in ${TARGET} directly, and promoting will destroy it.\n`,
  )
}

// `creating` and `changing` are both subsets of the source, so an empty source means an empty
// promote. A non-empty target with an empty source is caught by the orphan check above.
if (source.ids.size === 0) {
  console.log(`${SOURCE} holds no documents. Nothing to promote.\n`)
  process.exit(0)
}

if (dryRun) {
  console.log('--dry-run: stopping here, nothing was written.\n')
  process.exit(0)
}

if (!assumeYes) {
  const rl = createInterface({input: process.stdin, output: process.stdout})
  const answer = await rl.question(`Promote ${SOURCE} over ${TARGET}? [y/N] `)
  rl.close()
  if (answer.trim().toLowerCase() !== 'y') {
    console.log('Aborted.\n')
    process.exit(0)
  }
}

mkdirSync(WORK_DIR, {recursive: true})

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backup = `${WORK_DIR}${TARGET}-before-${stamp}.tar.gz`
const payload = `${WORK_DIR}${SOURCE}.tar.gz`

// Back up the target first. `import --replace` is a wholesale document replace and there is no
// undo, so this is the only thing standing between a mistake and a rebuild by hand. Note it is
// not a full rollback: re-importing it restores what was overwritten but cannot remove what was
// created, because import never deletes.
console.log(`\nBacking up ${TARGET} → ${backup}\n`)
sanity('dataset', 'export', TARGET, backup)

// No --raw. Asset CDN URLs are dataset-scoped (/images/<projectId>/<dataset>/...), so a raw
// export re-imported into a sibling dataset fails with "Asset has different target than source".
// A plain export bundles the binaries and rewrites the references to match the destination.
//
// No --no-drafts either. Drafts are included by default, and that flag would also strip
// versions.* release documents — silently discarding in-progress Studio work.
console.log(`\nExporting ${SOURCE} → ${payload}\n`)
sanity('dataset', 'export', SOURCE, payload, '--overwrite')

// Re-run the cheap half of the preflight immediately before writing.
//
// This narrows the window between check and write; it does not close it. Sanity has no
// dataset-level lock, and `dataset import` does not take per-document `ifRevisionID`, so a
// write landing in `production` *during* the import can still be overwritten. There is no
// version of this script that can promise otherwise, and the docs must not claim it does.
// What this does buy is real: the confirmation prompt, the backup and the export together can
// take minutes, and a write arriving in that stretch is now caught rather than silently lost.
const latest = await query(TARGET, '*[]._id')
const appeared = latest.filter((id) => !source.ids.has(id)).sort()
if (appeared.length > 0) {
  console.error(
    `\nAborting before import: ${appeared.length} document(s) appeared in ${TARGET} since the ` +
      `preflight.\n\n` +
      appeared.map((id) => `  ${id}`).join('\n') +
      `\n\n${TARGET} is being written to right now. Nothing was imported; the backup above is ` +
      `intact.\n`,
  )
  process.exit(1)
}

// --replace maps to createOrReplace. Without it the default operation is `create`, which fails
// outright on the first colliding id — immediately, since every id in the target is also in the
// source. --missing is the opposite mistake: it would create the new documents and skip every
// existing one, so edits to content already in the target would never land.
console.log(`\nImporting into ${TARGET}\n`)
sanity('dataset', 'import', payload, '--dataset', TARGET, '--replace')

console.log(`\nPromoted. ${TARGET} now mirrors ${SOURCE}.`)
console.log(`Backup of the previous ${TARGET}: ${backup}\n`)
