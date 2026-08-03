#!/usr/bin/env bash
#
# Make a checkout runnable: local .env files in place, node_modules installed.
#
#   bash scripts/worktree-setup.sh
#
# Idempotent and quiet. It only acts on what is missing, and prints nothing at
# all when there is nothing to do — it runs at session start via the hook in
# .claude/settings.json, and hook output lands in Claude's context.
#
# Nothing here is worktree-specific: run it in the main checkout after a fresh
# clone and it does the same job.

set -euo pipefail

# Works from any subdirectory, in a worktree or the main checkout. In the main
# checkout the two paths are equal, which is what disables the copy-from-main
# steps below.
here="$(git rev-parse --path-format=absolute --show-toplevel)"
main="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"

did_something=no
log() {
  if [ "$did_something" = no ]; then
    printf 'worktree-setup:\n'
    did_something=yes
  fi
  printf '  %s\n' "$*"
}

# --- .env ---------------------------------------------------------------------
#
# .worktreeinclude already does this for worktrees Claude Code creates. This is
# the backstop for `git worktree add` by hand and for a fresh clone.
#
# The main checkout's file wins over the template, so a worktree inherits the
# same local config rather than a reset copy of it.

seed_env() {
  rel="$1"           # path relative to the checkout root
  from_example="$2"  # yes | no — may we fall back to <rel>.example?

  if [ -e "$here/$rel" ]; then
    return 0
  fi
  if [ "$here" != "$main" ] && [ -f "$main/$rel" ]; then
    cp "$main/$rel" "$here/$rel"
    log "$rel  <- main checkout"
  elif [ "$from_example" = yes ] && [ -f "$here/$rel.example" ]; then
    cp "$here/$rel.example" "$here/$rel"
    log "$rel  <- $rel.example"
  fi
}

# Root .env holds SANITY_WRITE_TOKEN, so there is nothing useful to copy out of
# the template — an empty token fails less legibly than a missing file.
seed_env .env no
seed_env studio/.env yes
seed_env web/.env yes

# Which dataset the Studio just got pointed at is worth saying out loud rather
# than inheriting silently. `production` here would mean this checkout edits her
# real photos; see "Datasets" in CLAUDE.md.
if [ "$did_something" = yes ] && [ -f "$here/studio/.env" ]; then
  dataset="$(sed -n 's/^SANITY_STUDIO_DATASET=//p' "$here/studio/.env" | tail -1)"
  log "studio dataset: ${dataset:-(unset — sanity dev will refuse to start)}"
fi

# --- node_modules -------------------------------------------------------------
#
# The two packages install separately and never share a dependency tree, so this
# is a loop over both rather than one root install. See CLAUDE.md.

install_deps() {
  pkg="$1"

  if [ -d "$here/$pkg/node_modules" ]; then
    return 0
  fi

  # Only reuse the main checkout's tree when the lockfiles are byte-identical;
  # a branch that changed dependencies has to do a real install.
  if [ "$here" != "$main" ] &&
     [ -d "$main/$pkg/node_modules" ] &&
     cmp -s "$here/$pkg/package-lock.json" "$main/$pkg/package-lock.json"; then
    # -c is APFS clonefile: copy-on-write, so ~1GB across both packages lands in
    # seconds and costs no disk until the trees diverge. It falls back to a real
    # copy on filesystems that can't clone, hence the second cp.
    cp -Rc "$main/$pkg/node_modules" "$here/$pkg/node_modules" 2>/dev/null ||
      cp -R "$main/$pkg/node_modules" "$here/$pkg/node_modules"
    log "$pkg/node_modules  <- cloned from main checkout"

    # npm would have run this; copying the tree skips it. It is what generates
    # web/.nuxt, without which `nuxt dev` starts by rebuilding it anyway.
    if grep -q '"postinstall"' "$here/$pkg/package.json"; then
      ( cd "$here/$pkg" && npm run postinstall ) >&2
      log "$pkg  postinstall"
    fi
  else
    log "$pkg  npm ci (lockfile differs from the main checkout — this is slow)"
    ( cd "$here/$pkg" && npm ci ) >&2
  fi
}

install_deps studio
install_deps web

if [ "$did_something" = yes ]; then
  log "ready: npm run dev in studio/ or web/"
fi
