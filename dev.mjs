#!/usr/bin/env node
// `npm run dev` from the repo root: install each package if its dependencies are missing or
// stale, then run the Next app (:3000) and the Studio (:3333) side by side with prefixed output.
// Ctrl-C stops both; if either exits, the other is stopped too.
//
// Deliberately dependency-free (no `concurrently`, no workspaces): web/ and studio/ keep their
// own package.json and node_modules, and this file only shells out to `npm` in each.

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = import.meta.dirname

// `portVar` is the variable each dev server reads its port from: Next reads `PORT` from the
// shell only (not .env); Sanity reads `SANITY_STUDIO_SERVER_PORT` from the shell or studio/.env.
const PACKAGES = [
  { name: 'web', color: 36, datasetVar: 'SANITY_DATASET', portVar: 'PORT', portFromEnvFile: false, defaultPort: 3000 },
  { name: 'studio', color: 35, datasetVar: 'SANITY_STUDIO_DATASET', portVar: 'SANITY_STUDIO_SERVER_PORT', portFromEnvFile: true, defaultPort: 3333 },
]

const readEnvVar = (source, name) =>
  source.match(new RegExp(`^${name}=(.*)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '') || undefined

const fail = (msg) => {
  console.error(`\n✖ ${msg}\n`)
  process.exit(1)
}

// --- Preflight: each package needs its own .env (see CLAUDE.md, "Environment variables"). ---

for (const pkg of PACKAGES) {
  const envFile = join(root, pkg.name, '.env')
  if (!existsSync(envFile)) fail(`${pkg.name}/.env is missing. See CLAUDE.md, "Environment variables".`)
  const envSource = readFileSync(envFile, 'utf8')
  pkg.dataset = readEnvVar(envSource, pkg.datasetVar)
  if (!pkg.dataset) fail(`${pkg.name}/.env does not set ${pkg.datasetVar}.`)
  const port =
    process.env[pkg.portVar] || (pkg.portFromEnvFile && readEnvVar(envSource, pkg.portVar)) || pkg.defaultPort
  pkg.url = `http://localhost:${port}`
}

// --- Install: `npm ci` when node_modules is absent or older than package-lock.json. ---
// npm writes node_modules/.package-lock.json on every install, so its mtime marks the last one.

for (const pkg of PACKAGES) {
  const dir = join(root, pkg.name)
  const lock = join(dir, 'package-lock.json')
  const installed = join(dir, 'node_modules', '.package-lock.json')
  const stale = !existsSync(installed) || statSync(lock).mtimeMs > statSync(installed).mtimeMs
  if (!stale) continue
  console.log(`\n→ ${pkg.name}: installing dependencies (npm ci)…\n`)
  const { status } = spawnSync('npm', ['ci'], { cwd: dir, stdio: 'inherit' })
  if (status !== 0) fail(`npm ci failed in ${pkg.name}/.`)
}

// --- Run both dev servers. ---

const width = Math.max(...PACKAGES.map((p) => p.name.length))
const prefix = (pkg) => `\x1b[${pkg.color}m${pkg.name.padEnd(width)} │\x1b[0m `

console.log('')
for (const pkg of PACKAGES) {
  console.log(`${prefix(pkg)}${pkg.url}  (dataset: ${pkg.dataset})`)
}
console.log('')

const children = PACKAGES.map((pkg) => {
  const child = spawn('npm', ['run', 'dev'], {
    cwd: join(root, pkg.name),
    // FORCE_COLOR keeps Next's and Sanity's colours even though stdout is a pipe.
    env: { ...process.env, FORCE_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    // Own process group, so shutdown reaches npm's grandchildren (next, sanity).
    detached: true,
  })
  for (const stream of [child.stdout, child.stderr]) {
    let buffer = ''
    stream.setEncoding('utf8')
    stream.on('data', (chunk) => {
      buffer += chunk
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) process.stdout.write(prefix(pkg) + line + '\n')
    })
  }
  // A failed spawn (e.g. `npm` not on PATH) emits 'error' and may never emit 'exit'.
  child.on('error', (err) => {
    if (shuttingDown) return
    console.error(`\n${prefix(pkg)}failed to start (${err.message}); stopping the other server.`)
    shutdown(1)
  })
  child.on('exit', (code, signal) => {
    if (shuttingDown) return
    console.log(`\n${prefix(pkg)}exited (${signal ?? `code ${code}`}); stopping the other server.`)
    shutdown(code ?? 1)
  })
  return child
})

let shuttingDown = false
function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    if (child.pid && child.exitCode === null) {
      try {
        process.kill(-child.pid, 'SIGTERM')
      } catch {
        // Already gone.
      }
    }
  }
  process.exitCode = code
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
