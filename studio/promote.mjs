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
 * The preflight below is the tripwire for exactly that, and it is not a formality: a document
 * she creates in the deployed Studio exists in `production` and nowhere else, so it shows up
 * as a production-only id and this script refuses to run. Do not reach for a --force flag when
 * that happens — it means the handover has already happened and the direction of travel has
 * reversed permanently.
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
 * Every document id in a dataset, drafts included.
 *
 * Anonymous — both datasets are `public`, so this needs no token and no CLI session. The `raw`
 * perspective matters: a draft Joan has not published yet is still work that exists only in
 * `production`, and it has to count for the preflight below.
 */
async function documentIds(dataset) {
  const url =
    `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${dataset}` +
    `?query=${encodeURIComponent('*[]{_id}')}&perspective=raw`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Could not read ${dataset}: HTTP ${response.status} ${response.statusText}`)
  }

  const {result} = await response.json()
  return new Set(result.map((doc) => doc._id))
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

const [sourceIds, targetIds] = await Promise.all([documentIds(SOURCE), documentIds(TARGET)])

const orphaned = [...targetIds].filter((id) => !sourceIds.has(id)).sort()
const creating = [...sourceIds].filter((id) => !targetIds.has(id)).sort()
const overwriting = [...sourceIds].filter((id) => targetIds.has(id))

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
console.log(`\n  ${overwriting.length} document(s) will be replaced wholesale.`)
console.log(`  0 document(s) will be deleted — import never deletes.\n`)

// Both counts partition the source, so both being zero means the source is empty. An empty
// source with a non-empty target is caught by the orphan check above, not here.
if (sourceIds.size === 0) {
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

// --replace maps to createOrReplace. Without it the default operation is `create`, which fails
// outright on the first colliding id — immediately, since every id in the target is also in the
// source. --missing is the opposite mistake: it would create the new documents and skip every
// existing one, so edits to content already in the target would never land.
console.log(`\nImporting into ${TARGET}\n`)
sanity('dataset', 'import', payload, '--dataset', TARGET, '--replace')

console.log(`\nPromoted. ${TARGET} now mirrors ${SOURCE}.`)
console.log(`Backup of the previous ${TARGET}: ${backup}\n`)
