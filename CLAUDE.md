# jl-portfolio

A photography portfolio site. Roughly 250 iPhone photos, a handful of short texts, and
links to articles published elsewhere.

## Two users, and which one wins

**The editor.** One person: the photographer. She is not technical. She has a Squarespace
site she never updates, because its freeform layout editor is fiddly and easy to break at
different screen sizes. **An editing experience she will actually use is the entire point of
this project.** A beautiful site she won't touch is a failure.

**The audience.** Visitors, mostly on phones, mostly arriving from a link. They want to look
at photographs — large, fast-loading, without chrome in the way.

When these two conflict, the editor wins. A feature that makes the public site 5% more
sophisticated and the Studio meaningfully more confusing is a bad trade. Take it the other
way: prefer fewer knobs, more defaults, and choices that cannot produce a broken page.

## Stack

| Piece | Why it's here |
| --- | --- |
| **Next.js 16** (App Router, React 19) | File-based routing, per-route rendering, and Server Components — so a page's data fetch happens on the server by default and only the interactive parts ship. |
| **TypeScript** | Content shapes come from generated types — the compiler catches schema drift. |
| **Tailwind CSS** | Layout presets are the only place layout is decided; utility classes keep that decision local to the preset component. v4, CSS-first — the `@theme` and `@utility` block in `web/src/app/globals.css` is the single source for type, colour and container width. **There is no `tailwind.config.ts` and one should not be added.** |
| **Sanity** (hosted Content Lake) | The CMS. Structured content, real references between documents, and an editing UI we control the shape of. |
| **Sanity Studio, deployed via `sanity deploy`** | Sanity hosts the Studio at `joanatstake.sanity.studio`. `/admin` on this site redirects there, so she still only has to remember one URL. |
| **`@sanity/client` + `groq`** | The client and `defineQuery`, wired through one `sanityFetch` helper in `web/src/sanity/fetch.ts`. Chosen over `next-sanity`, which bundles visual-editing, preview-secret and webhook packages this project defers — see *Working agreements*. |
| **`@portabletext/react`** | Renders `proseText` and the two bodies. Same `components` map shape the Vue renderer had. |
| **GROQ** | Sanity's query language. Lets a route fetch exactly its shape in one request, following references. |
| **Sanity image CDN** | Transform params in the URL — resizing, format negotiation, and LQIP come free, no build-time image pipeline. |
| **Vercel + ISR** | Deployment. ISR means content changes appear on the live site without a build step she has to know about or wait for. Sixty seconds, set once at the fetch layer — see *Caching*. |

### The Studio (Phase 1 approach)

The Studio is **not embedded in the app**. It is its own npm package in `studio/` with its own
`package.json`, deployed to `joanatstake.sanity.studio`. `/admin` on the site redirects to it.

**The original reason for that split is gone, and the conclusion is unchanged.** This used to
read "Sanity Studio is React and Nuxt is Vue; rather than bridge that…", and the app is React
now — the language gap that made embedding awkward no longer exists. The arrangement stays on
its own merits, which were always the stronger half of the argument: Sanity's own guidance
treats a standalone, separately-deployed Studio as the recommended shape and embedding as
legacy, because embedding slows app builds, couples Studio updates to app deploys, and rules
out Studio auto-updates. Note it also keeps `sanity`, `styled-components` and the Studio's React
out of the *app's* install, which still matters even though both halves now speak React.

So: if embedding is ever reconsidered, it has to be argued against those three costs. "They are
both React now" is not the argument — it only removes an obstacle that was never the reason.

Sanity project: **`c3808h1v`** ("Portfolio: Joan Lebow"). Hardcoded in `studio/sanity.config.ts`
and `studio/sanity.cli.ts` — it's public, and the Studio only ever talks to one project.

Studio hostname: **`https://joanatstake.sanity.studio`**, claimed and live. Pinned as
`studioHost` in `studio/sanity.cli.ts`, so deploys no longer prompt and can't land on a
different host by typo. CORS is registered for it and for `http://localhost:3333`.

Consequences to keep in mind:

- **The Studio is a separate deployment artifact.** Pushing the app to Vercel does not ship
  Studio changes, and `sanity deploy` does not ship app changes. A schema change only reaches
  her after a Studio deploy. This is the main cost of the approach — when a task touches
  `studio/schemaTypes/`, deploying the Studio is part of finishing it.
- **Studio auto-updates are on** (`autoUpdates: true` in `studio/sanity.cli.ts`). Sanity ships
  Studio improvements to her without a redeploy from us. Schema changes still need a deploy;
  only the Studio shell auto-updates.
- **Studio dependencies stay out of the app's install.** `sanity`, `styled-components` and the
  Studio's own React live in `studio/package.json`, so a Vercel build of the app never installs
  them. This is the main reason the two halves have separate `package.json` files, and it
  survived the app becoming React — the app depends on `react` and `react-dom` and on nothing
  else the Studio needs.
- **The redirect is a `302`, not a `301`.** A permanent redirect gets cached in her browser
  and would be genuinely annoying to undo if we later embed the Studio. Keep it temporary
  while the arrangement is temporary.
- **The Studio's dataset is required, never defaulted.** `studio/dataset.ts` throws if
  `SANITY_STUDIO_DATASET` is unset. There is no safe default, and both wrong answers fail
  quietly: `production` means a machine without `studio/.env` edits the dataset the live site
  reads while believing it is in a sandbox, and `development` means a deploy ships her a Studio
  pointed at a dataset the live site does not read — she would edit, publish, see nothing
  change, and have no way to tell why. So neither is the default. `npm run deploy` pins
  `production` itself, so the deployed Studio cannot inherit a local `.env`. Local work sets
  `development` in `studio/.env`.
- **Every Studio origin needs a CORS entry with credentials allowed**, or login fails with an
  opaque error. That means both the deployed host and `http://localhost:3333` for
  `sanity dev`: `npx sanity cors add <origin> --credentials`.
- **The *app* needs no CORS entry at all any more, and that is a property worth defending.**
  Nothing in the browser talks to Sanity: every read happens on the server, and the one that
  used to happen after hydration — "load more" on /shots/all — goes through `app/api/photos`.
  A server request sends no `Origin` header, so the allowlist cannot apply to the app.

  Two app origins are still registered, `https://*.vercel.app` and `http://localhost:3000`,
  both `--no-credentials`. They are now inert. Leaving them costs nothing — they grant a
  browser exactly what `curl` already returns to anyone holding the public project id — and
  removing them is a separate decision, not part of this. **What matters is not adding more:**
  a new app origin appearing on that list is the signal that something in the browser has
  started calling Sanity directly, which is the invariant below being broken.

  | Origin | Credentials | For |
  | --- | --- | --- |
  | `https://joanatstake.sanity.studio` | yes | deployed Studio |
  | `http://localhost:3333` | yes | `sanity dev` |
  | `https://*.vercel.app` | no | the app — **inert**, see above |
  | `http://localhost:3000` | no | the app — **inert**, see above |

  **The invariant, and what enforces it.** `web/src/sanity/client.ts` begins with
  `import 'server-only'`, so importing it from anything in the client graph is a build error
  naming the file that did it. That is why no Sanity value carries a `NEXT_PUBLIC_` prefix —
  see *Environment variables*. The check that proves it, and the one to run after any change
  here: `grep -r "c3808h1v" web/.next/static/` must return nothing after a build, and
  `apicdn.sanity.io` must never appear in the browser's Network tab on any route.
  (`cdn.sanity.io` image requests are expected — those are `<img>` loads, which are not
  CORS-checked, and their URLs come from the server payload.)

  **The bug this replaced is worth keeping, because its shape is general.** A missing app
  origin did not look like CORS. SSR sent no `Origin` header, so a hard load always worked;
  Nuxt purged a route's cached data on unmount, so navigating away and back re-ran the query
  *in the browser*, which did send one, got a 403, and left the result `null` — identical to a
  query that found nothing. `/` spent a while reporting "No homePage document found in this
  dataset" while the dataset was correct throughout.

  The specific failure cannot recur. **The lesson generalises and is now structural:** a
  request that did not happen must never look like a query that found nothing. `orThrow` in
  `sanity/fetch.ts` makes checking the transport failure *first* a property of the type rather
  than something six routes remember to do — see *Errors* under Conventions.

  Diagnosing an origin problem still takes three requests, and the contrast between them *is*
  the signature — a status alone does not distinguish "origin rejected" from "dataset empty".
  Kept because it is still how you check the Studio's own entries:

  ```sh
  U="https://c3808h1v.apicdn.sanity.io/v2026-07-31/data/query/production?query=*%5B0%5D"

  # allowlisted origin  -> 200, and the origin echoed back
  curl -sS -D - -o /dev/null "$U" -H "Origin: https://joanatstake.sanity.studio" \
    | grep -iE '^HTTP|^access-control-allow-origin'

  # origin not on the list -> 403, and no allow-origin header at all
  curl -sS -D - -o /dev/null "$U" -H "Origin: https://example.com" \
    | grep -iE '^HTTP|^access-control-allow-origin'

  # no Origin header -> 200. This is the server path, and it is now the only path the app takes.
  curl -sS -o /dev/null -w '%{http_code}\n' "$U"
  ```

  **Grep those headers case-insensitively.** Under HTTP/2 all header names are lowercase, so a
  pattern anchored on `Access-Control-Allow-Origin` matches nothing and reads as a rejection on
  an origin that is in fact allowed.

This is Phase 1. Revisit only if the hop to a second domain actually confuses her, or if
embedded preview / visual editing becomes worth the bridge — not on general principle.

### Datasets

Two datasets on project `c3808h1v`, both created:

- `development` (public) — **where content is authored.** What local dev points at, via
  `SANITY_STUDIO_DATASET` in `studio/.env` and `SANITY_DATASET` in `web/.env`.
  The dataset anyone actually types into.
- `production` (public) — **a mirror of `development`**, refreshed by `npm run promote`.
  Read by the Vercel app, and written by the deployed Studio. Reached from the CLI only by an
  explicit `SANITY_STUDIO_DATASET=production`, which `npm run deploy` supplies.

Any script that writes must take the dataset explicitly and must not default to `production`.

**This file used to treat writing to `production` as a hazard to argue around, and that was
wrong.** It assumed content would only ever reach `production` by Joan editing it there, so
anything else arriving was a mistake in progress. In practice her content is being authored
*for* her in `development` — the bio, the writing links, the photographs that go with them —
and it has to get to `production` somehow. Promotion is the intended workflow, not a
workaround, and the old framing kept stopping the actual work.

What survives from that framing is the line directly above. Naming the dataset explicitly is
still the rule; `studio/promote.mjs` satisfies it by pinning **both** names in source rather
than taking them as arguments, because there is exactly one legal direction and a flag would
only add a way to run it backwards.

#### The promote

`npm run promote`, from `studio/`. It is `studio/promote.mjs`, and it does four things:

1. **Preflight.** Reads both datasets **authenticated** and **refuses to run if any `_id`
   exists in `production` but not in `development`.** Then prints what will be created, and —
   separately — which shared documents will be replaced with *different* content, versus how
   many are already identical.
2. **Backs `production` up** to `studio/.promote/`, gitignored, before writing anything.
3. **Exports `development`**, drafts and assets included.
4. **Re-checks for new `production` ids, then imports with `--replace`.**

`--dry-run` stops after step 1; `--yes` skips the confirmation prompt. Run the dry run first —
it is the whole point of the preflight being separate.

**The preflight has two halves because the two failures have different shapes**, and the id
check alone was not enough. A document Joan *creates* in the deployed Studio exists in
`production` and nowhere else, so it is a production-only id and the script refuses outright.
A document she *edits* leaves the id set untouched — and editing is the likelier first move,
because the singletons are pinned by `structure.ts` and can only ever be edited, never created.
`homePage` is the exact document at risk and the exact one an id check cannot see.

So the second half compares content. Volatile fields (`_rev`, `_createdAt`, `_updatedAt`) and
key order are normalised away; asset documents are compared by id only, since their ids are
content hashes and a matching id already proves matching bytes. **What it cannot do is decide.**
A document differing because `development` changed is the entire point of promoting; one
differing because `production` changed is the thing to stop for, and the two are
indistinguishable from content alone. The script prints the list and says so; reading it is the
step that keeps her work.

**Both halves read authenticated, and that is not a detail — an anonymous read cannot see
drafts.** This file previously claimed the opposite, on the strength of the dataset docs saying
a public dataset is one "everyone can query", and that reading was wrong. Sanity's auth
documentation is explicit: *"unauthenticated users have read access to published documents…
if you want to access draft documents… you will need to authenticate."* Dataset visibility and
draft visibility are separate axes, and `public` governs only the first. Measured on
`development` with a scratch draft in place: **41 documents anonymously, 55 authenticated.**

An unpublished draft is exactly what the preflight most needs to see — it is work that exists
only in `production` — so an anonymous check would have passed clean and let the import bury
it. The reads go through `sanity api`, signed with the same logged-in session `dataset export`
and `import` already use, so `npm run promote` needs `sanity login` and nothing else; there is
still no `SANITY_WRITE_TOKEN` anywhere near this script. A 401 aborts with a message naming the
cause, because a read that did not happen must never look like a read that found nothing.

That same authenticated view surfaced something else worth knowing: **each dataset holds 13
system documents under `_.` — access groups, retention policy, and `_.schemas.default`.** They
are invisible anonymously, which is why they went unnoticed. The preflight excludes them, and
must: `dataset export` always filters system documents out, so they are not promotable content,
and `_.schemas.default` is whatever the last `sanity deploy` wrote — it differs between datasets
whenever their Studio deploys differ, which is a divergence the promote neither causes nor fixes.

It lives in `studio/` rather than the `scripts/` directory this file plans for `seed.ts`, and
the reason is not filing convenience: `dataset export` and `dataset import` authenticate as the
**logged-in CLI user**, so the promote needs no `SANITY_WRITE_TOKEN` at all. Putting it at the
repo root would have given it a token, a `package.json` and a `node_modules` it does not need,
to reach a CLI that is already installed next to the schema it promotes.

**The promote has an expiry date, and the preflight is the tripwire — not a formality.** The
deployed Studio at `joanatstake.sanity.studio` writes to `production`. The promote overwrites
`production`. Those two facts collide the day Joan starts editing, and from then on a promote
destroys her work. **When the preflight refuses, the answer is never a `--force` flag.** It
means the handover has happened, the content now moves the other way, and `development` is the
copy that needs updating.

**Know the one guarantee the promote does not make: it is not atomic, and it cannot be.** The
preflight is re-run immediately before the import, which narrows the gap — the confirm prompt,
the backup and the export together take minutes, and a write arriving in that stretch is caught
rather than silently lost. But Sanity offers no dataset-level lock, and `dataset import` does
not send per-document `ifRevisionID`, so a write landing *during* the import can still be
overwritten. No version of this script closes that window. Do not write a line here claiming
it does; the honest mitigation is that only one person writes to `production` today, and that
stops being true on exactly the day the promote should stop running anyway.

Import semantics worth knowing before changing any of this, all verified against
`@sanity/import` rather than inferred:

- **Import never deletes.** Nothing in the target is removed, ever — a document there that the
  source lacks simply survives. That is precisely why the subset check is the *precondition*
  for calling the result a mirror. Without it, "promote" would mean "overlay", and the two stop
  being the same thing the moment `production` grows a document of its own.
- **`--replace` is a whole-document replace, not a merge**, so a field present in the target and
  absent in the source is dropped from that document. Correct here, and only because of the
  check above.
- **Without `--replace` the default operation is `create`, which fails on the first colliding
  id.** `--missing` is the opposite mistake: it lands new documents and skips every existing
  one, so edits to content already promoted would silently never arrive.
- **Drafts and assets are both included by default.** Do not add `--no-drafts` — it also strips
  `versions.*` release documents, and it would discard unpublished Studio work.
- **Never `--raw`.** Asset CDN URLs are dataset-scoped (`/images/<projectId>/<dataset>/…`), so a
  raw export re-imported into a sibling dataset fails with *"Asset has different target than
  source"*. A plain export bundles the binaries and rewrites the references.
- Assets are deduplicated against the target by `sha1hash`, so a repeat promote re-uploads
  nothing. The operation is idempotent and a second run is a no-op.
- **Any Sanity CLI command run from `studio/` needs `SANITY_STUDIO_DATASET` set, even one that
  names both of its datasets on the command line.** `sanity.cli.ts` calls `requireDataset()`
  at module load, which throws before the command is parsed. `promote.mjs` therefore pins the
  variable in the child environment rather than inheriting it, so it does not depend on
  `studio/.env` existing — the same move `npm run deploy` makes for a different reason.

**`npx sanity dataset copy <src> <dst>` is not the mechanism, and cannot be.** It refuses when
the target already exists, there is still no `--force`, and it is Enterprise-gated besides.
Export-then-import is the supported way into a dataset that exists. It strengthens references on
the way in, so the result is a genuine copy rather than one dataset pointing at another's
assets, and it does *not* mint new `_id`s — asset ids are content hashes and document ids carry
over verbatim, which is what makes the subset check meaningful in the first place.

#### Content migrations

`npx sanity migrations run <id>`, from `studio/`, against `studio/migrations/<id>/index.ts`.
The `tag` refactor is the first use — see `create-tag-documents` and `tags-to-references`.

Four things about the runner, all read out of `studio/node_modules` or measured on a real run
rather than assumed, and each of which fails in a way that does not name itself:

- **It authenticates as the logged-in CLI user**, like `dataset export`/`import`. No
  `SANITY_WRITE_TOKEN`, which is why migrations live in `studio/` next to `promote.mjs` rather
  than in `scripts/`.
- **Dry run is the default.** `--no-dry-run` executes. `--confirm` prompts unless
  `--no-confirm`. `--project` and `--dataset` must be given together or not at all — supplying
  one alone is an error that names the flags rather than the reason.
- **Transactions are submitted concurrently**, six at a time. So a `createIfNotExists` for a
  document and a patch writing a *strong reference* to it **cannot share a run**: they can land
  in different in-flight transactions and the patch fails on reference integrity, halfway,
  leaving the dataset half-converted. That is why the tag work is two migrations run in order,
  and the pattern to copy for any future reference-introducing migration.
- **Drafts are included by default and must stay that way.** The runner streams
  `/data/export/<dataset>` without `drafts=false`, and `documentTypes` matches on `_type`,
  which a draft shares with its published twin. `development` held `drafts.gallery-mexico-2022`
  and the dry run showed it. A draft left holding the old shape renders as a broken field in
  the Studio, and the next `npm run promote` carries it into `production` unchanged.

Write migrations so a second run is a no-op — convert only values still in the old shape — and
so an unmappable value **throws by name** rather than being patched in as a dangling reference.
Both fire during the dry run, before anything is written. Take a `dataset export` first
regardless; that tarball is the rollback, and import never deletes, so documents the migration
*created* survive a rollback and need removing by hand.

#### Stock content is cleaned in `development`, not in `production`

`production` was first seeded on 2026-08-03 from `development`, because the Vercel deployment
reads `production` and the front page throws a 500 when no `homePage` document exists. It was
promoted over on 2026-08-04, which is when the arrangement above became the workflow rather
than a one-off; the two datasets held identical id sets — 41 documents each — immediately
afterwards. **The Vercel app is at `jl-portfolio-seven.vercel.app` and `joanatstake.com` is not
pointed at it**, so `production` is a staging dataset wearing the production name until DNS is
connected.

That first promote is also what `/bio` was waiting on. `aboutPage` existed only in
`development`, so the live route returned a 500 while `/` and `/copy` returned 200 — a
reminder that **a missing singleton fails per-route, not visibly at the dataset level**. Adding
a route that queries a singleton adds a way for `production` to be wrong without anything
saying so.

Some of that stock content is still there — see the front-page note about
`homePage.featuredPhotos` — and it has to be gone before `joanatstake.com` resolves. Stock
photographs published under her name is the failure the old "never seed `production`" line was
guarding against, and that concern was always right; it was only ever the remedy that was wrong.

**The remedy is to clean `development` and promote.** One dataset to clean, and the mirror
carries the cleanup across. This file used to specify a `scripts/` job that deleted stock
content out of `production` directly, scoped by type and by `_updatedAt` against the import
stamp. That design is retired, for two reasons:

- Cleaning the source is strictly simpler than keeping two datasets clean independently, and it
  cannot drift.
- **Its `_updatedAt` heuristic does not survive the promote.** The rule was "anything stamped
  later than the import is something she has touched since". But import brings references in
  weak and then patches them strong in a second transaction, which sets a fresh `_updatedAt` on
  every reference-bearing document it writes. The signal the script depended on is destroyed by
  the operation that would immediately precede it.

**What does survive, and is now load-bearing in the other direction: "seeded" and "safe to
delete" are not the same set.** Singletons are pinned by `structure.ts` to a `documentId` equal
to the type name — `homePage`'s `_id` is the literal string `homePage`, identical in both
datasets by construction, not by coincidence. That used to be the trap: deleting everything the
two datasets had in common would have taken her front page with it. It is now the mechanism.
Because the id is the same on both sides, the promote **updates her page in place** rather than
creating a second one, and every singleton behaves the same way.

Note also what the going-live checklist does *not* require: recreating `production`.
`--visibility` is optional on `sanity dataset create`, `development` started private, and a
private dataset read anonymously returns **HTTP 200 with an empty result** rather than an error.
Rebuilding a dataset to fix its contents would risk reintroducing the silent failure documented
directly below, to solve something a promote already solves.

**Both datasets are `public`, and `development` had to be changed to match.** It started
private, which broke the app in a genuinely nasty way: an anonymous read of a private dataset
returns **HTTP 200 with an empty result set**, not a 401. Nothing errors, nothing logs, the
query just resolves to `null` and the page renders as though the content had been deleted.

Public here means public reads **of published documents**. Writes still need a token, the
Studio still requires a login, and — the part that is easy to get wrong — **drafts are not
public either.** Dataset visibility and draft visibility are separate axes; an unauthenticated
caller gets published content on a public dataset and nothing more. That is why the app needs
no token (it reads published content) and why the promote's preflight does (it must see
drafts). The alternative was a server-only read token in `web/.env`, and it was rejected on the
grounds that `production` is public and needs no token — so local dev would have been
authenticating over a code path production never takes, which is the class of
works-locally-fails-in-Vercel divergence this file keeps warning about. It also would have put
the first non-public value into `web/.env`, whose whole invariant is that everything in it is
public.

The privacy that matters is enforced elsewhere and is unaffected: `location` (GPS) is excluded
from image metadata in `photo.ts` precisely because a public dataset is readable by anyone with
the project id.

---

## The two rules

These are non-negotiable. They are not preferences to be balanced against convenience; if a
task seems to require breaking one, the task is wrong and you should say so before writing
code.

### Rule 1 — Photos are standalone documents. Galleries reference them.

A photo is a `photo` document with its own `_id`, its own image asset, and its own alt text.
Galleries hold an **array of references** to photo documents.

Never embed an image inside a gallery document. Never inline an image field into a gallery
array item. Never copy alt text or caption onto the reference.

The same photograph appears on `/shots/all` and on a gallery page. It must be **one record with one
alt text**, or the two copies drift apart the first time she fixes a typo in one of them.

If a caption genuinely needs to differ by context, that is a discussion to have — not
something to solve by duplicating the photo.

### Rule 2 — Layout is a small set of presets, not freeform positioning.

She picks **which photos**, **in what order**, and **which preset**. She never positions
anything. She never sets a width, a column count, a crop offset, or a breakpoint.

Presets are React components that guarantee the result works at every width. They are the
product, not a limitation of it. Do not work around this constraint, do not add per-photo
overrides "just for this one case", and do not propose a drag-and-drop canvas or freeform
page builder — that is the exact thing this project exists to replace.

Adding a preset means two changes, always together:

1. A new component in `web/src/components/presets/`, satisfying `GalleryPresetProps`.
2. A new option in the hard-coded preset list in the gallery schema.

The schema field is a `string` with a fixed `options.list`. It is never a free-text field.
A preset value that has no matching component must be impossible — and it is: the `PRESETS` map
in `shots/GalleryView.tsx` is `satisfies Record<Gallery['preset'], ComponentType<GalleryPresetProps>>`
over the union typegen produces from that list, so forgetting either half is a typecheck failure
at the point the pair was broken. **Verified by deleting an entry: the compiler names the missing
preset.** The map is typed against the shared props rather than `unknown`, so it also catches a
preset that quietly does not accept `renderPhoto` — which would render a gallery whose
photographs are not clickable, and fail silently otherwise.

---

## Site structure

| Route | Contents |
| --- | --- |
| `/` | Five featured photos, then three featured pieces of writing — see *The front page* below |
| `/shots/all` | Every photo she has uploaded except those flagged `excludeFromIndex`. Multi-select tag filters, infinite scroll. A **static route, so it shadows `[slug]`** — `gallery.ts` refuses the slug `all` because of it. |
| `/shots/[slug]` | One gallery, rendered through its preset. **Her galleries define this route** — creating one in the Studio makes the page and lists it in the nav. |
| `/shots/*?photo=<_id>` | Not a route — the **showcase**. One photograph, alone and centred, on either page above. See *The showcase* below. |
| `/copy` | Her own posts and links out to others, newest first, interleaved. One leads; the rest are a ledger. The lead is the newest **unless she sets `writingPage.featured`** |
| `/copy/[slug]` | A `post` — writing that lives here. An `article` never reaches it. |
| `/bio` | Her bio — prose with photographs in it. Same body shape as a `post`. |

**Her words, our internals.** `/copy` and `/bio` were `/writing` and `/about` until she asked
for the Squarespace vocabulary back. Only the labels and the addresses moved: the document
types are still `post`, `article`, `writingPage` and `aboutPage`, the queries are still
`WRITING_QUERY` and `ABOUT_QUERY`, and the components are still `components/writing/`. Renaming
a Sanity document type is a content migration bought with nothing, and the Studio labels carry
her words instead (*Copy page*, *Copy post*, *Copy link*, *Bio*). `next.config.ts` `redirects()`
307s the old three addresses, including `/shots/everything`. (307, not 302: Next's shorthand has
no 302, and the property that matters — temporary, not browser-cached — is the same.)

The `Start` nav item was going to become `Shots` in the same pass and was deferred. It still
says START and still points at `/`; only the sub-item under it changed, from EVERYTHING to
ALL SHOTS.

## The showcase

Clicking any photograph on `/shots/all` or `/shots/<slug>` opens it alone and centred, at
`?photo=<_id>` on the page you were already on. The front page is the exception — its
photographs are links into galleries, and `home/PhotoStrip.tsx` keeps its own slot.

**It is a query parameter and not a route, and the reason is measured rather than aesthetic.**
On `/shots/all` the page holds two things a route change would destroy: `appended` — every
photograph loaded past the first page — and the `IntersectionObserver` driving it. A nested
route (`/shots/[slug]/[photo]`) would unmount the index and mean lifting the accumulator into
shared state plus hand-rolled scroll restoration, for a prettier address. It also composes:
`?tag=life&photo=X` closes back to the filter you came from.

**The navigation is `window.history.pushState`, and that is the load-bearing part.** Nuxt got
"a query-only change does not re-run the page" for free, because it keyed a page by its
interpolated path rather than by `fullPath`. Next has no such rule — both `/shots/*` routes are
dynamic, so a `<Link>` to `?photo=X` is a real navigation that refetches the RSC payload and
re-runs `ALL_SHOTS_QUERY` on **every open and every close**. On a ~200 kB LQIP payload that is
the exact cost the paging exists to avoid, paid on a UI gesture.

Native `pushState` avoids it entirely: Next patches `pushState`/`replaceState`, updates its
canonical URL, and re-renders whatever reads `useSearchParams()` — with no request. Back and
Forward across those entries stay soft navigations. So the property Nuxt inherited is now
*stated*, in `components/shots/useShowcase.ts`, which is arguably where it belonged all along.
**Verified in a real browser: opening the showcase fires zero network requests, and `appended`
survives an open/close cycle unchanged.**

- **It is not a preset**, and must never join `LAYOUT_PRESETS` or the `PRESETS` map. She never
  chooses it; it is a behaviour of every photograph on `/shots/*`, like the filter row.
- **Sizing is a bound, not a crop.** `--showcase-h` (an `@utility` in `globals.css`) times the
  photograph's own `--ar` gives a `max-width`, so the photograph fills whichever dimension runs
  out first with its ratio intact. No `crop`, no `CROPS` entry, no `object-cover`, no new
  srcset ladder — and the wrapper carries the bound so `SanityPhoto`'s `w-full` is untouched.
  Putting `max-h-*` + `w-auto` on the image instead would pit `w-auto` against `w-full`, which
  Tailwind v4 resolves by emitted-CSS order rather than class-list order.
- **The tiles are plain `<a href>` with an intercepted left-click**, never `<Link>`. Two reasons,
  and both matter: `<Link>` prefetches as it enters the viewport, so 200 tiles on a dynamic route
  would be 200 server renders during a scroll; and the click has to become a `pushState`. The
  `href` is the real address, so middle-click and Cmd-click open a tab the server renders
  correctly, and before hydration the anchor simply navigates. `lib/showcase.ts`'s
  `isModifiedEvent` is the same test `next/link` makes internally.
  - **`FilterBar` is the deliberate opposite**: a tag change *must* reach the server, because it
    is a different set, a different first page and a different total. Same page, two kinds of
    query parameter, two mechanisms — preserve that distinction if either is touched.
- **`/shots/[slug]` needs no second query for it** — `GALLERY_QUERY` returns the whole array, so
  the id resolves with a `find`. `/shots/all` pages, so it falls back to `PHOTO_BY_ID_QUERY`,
  resolved **on the server** when the id is not in the first page so a shared link paints the
  photograph in the HTML, and not at all otherwise. That query **restates
  `excludeFromIndex != true`**: the flag is a rule about the index, and this is how a photograph
  is reached *through* the index, so ignoring it would be a hole in the flag.
- **The index is not rendered while the showcase is open, which destroys the sentinel** — so the
  observer is attached by a **callback ref that returns its own cleanup** (React 19), not in an
  effect at mount. `useCallback([])` for a stable ref identity, plus a ref holding the current
  `loadMore` because a stable identity cannot close over a fresh one. Without either, infinite
  scroll silently stops working for the rest of the session after the first showcase closes,
  while the Load more button keeps working and nothing looks broken.
- **The tab title follows `?photo=` in two places, because one is not enough.** `generateMetadata`
  covers the server-rendered case — a shared link, which is what the title is for — but a
  `pushState` open runs no server render, so `PhotoShowcase` sets `document.title` and restores
  the previous one on close. Do not "fix" the split by switching the tiles to `<Link>`: that
  trades the tab title for a full first-page refetch on every open and close.
- A bad or hidden id renders a message and a way back, **never `notFound()`**. A query
  parameter must not be able to replace a working gallery with an error screen.
| `/contact` | Text and links only — see non-goals |
| `/admin` | 302 redirect to the Sanity-hosted Studio. No page component. |

## The front page

**The numbered slots are gone, and this section is kept because what replaced them is
smaller.** The page began as seven fixed slots mirroring the Squarespace site it replaces,
numbered 1–7 in `homePage`'s field order. Slots 1–3 became site chrome on every page; slot 4
moved to `/bio`; and two more are parked. Numbering three surviving fields against a scheme
that no longer describes the page was costing more than it explained.

What the front page renders today, in the order it renders it:

| On the page | Where it lives |
| --- | --- |
| The photo grid — exactly 5, each optionally linking to a gallery | `homePage.featuredPhotos` |
| Featured writing — exactly 3, posts and links mixed | `homePage.featuredWriting` |

Everything above those two is the sidebar, on every page: the site name, the byline and the
nav. The byline is on `siteSettings` rather than `homePage` precisely because of that.
"Featured Writing" is a hardcoded heading in the component, not a field.

**Three fields are fetched and not rendered, and none of them is dead.** `blurb` sits as a
commented line in `app/page.tsx`; `featuredTitle` and `featuredSubtitle` came off the photo row
when it became a grid, and `ProseHeading` has had no caller since. All three are still in the
schema and still in `HOME_QUERY`, waiting on a decision about where they belong now the page
opens with photographs instead of closing with them. Do not delete the fields or the query
lines to tidy up — that is a content decision, not a cleanup.

**The whole introduction left this page.** `introHeading` and `intro` are `aboutPage`'s fields
now and open `/bio`; the component that renders them moved with them, from `home/Hero.vue` to
`about/Intro.tsx`. `introPhoto` was deleted outright rather than following them — `aboutPage`
has no photo field by design, and photographs on that page come from the body. Nothing on the
front page shows a photograph of her any more, which is the intended end state rather than a
gap: the page opens with her work.

**Status: the site name and byline still do not read from Sanity.** They come from
`web/src/content/site.ts`, because no `siteSettings` document exists in either dataset — the
type is in the schema, nothing has been created against it. Wiring them means creating the
singleton and giving the layout a query, which is site chrome rather than front-page work and
touches every route.

**Slot 3, the nav, is no longer purely frontend — and that reverses a decision this file used
to state flatly.** It said the nav was frontend-only by design and stayed there, and that held
while every route was known at build time. It stopped holding the moment she could create a
gallery and expect a page to exist for it: the route table is now partly hers.

The reversal is deliberately partial, and the split is the thing to preserve. The three
top-level items are still hardcoded in `content/site.ts`, because they are the shape of the
site. Only the gallery sub-items under START come from Sanity, via `queries/nav.ts`. One
consequence worth knowing: `SiteNav` is the only place on the site that **swallows a query
error**. Every route throws on a failed Sanity read, because a page with no content is broken;
this is chrome on every page, so a failure costs the gallery links and leaves the site
navigable rather than taking down every route at once.

**The nav is split across two files**, and the seam is the server/client boundary: `SiteNav.tsx`
is an async Server Component that runs `NAV_QUERY`, and `SiteNavList.tsx` is the `'use client'`
half that needs `usePathname` for the active state and a piece of state for the collapse. The
galleries cross as a prop.

Three things about that sub-list, all in `SiteNavList.tsx`:

- **Its order is not the query's.** `NAV_QUERY` returns title A–Z; the component then pins one
  gallery to the top by slug (`PINNED_FIRST`, currently `life`) and appends ALL SHOTS at the
  bottom. So app code names one of her documents — deliberately, and it fails soft in every
  direction: renaming the gallery keeps the pin, changing its slug or deleting it just drops
  the pin and leaves the rest alone. If the order ever needs to be hers, that is an ordering
  field on `gallery`, which is a schema change and a new knob.
- **It collapses**, via a button beside START rather than by making START itself the toggle —
  a link that also expands is the classic nav trap where a keyboard user reaches the section
  and never the page. Open by default; the state is plain component state and survives
  client-side navigation because App Router preserves layouts across it, so `SiteNavList` never
  unmounts.
- **`hidden={!open}`, never conditional rendering, on the group.** The button's `aria-controls`
  names the list by id, and removing the element would leave that attribute pointing at nothing
  exactly when the group is closed — which is when it is being read.

**Slots 1–3 are no longer a header.** They are the top of the left sidenav — `SiteSidebar.tsx`
— on every page, and a hamburger drawer below `lg`. That does not change where they read from
or what would have to happen to wire them to `siteSettings`; it changes only which file to
open. One consequence worth knowing: the byline sits in the collapsible part of the sidebar, so
on a phone it is visible only while the nav is open. The alternative was the same string in two
places, which is worse.

**Slot 7 is still pointed at stock photographs, and they are load-bearing.**
`homePage.featuredPhotos` holds six real-estate-listing photos of a house — the last of the
stock content, in both datasets. **Deleting them is not the fix; replacing them is.** The strip
renders whatever the array references, so removing them empties slot 7 rather than improving it.
Swapping in five of Joan's photographs, in `development`, then `npm run promote`, is a named
launch blocker in *Open questions*. Everything else on the front page is her real copy.

## The content model

Thirteen types. The schema files in `studio/schemaTypes/` are the source of truth; this table
is a map, not a spec.

| Type | Shape | Notes |
| --- | --- | --- |
| `photo` | image, alt (required), caption, place, dateTaken, **tags → refs**, **excludeFromIndex** | Rule 1's anchor. No title field. Tags are references to `tag` documents — see below. |
| `gallery` | title, slug, description, preset, **tag → ref**, photos → refs | Rule 2's home: `LAYOUT_PRESETS`. Fills from a tag **or** a hand-picked list — see *Two ways a gallery fills itself*. |
| `tag` | title, slug | **Hers to add, rename and remove.** Two fields, and it should keep two. Replaced the hardcoded `PHOTO_TAGS` array. |
| `post` | title, slug, summary, coverPhoto → ref, publishedAt, body | Writing that lives **here**. Body is prose + `postPhoto`. |
| `article` | title, publication, url, publishedAt, summary, coverPhoto → ref | A link out. No body, by design. |
| `homePage` | title, blurb, featuredWriting → refs, featuredTitle, featuredSubtitle, featuredPhotos → `featuredPhoto` objects | Singleton. See *The front page*. The whole introduction — heading, text and photo — has left this document. |
| `writingPage` | title, intro, **featured → ref** | Singleton. Posts and articles are queried, not listed by hand. `featured` is optional; empty means the newest leads. |
| `aboutPage` | title, introHeading, intro, body | Singleton. Body is prose + `postPhoto`, like `post`. The heading and intro came from `homePage`. Called **About** in the Studio. |
| `contactPage` | title, intro | Singleton. The links live on `siteSettings`. |
| `siteSettings` | title, byline, description, shareImage → ref, links | Singleton |
| `link` | label, url | Object. Used only by `siteSettings.links`. |
| `postPhoto` | photo → ref, layout | Object. A photo between paragraphs of any body — `post` or `aboutPage`. `layout` is a two-value **preset**, not a positioning control — see below. |
| `featuredPhoto` | photo → ref, gallery → ref (optional) | Object. One slot in the front-page grid, and where it links. |
| `proseText` | array of one restricted block | The rich-text type. Used by `homePage.intro`, `.blurb`, `.featuredTitle` and `.featuredSubtitle`. |

**`post` and `article` split her writing by where it lives**, and that is the only thing
that distinguishes them. An `article` points at a piece someone else published — the New
York Times, HuffPost — and copying that text here would be republishing their page. A
`post` is hers, and exists because about fifteen of them were self-published on the
Squarespace site being replaced and have nowhere else to go.

Things worth knowing before changing any of it:

- **One image field, total.** `grep -rn "type: 'image'" studio/schemaTypes/` must return
  exactly one line — the one in `photo.ts`. A second hit means Rule 1 has been broken.
  Everything else that shows a photograph holds a reference.
- **No `hotspot`, and no crop on a photograph except a named one.** Sanity's usual advice is
  `hotspot: true` on every image; here it is a per-photo framing control, which Rule 2 forbids.
  That decision stays coherent only because **no framing is ever chosen per photo** — not in the
  Studio, and not at a call site. Every gallery preset still preserves the native aspect ratio.
  If a preset ever wants uniform tiles, that reopens Rule 2 — it does not get decided inside a
  component.
  - **The exceptions live in one closed list, `CROPS` in `SanityPhoto.tsx`.** A caller passes
    `crop="square"` or `crop="lead"` — a name, never numbers — so the set of framings that exist
    on this site is that object, and a value with no entry is a type error. It is the same move
    `LAYOUT_PRESETS` makes in the gallery schema, one layer down: she picks a preset, never a
    measurement. **Adding an entry is a Rule 2 decision**, which means an argument and a written
    cost, not a convenience.

    There are two today. `square` is /copy's ledger thumbnail. `lead` is the 300×200 cover of
    the lead story on the same page, and it is the first crop applied to a photograph at
    *reading* size rather than to a preview — it was declined once in favour of bounding the
    photo instead, and reversed when that left the column half empty. See `writing/Lead.tsx`.

    What keeps these inside Rule 2 is that nothing about either is a choice: the shape is fixed
    by its `CROPS` entry, the crop is always centred, and **she has no control over any of it** —
    no knob in the Studio, none at the call site. They are presets that happen to crop. The prop
    takes a name rather than a shape for exactly that reason; the moment it accepts dimensions or
    an offset it has become the thing Rule 2 exists to prevent.

    `square` also earns its place on weight, which is what prompted it. The row used to render a
    full-width cover at native proportions and let CSS shrink it, so the page shipped seven
    ~1200px JPEGs to fill what is now a 92px thumbnail. **That is also why a crop belongs in the
    CDN URL and not in an `object-cover` at a call site** — a CSS crop downloads the hidden
    pixels to throw them away, and leaves the URL claiming a framing the page does not use.

    **It was a circle until the ledger redesign, and the change was a radius rather than a
    crop.** The old row put the cover behind a `rounded-full` avatar matching the Squarespace
    site being replaced; the design that replaced *that* asked for rectangles, on the grounds
    that the rest of the site is rectangular photography and the seven circles were the one
    place it was not. Only the radius went. Worth knowing because the mock's own rectangle was
    92×68, and **that** would have been a new crop shape and therefore a Rule 2 decision, not a
    component one — a square was already sanctioned and needed no argument. Square also keeps
    the ledger's rows an even height, which native proportions would not: a portrait cover in a
    92px column is 138px tall and a landscape one is 60px.

    **The cost is real and lands on her, and `lead` is where it bites hardest.** With no hotspot
    the crop is centred, so a cover whose subject sits near an edge loses it — survivable in a
    92px thumbnail, much more visible in a 300×200 lead. Her only remedy is choosing a different
    photo. If that starts to bite, the conversation is `hotspot` on `photo.image` — a Rule 2
    decision, not a component one.

    **Everywhere else the photograph keeps its own proportions.** A gallery, a post body, the
    showcase: no `crop`, and the CDN URL carries nothing that selects a region — a width, a
    format and a quality, but no `fit` and no `rect` — so the no-crop default holds at the URL
    and not merely by convention.
    `grep -rn "crop=" web/src/components/` should stay a short list, and every hit should be a
    thumbnail or the /copy lead.

    **The showcase is the case that most looks like it wants a crop and does not get one.** It
    shows one photograph at the largest size on the site, and it sizes by a *bound* —
    `--showcase-h` times the photograph's own ratio, as a `max-width` — so the ratio survives
    and nothing is selected. That is the bound-versus-crop distinction below, applied to the
    hardest case rather than the easy one.
  - The front page's introduction used to be this rule's worked example, and **the photograph
    it was built around no longer exists in the schema at all.** The argument is worth keeping
    even though the demonstration is gone, because it is what any future hero has to answer to:
    text over an image is the classic case that wants a crop, and `photo.image` has no hotspot
    by design, so the photograph rendered at its native ratio in the right two-thirds and **the
    photo's own proportions decided how tall the section was**. The cost landed on her — which
    photo she picked mattered — and that was a description in the Studio, not a control. Check
    `grep -rn "hotspot *:" studio/schemaTypes/` still returns nothing; the only `hotspot` in the
    tree is the comment in `photo.ts` saying why.

    What went with it: an overlapping card built as a width overrun inside a grid track rather
    than absolute positioning, so it could not escape the container at any width. If a
    composition like that ever comes back, `min-w-0` on the overrunning item is the load-bearing
    part — a grid track's automatic minimum is its item's min-content size, so an item
    deliberately wider than its track widens the track instead of overflowing it.
  - **Watch what a cream canvas does to a photograph with white in it.** `{colors.canvas}` is
    `#fffaf0`, not white, and several of the stock photographs have pure `#ffffff` baked into
    their own edges — the intro portrait carries roughly 30px of it down both sides, verified by
    sampling the asset. On the old white page that padding was invisible. On cream it reads as a
    light panel behind the photo. Nothing in the app can fix it: trimming it is a crop, which is
    Rule 2, and the pixels belong to the asset rather than to the layout. It is a re-upload, or
    it is accepted.
- **Image metadata is set at upload and never backfilled.** The `metadata` array on
  `photo.image` *replaces* Sanity's defaults rather than extending them, so `lqip`,
  `blurhash`, `thumbhash` and `palette` are restated there deliberately — dropping one
  silently breaks the blur-up placeholder for every photo uploaded afterwards. `exif` is
  in; `location` is out, because it is GPS and the production dataset is readable by
  anyone with the project id.
- **A tag is a document, and the vocabulary is hers.** `PHOTO_TAGS` — a hardcoded array in
  `photo.ts` — is gone. `photo.tags` is an array of references to `tag` documents and
  `gallery.tag` is a single one. She adds, renames and removes them under *Tags* in the Studio.
  Nothing about that touches Rule 2: a tag is a topic, not a layout and not a measurement.

  **This inverts the warning that used to live here**, which said adding a tag was free and
  renaming or removing one was not, because the old string stayed on every photo, stopped
  matching the list, and its checkbox quietly disappeared. Both halves flipped:

  - **Renaming is free now.** The name is on one document and every photo points at it.
  - **Removing is blocked rather than silent.** These are strong references, so Sanity refuses
    to delete a tag in use and names the documents using it. That guardrail is the single
    biggest thing the change buys, and it is why the references are not weak.

  What still costs something is the **slug**, which is the `?tag=` in a shared address and what
  `/shots/all` filters on. Change names freely; leave addresses alone.

  **The cost, which is real and lands on her:** a reference array cannot render as a checkbox
  grid, so tagging a photograph is now "Add item → search → pick" rather than one tick. Weighed
  and accepted — with a vocabulary this size the picker lists every tag at once. If it bites
  across ~250 photographs the shaped fix is a custom input component on that field which reads
  the tag documents and draws the grid back. **Not a plugin**, and not without asking.
  - **Nothing marks which tags are "project" tags and which are browse-only**, and that is
    deliberate. "Does this tag have a page" is answered by whether a gallery points at it —
    one fact in one place, rather than a flag on the tag that could disagree with reality.
    `tag` has exactly two fields and should keep them: no colour, no description, no
    "show in the filter row" toggle, no ordering field.
  - **`structure.ts` has two entries, not one.** *Tags* at the top level is where she edits;
    *Browse by tag*, under Photos, drills into a tag's photographs. They are separate because
    the browse list overrides its child pane to show photographs, which leaves no way in to the
    tag document itself. `PLACED_TYPES` must include `'tag'`, or the safety net at the bottom
    of the file grows a duplicate list at the root.
  - **`tag` is in `NO_DUPLICATE_TYPES`.** Duplicate copies the slug verbatim, so two tags claim
    one address: the filter row shows the same word twice, each showing half the photographs,
    and nothing errors — the slug uniqueness check runs on the document she is editing, not on
    the copy Duplicate made.
- **`excludeFromIndex` is a boolean on `photo`, deliberately not a tag.** It hides a photograph
  from `/shots/all` and from nowhere else — she asked for it so an article's cover photo
  need not appear among her photography. It was very nearly an "Exclude" *tag*, and the reason
  it is not is what tags have become: a tag is a topic, it generates a browse list, and a
  gallery can be pointed at one. An "Exclude" value sitting between "Mexico 2022" and "Street"
  would be one mis-click from a published gallery of exactly the photographs she meant to hide.

  Its scope is narrow on purpose. A flagged photograph still appears wherever she placed it by
  hand — an article cover, a body of prose, a gallery, the front page — because a flag that
  silently emptied those would be a worse surprise than the one it prevents.
- ~~**`web/src/content/tags.ts` is a second copy of the tag vocabulary.**~~ **The file is
  deleted, and the copy does not exist any more.** It held `TAG_LABELS`, typed
  `Record<PhotoTag, string>` against the generated tag union, because the app could not import
  `PHOTO_TAGS` across the package boundary and still needed the human-readable titles for the
  filter row. That was duplication the compiler kept honest, which is a real and useful trick —
  the `PRESETS` map still uses it. But a tag's name is *content* now and arrives with the query,
  so there is nothing to copy. Prefer this outcome to the trick when the choice is available:
  the best-protected duplication is still worse than none.

  `FilterBar`'s prop is `TagOption`, read off `ALL_SHOTS_QUERY_RESULT['tagsInUse']` — a
  generated shape, never hand-written, exactly as `PhotoProjection` is.
- **Two ways a gallery fills itself, and exactly one is visible at a time.** Set `tag` and the
  page shows every photo carrying it, newest first, growing on its own as she tags more. Leave
  `tag` empty and she picks the photos by hand and drags them into order. Setting a tag
  *hides* the photo list rather than greying it out, so there is one answer on screen to
  "where do the photos come from" instead of two fields and a rule to remember.

  The trade is worth stating because it is invisible in the Studio: the tag mode has **no order
  control and no curation**. Every photo with the tag appears, sorted by `dateTaken` desc with
  `_createdAt` as the tiebreak. Hand-picking is the mode for "these fifty, in this order".

  Both modes resolve to one `photos` array in `queries/shots.ts`, so `/shots/[slug]` never
  branches and the presets only ever see photographs.

  **The empty-string trap that used to sit here is gone, and it went with the string.** The
  query's guard was `defined(tag) && tag != ""`, and the second term was load-bearing:
  `defined("")` is true, so a `tag` cleared to an empty string took the tag branch and matched
  nothing, while the Studio read the same value the opposite way and showed her the photo list.
  Form full, page empty, nothing anywhere saying why. A reference has no empty-string state, so
  `defined(tag._ref)` is exact and the two halves agree *by construction*. Both the schema's
  guards and the validation test `._ref` and not the field — `Boolean({})` is `true`, and a
  half-cleared reference would otherwise read as "has a tag". Keep the shape of that bug in
  mind rather than the string: two halves of the system disagreeing, silently, about what
  "empty" means.

  **The reachable-but-broken state is both at once**, and it takes two steps: pick photos, then
  set a tag. Nothing in the form stops it and the photo list is hidden by then, so a
  document-level `validation` in `gallery.ts` catches it and points at the *tag* — the field
  still on screen and therefore still clearable. Pointing at the hidden field would be an error
  she could not act on.
- **Singletons take three separate pieces**, and any one alone leaves a hole: a pinned
  `documentId` in `structure.ts`, `document.newDocumentOptions` and `document.actions` in
  `sanity.config.ts`. `__experimental_actions` does not exist in Sanity v6.
- **Reference arrays need both** `options.filter` on the array *member* (ergonomics — it
  narrows the picker) and `rule.unique()` on the array (the actual guarantee, and the only
  one that catches a paste or a duplicated document). `excludeAlreadyChosen` in
  `schemaTypes/photoPicker.ts` is the shared filter. On the array rather than the member,
  `options` does nothing at all, silently.
  - **A body — `post.body`, `aboutPage.body` — is the exception, and neither half applies.**
    `unique()`
    compares members ignoring `_key`, so on an array that is mostly prose it would reject a
    post using the same short sentence twice. And `excludeAlreadyChosen` reads its `parent`
    as the surrounding array, so inside a `postPhoto` object the parent is the object and
    the filter quietly resolves to "exclude nothing" — a guarantee in appearance only. Both
    are left off deliberately; repeating a photograph inside one essay is legitimate.
- **Prose fields are plain `text`, never Portable Text — except `proseText`, `post.body` and
  `aboutPage.body`.** Short intro/caption text stays plain. Rich text exists only where her
  writing carries meaning plain text cannot: italicised titles and links out. The two bodies
  are the same shape and the same exception — a bio is prose with photographs in it, which is
  what `post.body` already was.
  - **`homePage.featuredTitle` and `.featuredSubtitle` are `proseText` too**, and the title
    is the one *heading* on the site that can carry emphasis. Her own copy asked for it:
    "Getting a Handle on @joanatstake" wants the handle set apart. Nothing was added to
    `proseText` to allow it — the type already offered bold, italic and a link, and this
    only widened which fields use it. Reach for the same move before ever adding a mark.
  - **A rich-text heading needs `ProseHeading`, not `ProseText`.** Portable Text renders one
    element per block, and a `normal` block is a `<p>` — so pointing `ProseText` at a heading
    produces a `<div>` wrapping a `<p>` that merely looks like one, with nothing in the
    document outline. `ProseHeading` makes the `<h2>` the real element and overrides
    `components.block.normal` so a block renders as nothing but its children.
    - The reason it needs its own root element at all: **`<PortableText>` renders no wrapper of
      its own**, so there is nothing for a heading's element or a wrapper's vertical rhythm to
      sit on unless the caller supplies one. That is what the `<div>` in `ProseText` is for.
    - **The Vue version of that note described a trap, and the trap is gone.** `SanityContent`
      set `inheritAttrs: false`, so a `class` handed to it was silently dropped — and the
      block components needed `inheritAttrs = false` of their own or every render warned about
      block props landing on the element as junk attributes. React passes only what a component
      destructures, so both halves simply do not exist. What survives is the *structural* half:
      the wrapper is still required, and typography classes are now an explicit `className`
      prop rather than attribute fallthrough.
    - `featuredTitle` is capped at one block by `rule.max(1)`, because Enter in the editor
      otherwise makes a second paragraph that would render inside the same heading.
  - The restriction is the whole point, and it lives in `objects/proseText.ts`. **The
    `styles`, `lists` and `marks` arrays REPLACE Sanity's defaults rather than extending
    them** — the same trap as `photo.image.options.metadata`, failing the same quiet way.
    Omit `styles` and h1–h6 come back; omit `lists` and bullet lists come back; omit
    `decorators` and code, underline and strike-through come back. `lists: []` is
    load-bearing. Underline is left out on purpose: on the web an underline reads as a
    link.
  - `proseBlock(styles)` is a function, not a shared constant, so each schema type gets its
    own object. `proseText` and `aboutPage.body` pass one style; `post.body` passes three.
    A bio starts at one because adding a style later costs a line and removing one she has
    already used leaves blocks whose style no longer matches the list.
  - **`rule.max(n)` changes meaning when a field becomes `proseText`: it counts characters on
    a `string`/`text` and array *members* on Portable Text.** A carried-over `rule.max(500)`
    keeps validating and silently guards nothing — the same line, quietly weakened. That is
    why `featuredSubtitle`'s length guard is a hand-written `rule.custom` that walks down to
    the spans, where the text actually lives.
  - **`postPhoto.layout` is a preset, and it is the one place that distinction has been
    tested.** The object's own comment used to end "do not add a width, a size, an alignment or
    a 'full bleed' toggle to it", and a full-width option looks exactly like the last of those.
    The line Rule 2 actually draws: it forbids *positioning* — a width, a column count, a crop
    offset, a breakpoint, numbers she sets per photograph — and explicitly permits *presets*,
    "components that guarantee the result works at every width". `layout` is a fixed list of
    two, carries no numbers, and both branches are responsive on their own terms, so it is the
    second thing. What must still never appear there: a width, a percentage, an alignment, or
    anything that only makes sense at one screen size.

    Two consequences worth knowing before touching it. The class map in `BodyPhoto.tsx` is
    `satisfies Record<Layout, string>` over the schema's union, so a third value without a
    branch is a typecheck failure — the same pairing guarantee `PRESETS` gives for galleries.
    And **the alternating float had to leave CSS**: it was `nth-of-type(odd/even)` on the
    figures, which counts full-width photographs too, so one in the middle silently put the
    wrapped photographs on either side of it on the same side. `ProseBody` now counts only the
    wrapped ones and passes the side down. The field is deliberately optional — every
    photograph placed before it existed reads as `wrap`, so nothing already published moved.
  - **A photo inside a body is a `postPhoto` object wrapping a reference, not a bare or
    named `reference` member.** A *named* reference member looks like the tidier answer and
    is a trap: typegen extracts it as `_type: "reference"` while the editor writes the
    name, so the generated types and the stored documents silently disagree. The wrapper
    also lets the editor show the actual photograph inline instead of a reference chip.
    Never add a field to it — see the Rule 2 note in `objects/postPhoto.ts`.
- `@sanity/icons` v5 has no root named exports: `import {ImageIcon} from '@sanity/icons/Image'`.
  The root import type-checks and then fails at bundle time.

## Directory structure

Two sibling packages, each with its own `package.json` and its own `node_modules`. Nothing
is shared between them at the dependency level — the only coupling is that the Studio's
typegen writes a types file into the app. `✎` marks what exists today; the rest is the
target shape.

```text
CLAUDE.md                   ✎ Repo-wide charter. Stays at the root.
DESIGN.md                   ✎ The design spec — colours, type scale, radius, component
                              chrome. Currently Wired-derived: three type faces, square
                              corners, hairline dividers, no chromatic accent. Implemented in
                              web/src/app/globals.css, with TWO deliberate departures:
                              the canvas is cream, not white, and --color-accent exists at all
                              (a deep maroon; the spec forbids a chromatic accent outright).
                              Both are argued in the CSS beside the token. It has been swapped
                              twice already — see "The design system" in Conventions for what a
                              swap is and is not allowed to move.
.env.example                ✎ Root env, for scripts/ only
.worktreeinclude            ✎ Gitignored files Claude Code copies into a new worktree

web/                        ✎ The Next app. Vercel's root directory.
  package.json              ✎ next, react, react-dom, @sanity/client, groq,
                              @portabletext/react. Dev: typescript, tailwindcss,
                              @tailwindcss/postcss, the @types. No Vue, no Nuxt.
  next.config.ts            ✎ redirects() only. Four 307s for her old addresses.
  vercel.json               ✎ `"framework": "nextjs"`, and nothing else. Pins the preset
                              rather than letting auto-detection guess — see below.
  postcss.config.mjs        ✎ @tailwindcss/postcss. The whole Tailwind wiring.
  tsconfig.json             ✎ paths: @/* -> ./src/*, ~~/* -> ./*
  next-env.d.ts               GENERATED by next. Committed.
  .env.example              ✎ SANITY_* only — nothing public, see Environment variables
  sanity.types.ts           ✎ GENERATED by studio typegen — do not edit by hand.
                              Committed: Vercel builds web/ and never runs typegen.
                              Stays at the web root; tsconfig's glob picks it up, so the
                              `typescript.tsConfig.include` workaround Nuxt needed is gone.
  public/                   ✎ joan-animated.png, the sidebar's illustrated portrait. Nothing
                              here is processed at build time.
  src/
    app/                      The App Router. A directory is a route; page.tsx is the page.
      layout.tsx            ✎ <html lang>, metadata + title template, globals.css, the
                              NavDrawer provider, the sidebar and the main column. The only
                              layout. Server Component: SiteNav and every page pass through
                              it as props, which is what lets the client shell wrap them.
      globals.css           ✎ The design system. Type, colour and container width are decided
                              here and nowhere else. Was app/assets/css/tailwind.css and
                              moved verbatim. See Conventions.
      error.tsx             ✎ 'use client' — where a thrown SanityUnreachableError or
                              MissingDocumentError lands. HTTP 500.
      not-found.tsx         ✎ The 404. Reached by notFound() and by unrouted addresses.
      page.tsx              ✎ LIVE — / : the photo grid and featured writing, from Sanity
      bio/page.tsx          ✎ LIVE — /bio : intro and body. Every photograph on it comes from
                              the body, as postPhoto members; there is no photo field.
      copy/page.tsx         ✎ LIVE — /copy : posts and links out, newest first
      copy/[slug]/page.tsx  ✎ LIVE — one post, body and all. generateStaticParams.
      shots/all/page.tsx    ✎ LIVE — the index of every photo. STATIC ROUTE, so it shadows
                              [slug] — gallery.ts refuses that slug. Server half only: it
                              owns searchParams, the first page and the deep-link lookup.
      shots/[slug]/page.tsx ✎ LIVE — one gallery, through its preset. No shots/page.tsx:
                              /shots itself was a stub and is gone, so it 404s while its
                              children do not.
      contact/page.tsx        Not built. Text and links only — see Non-goals.
      admin/route.ts        ✎ 302 redirect to SANITY_STUDIO_URL. force-dynamic — see below.
      api/photos/route.ts   ✎ One further slice, for infinite scroll. The site's ONLY
                              endpoint the browser calls, and the reason no env var is public.
      api/photos/[id]/route.ts ✎ One photo by id, for a showcase deep-linked past page 1.
    sanity/
      client.ts             ✎ 'server-only' + createClient. No defaults: an unset variable
                              throws at module scope and fails the build.
      fetch.ts              ✎ sanityFetch + orThrow + REVALIDATE. Every read goes through it.
      errors.ts             ✎ SanityUnreachableError, MissingDocumentError
      queries/              ✎ GROQ, one file per route
        photo.ts            ✎ The shared photo projection, and PHOTO_BY_ID_QUERY for the
                              showcase's deep links. Not a route — see Conventions.
        nav.ts              ✎ NAV_QUERY — the galleries listed under START. Not a route
                              either: it is chrome, read on every page.
        allShots.ts         ✎ ALL_SHOTS_QUERY (first page, total, tags in use) and
                              MORE_PHOTOS_QUERY (one further slice). Filters on $filterTags —
                              an array of slugs, union semantics — and NOT $tag; see the
                              reserved-key note in Conventions. Exports TagOption and
                              PAGE_SIZE, which the page and the route handler must share.
        home.ts             ✎
        shots.ts            ✎ GALLERY_QUERY — one gallery, both fill modes resolved to one
                              `photos` array. Read the `^` scoping notes before editing it.
        writing.ts          ✎ WRITING_QUERY (the list, plus the featured piece), POST_QUERY
                              (one post) and POST_SLUGS_QUERY (generateStaticParams). Owns
                              WRITING_ITEM_PROJECTION, which home.ts imports — the front
                              page's cards are the same union.
        about.ts            ✎ ABOUT_QUERY — the bio, body dereferenced
        contact.ts            Not built.
    components/
      SanityPhoto.tsx       ✎ The only place an <img> is emitted for a photograph (see
                              conventions). Deliberately not next/image.
      SiteSidebar.tsx       ✎ 'use client'. All the chrome: wordmark, byline, nav, socials,
                              copyright. The desktop column AND the mobile drawer, one
                              instance — see the single-<h1> note in the file. There is no
                              SiteHeader and no SiteFooter; this replaced both. Owns every
                              drawer effect.
      SiteNav.tsx           ✎ async Server Component. Runs NAV_QUERY and swallows its error —
                              the only place on the site that does.
      SiteNavList.tsx       ✎ 'use client'. The nav itself: usePathname for the active state,
                              and the collapse toggle.
      MainColumn.tsx        ✎ 'use client'. <main inert={isOpen}> and nothing else.
      NavDrawerContext.tsx  ✎ 'use client'. Drawer state and actions ONLY — no effects; it
                              has three consumers, so an effect here would be three listeners.
      SiteSocialIcon.tsx    ✎ Four hand-written glyphs. Named Site* because content/site.ts
                              already exports a `SocialIcon` *type* and the two would collide.
      ProseText.tsx         ✎ Renders a proseText field via <PortableText>
      ProseHeading.tsx      ✎ The same, as a real <h2> — see the note above. NO CALLER right
                              now: it rendered homePage.featuredTitle above the photographs,
                              and that field is looking for a new home. Not dead code yet.
      ProseLink.tsx         ✎ The `hyperlink` annotation inside one. The only user of
                              --color-link.
      ProseBody.tsx         ✎ A body of prose with photos in it — post.body and aboutPage.body
      BodyPhoto.tsx         ✎ The postPhoto member of one, floated and wrapped by the text
      about/                ✎ Intro — the heading and introduction at the top of /bio.
                              Was `home/Hero.vue`; moved with the fields it renders.
      home/                 ✎ FeaturedWriting, PhotoStrip.
                              PhotoStrip no longer owns a layout: it uses the `grid` preset
                              through renderPhoto so each photo can become a link. The name is
                              now a lie worth fixing the next time that file is opened.
      writing/              ✎ Lead — the leading piece, with the eyebrow passed in as a prop
                              because LATEST is a claim about the date and stops being true
                              when she features something older; Row — one ledger row;
                              WritingLink — post vs article destination, one place, now used
                              by FeaturedWriting too. Named `writing/` still: only the route
                              said /writing.
      shots/                ✎ FilterBar — the tag filters on /shots/all, built from
                              DESIGN.md's button-outline / button-primary pair. Real <Link>s,
                              so the filter is in the URL, shareable, and reaches the server.
                              Multi-select with a CLEAR that appears only when something is
                              selected; there is no ALL chip.
                              AllShotsView / GalleryView — the 'use client' halves of the two
                              /shots pages. GalleryView holds the PRESETS map.
                              PhotoShowcase — one photograph alone, and every effect that
                              goes with it. PhotoLink — the clickable wrapper both views drop
                              into a preset's renderPhoto; a plain <a>, never <Link>.
                              useShowcase.ts — the showcase's route state, pushState
                              navigation and scroll save/restore. No fetching, no listeners.
      presets/              ✎ One component per layout preset, and the list is exhaustive by
                              typecheck — see the PRESETS map in shots/GalleryView.tsx.
                              GalleryGrid (wrap-and-fill rows, also used by the front page)
                              and GalleryStack (full-measure column). types.ts holds the
                              shared GalleryPresetProps both must satisfy.
    content/                ✎ Site chrome only. tags.ts is gone — a tag's name is content
                              now and arrives with the query.
      site.ts               ✎ Wordmark, tagline, nav, social links. Deliberately never CMS
                              content. (Was "footer links" — there is no footer any more.)
    lib/                    ✎ date.ts — formatDate/formatShortDate. UTC note in it.
                              photo.ts — photoRatio(), shared by GalleryGrid and the showcase.
                              showcase.ts — readTags/readPhotoId/showcaseHref/viewKey/
                              isModifiedEvent. Pure functions, called from BOTH sides of the
                              server boundary so the two cannot disagree about an address.

studio/                     ✎ Sanity Studio. Standalone, deployed separately.
  package.json              ✎ sanity, react, styled-components, @sanity/vision
  sanity.config.ts          ✎ Schema registry, structure, singleton locking. No basePath
                              — the deployed Studio is served at its own host's root.
  sanity.cli.ts             ✎ projectId, autoUpdates, schemaExtraction, typegen paths
  structure.ts              ✎ Sidebar shape + SINGLETON_TYPES + PLACED_TYPES
  dataset.ts                ✎ requireDataset() — throws when unset, never defaults
  promote.mjs               ✎ development → production. Here, not scripts/, because it
                              authenticates as the CLI user and needs no write token.
  .env.example              ✎ SANITY_STUDIO_DATASET only
  .promote/                   GENERATED — dataset tarballs and backups, gitignored
  schema.json                 GENERATED — typegen intermediate, gitignored
  migrations/               ✎ CLI content migrations. Authenticate as the logged-in CLI
                              user, so no SANITY_WRITE_TOKEN — same reason promote.mjs
                              lives here rather than in scripts/.
                              create-tag-documents, then tags-to-references. TWO runs, in
                              that order, and never merged: `migrations run` submits
                              transactions concurrently, so a reference written in the same
                              run that creates its target fails on integrity partway through.
  schemaTypes/
    index.ts                ✎ Schema registry
    photoPicker.ts          ✎ excludeAlreadyChosen — shared reference-picker filter
    documents/              ✎ photo, gallery, tag, post, article,
                              homePage, writingPage, aboutPage,
                              contactPage, siteSettings
    objects/                ✎ link, postPhoto, proseText, featuredPhoto

scripts/                      Still empty. The promote deliberately is not here — see above.
  seed.ts                     Writes stock content to `development`
```

**`web/` is Vercel's root directory** — set it in project settings, or Vercel will try to
build the repo root and find no app. It was `web/` under Nuxt too, so the port did not move it;
this is the one Vercel setting that still lives only in the dashboard, because `vercel.json` is
read *from* the root directory and so cannot declare where it is.

**The framework preset is pinned in `web/vercel.json`, and it is there because auto-detection
got it wrong the moment `nuxt.config.ts` was deleted.** Merging the port turned the live site
into a 404 on every route. The code was fine — `next build` on the merge commit produces the
whole route table — and the preset was not: with no framework detected,
Vercel's Output Directory defaults to "`public` or `.` root directory", so it uploaded
`web/public/` as a **static site**, found no `index.html`, and served a platform 404 everywhere.
The deploy went green. `"framework": "nextjs"` overrides the dashboard preset (Vercel's word is
"overrides"), so the next auto-detect cannot make the same guess.

**The signature is worth memorising, because a green deploy serving nothing looks like nothing.**
It reads as a Next.js 404 and is not one:

| | A Next.js deployment | This failure |
| --- | --- | --- |
| `/` | HTML, referencing `/_next/static/…` | `text/plain`, `NOT_FOUND`, no HTML |
| Body of an unknown route | `not-found.tsx`, HTML, site chrome | `text/plain`, `NOT_FOUND` |
| **A generated asset named in that HTML** | **200** | **nothing to name — `/` served no HTML** |
| A file in `public/` | 200 | 200 — the only thing that resolves |
| `x-matched-path`, `x-vercel-cache` | present | absent |

**No single row is the diagnosis** — note that `public/` is 200 in both columns, which is exactly
what makes the failure legible rather than obvious. It is the *pair* that identifies it: a file in
`public/` serving while `/` returns plain text means Vercel is serving `public/` as a directory.
The last row is supporting evidence, not proof; the asset row is the confirmation.

**Read the asset path out of the page — never invent one.** A path under `/_next/static/` that
does not exist returns **404 on a perfectly healthy deployment**, measured against a known-good
Next site, so a guessed path proves nothing and reads as though Next were absent:

```sh
H=https://<host>

curl -sS -o /dev/null -w '/            -> %{http_code}\n' "$H/"
curl -sS -o /dev/null -w '/public file -> %{http_code}\n' "$H/joan-animated.png"  # 200 either way

# The confirmation: an asset the page itself names, rather than one made up.
A=$(curl -sS "$H/" | grep -oE '/_next/static/[^"]+\.js' | head -1)
echo "asset: ${A:-NONE — / served no HTML, so nothing Next is running}"
[ -n "$A" ] && curl -sS -o /dev/null -w "asset        -> %{http_code}\n" "$H$A"
```

An empty `$A` is itself the answer, and it is why the extraction is written to survive the failure
case rather than assuming the page parses.

**What `vercel.json` does not fix, and must not be assumed to.** It sets `framework` and only
`framework`. An **explicit** Output Directory or Build Command override left in the dashboard
from the Nuxt project still wins, because vercel.json overrides a dashboard setting only for the
keys it actually declares. Those overrides have to be cleared back to the framework default by
hand, once. Do not add `outputDirectory` here to force the issue — Next on Vercel is built by the
framework builder rather than by copying a directory, and naming one would be a second wrong
answer rather than a safety net.

**Also note the failure that did *not* happen, because it changes where to look first.** A build
that *fails* leaves the previous deployment aliased **when there is one** — so on a project with
deployment history, the old site keeps serving and a red build usually does not present as a 404.
That inference does not hold on a first deployment, or where the previous production deployment
was deleted or the alias reassigned: then there is nothing to fall back to and a failed build
does show as a 404.

So on *this* project, which had a working Nuxt deployment, a 404 on every route pointed at
project settings before the build log — and that is the opposite of where the missing-`SANITY_*`
blocker in *Open questions* points, which is what made the two easy to confuse when they landed
in the same deploy. Treat it as an ordering heuristic rather than a proof: a 404 on every route
is also what an unassigned alias, a domain pointed elsewhere, a misconfigured Root Directory or a
deleted project look like, and the table above is what separates "serving the wrong thing" from
"serving nothing at all".

## Conventions

### The design system

**`DESIGN.md` is the spec; `web/src/app/globals.css` is the implementation.** Colour,
type, radius and container width are decided in that one file's `@theme` and `@utility` blocks,
and nowhere else. The file itself carries the reasoning; what belongs here is the part that
constrains everyone.

**`DESIGN.md` is replaceable, and the layout is not.** It has been swapped twice — Wired to a
Clay-derived system and back again — and the sidenav shell survived both untouched while every
token under it changed. Treat that as the contract: a new spec re-skins `tailwind.css` and the
`type-*` call sites, and it does not get to re-open the shell, Rule 1 or Rule 2. If a spec seems
to require moving the layout, say so before writing code.

**The canvas is cream `#fffaf0`, and DESIGN.md says `#ffffff`.** That is the one deliberate
disagreement between spec and implementation, made as a product decision and kept across the
swap back. Everything else in the spec is followed: the black-and-white duet, the square
geometry, the hairline dividers, the three faces. `--color-canvas-soft` is derived from it
rather than picked — the spec steps `#ffffff` to `#f5f5f5`, and the same per-channel multiplier
against `#fffaf0` gives `#f5f0e7`, so the pair stays as related as it was. Expect exactly these
two hexes to differ when reconciling the file against the spec, and no others.

**Type is set with a `type-*` utility and never with `text-*` + `leading-*` + `tracking-*` +
`font-*` at a call site.** There is one per DESIGN.md typography token, and each sets **all
five** of family, size, line-height, letter-spacing and weight — even when a value is `0em`.
That is not tidiness: custom utilities sort *before* core ones in the emitted CSS, which is
what lets a call site override with `tracking-[0.1em]`, and the same ordering means
`type-display-sm lg:type-display-md` would leak the smaller token's *omitted* properties past
the breakpoint. Responsive steps live inside the token, via `@variant`.

**No token carries `text-transform`.** `SITE.nav` stores sentence-case labels deliberately, so
assistive tech reads "Copy" rather than spelling it out, and a transform hidden inside a type
token is how that decision gets lost. `uppercase` stays a class at the call site, beside the
text it changes. The failure when this is forgotten is quiet and looks like a bug in the font:
a token whose tracking assumes capitals renders as wide-spaced lowercase.

**Removing a colour token is silent, so the grep is the check.** Verified against
tailwindcss@4.3.3: with a token absent, a class like `hover:text-brand` emits zero rules — no
warning, no error, the class simply stays in the markup doing nothing. After any palette change,
grep the old token names across `web/src` and expect hits only in prose. That is the only thing
standing between a deleted token and a stale class that looks fine in review.

(This example used to be written with `text-accent`, which was safely fictional at the time and
is not any more — `--color-accent` exists. Pick a name for the next demonstration that nothing
could plausibly add.)

**Fonts are hotlinked from `fonts.gstatic.com`, not vendored.** Playfair Display, Lora and
Inter — DESIGN.md's own named substitutes for its three proprietary faces. Google rotates the
path hash per revision, so a republish can 404 them and drop the site silently to Georgia and
system sans; the fallback chains in `@theme` are the mitigation and must stay real chains. The
re-derivation command is in the CSS comment, and its `User-Agent` header is load-bearing.

Playfair is pinned to weight 400 while Lora and Inter are variable ranges, and that asymmetry
is measured rather than assumed — the byte counts and the one thing it costs are in the CSS
comment. Re-check it if the face set ever changes; the answer is not the same for every family.

**The radius scale is `{rounded.none}` — Tailwind's named steps are unset in `@theme`.** The
spec calls square corners non-negotiable, so `rounded-md` and friends resolve to nothing rather
than sitting there to be reached for. `rounded-full` survives deliberately and is the one
exception the spec allows, "circular icon containers only": exactly one call site, the social
links in the sidebar. `grep -rn "rounded-" web/src` should return that one and nothing else.

It was two until /copy's rows became a ledger and their circular thumbnails became squares.
Nothing about the rule changed — the surviving call site is an icon container, which is what
the exception is for, and the one that went was a photograph wearing a radius.

Worth keeping straight across spec swaps, because the previous one was built on generous radii:
**a corner radius is not a crop.** It is a surface treatment — `SanityPhoto` reads the box from
the asset's own metadata and the CDN URL carries a width, a format and a quality, with no `fit`
and no `rect`. Rule 2 is about who decides framing, and rounding a corner decides nothing. So
`rounded-*` on a photograph is a design question, free to come and go with the spec;
`object-cover` on one is a Rule 2 question and is not.

**A bound is not a crop either, and the difference is whether the ratio survives.** A `max-*`
shrinks the photograph and loses nothing, so it is a layout decision; a fixed `w`/`h` pair or an
`object-cover` selects part of it, which is framing and belongs to Rule 2.

The distinction is worth keeping even though the case that prompted it went the other way, and
the history is the useful half. /copy's lead photo was first *bounded* — `md:max-h-[200px]
md:w-auto md:max-w-full`, so a 2500×3333 cover rendered 150×200 with its proportions intact and
a 3000×1000 panorama rendered 300×100 instead of overrunning its track. It behaved exactly as
described and it looked wrong: the 300px column sat half empty and the block's right edge moved
with whatever she uploaded. It is now `crop="lead"`, a real 300×200.

So the rule is not "bounding good, cropping bad". It is that **a crop is a decision with a named
owner and a written cost, and a bound is not.** Reach for the bound when the shape genuinely does
not matter. When it does, make the crop a `CROPS` entry with the argument written down, rather
than a class at a call site — a `max-h-*` on a photo is a design choice, an `object-cover` on one
is a conversation.

### Queries and types

**GROQ lives in `web/src/sanity/queries/`, one file per route. Never inline in a component.**
A query is the contract between a route and the content model. Keeping them in one directory
means a schema change has one obvious place to look for breakage, and typegen can find them.

`queries/photo.ts` is the one file there that is not a route, and it holds `PHOTO_PROJECTION` —
the fields every query selects when it dereferences a photo. Rule 1 means every route reaches
photographs the same way, so the alternative was the same seven lines pasted into six query
files and a `SanityPhoto` that accepts six separately-maintained shapes. **Typegen resolves the
interpolation**, verified: `${PHOTO_PROJECTION}` inside `defineQuery` produces a fully typed
result, not `unknown`. It also exports `PhotoProjection`, read back off a generated query result
rather than hand-written, because a hand-written shape sitting parallel to a generated one is
exactly how a query and a component drift.

**Queries are declared with `defineQuery` from `groq`.** Sanity's typegen only extracts and
types queries wrapped in `defineQuery()`. A raw template literal produces no type and
silently opts that route out of type checking.

```ts
// web/src/sanity/queries/trip.ts
import { defineQuery } from 'groq'

export const TRIP_QUERY = defineQuery(`
  *[_type == "gallery" && slug.current == $slug][0]{
    title, preset,
    photos[]->{ _id, alt, caption, image }
  }
`)
```

Note the `->` dereference. Galleries store references; queries resolve them. That is Rule 1
showing up at the query layer.

`groq` is a direct dependency and `defineQuery` is imported explicitly in every query file.
It is a tiny package — `defineQuery` is an identity function whose whole job is preserving the
literal type — and typegen's parser reads these files, so being explicit costs nothing.

**Every read goes through `sanityFetch` in `web/src/sanity/fetch.ts`, and four things about its
signature are load-bearing.** The file carries the long version; the parts that constrain
callers:

- **It returns `{ data, error }`, not a bare result.** That is what makes "check the transport
  failure before the null" a property of the type rather than a convention — see *Errors* below.
- **`ClientReturn<Q, unknown>`, never the bare default.** `client.fetch`'s own fallback is
  `Any` — that is, `any`. So if `sanity.types.ts` ever falls out of the TypeScript program, the
  old behaviour is that every route keeps compiling and silently stops being typechecked.
  Pinning the fallback to `unknown` turns that into a compile error at the first property
  access. **A green typecheck is not evidence the types are live; a red one is.** The check, and
  it takes thirty seconds: point a result at a field that does not exist and confirm the
  compiler rejects it *naming the real shape*; then hand `sanityFetch` a query string that is
  not in the generated map and confirm the result is `unknown` rather than `any`.
- **`const Q extends string`**, mirroring `defineQuery`'s own signature, so a query's literal
  type — interpolations already resolved — reaches the `SanityQueries` map. Widen it to
  `string` and every result becomes the fallback.
- **Naming the result type *inside* the helper** is what sidesteps the overload trap below. One
  non-overloaded signature covers both the no-params and with-params call shapes.

**`client.fetch` is overloaded four ways, and a params object of plain values matches
`QueryWithoutParams` first.** A direct call therefore resolves to the no-params overload and
reports "string is not assignable to undefined" — an error about the overload it landed on
rather than about the call. This is why there is exactly one `client.fetch` call site on the
site. Do not add a second; add a query and let `sanityFetch` take it.

**A GROQ parameter cannot be named after a fetch option, and the error will not tell you
that.** `QueryParams` in `@sanity/client` declares a list of keys as `never` — `tag`, `query`,
`perspective`, `signal`, `token`, `cache`, `headers`, `method`, `body`, `timeout`, `next` and
more — on the grounds that passing one as a GROQ parameter is nearly always a mistake. `tag` is
Sanity's request tagging. A parameter named `$tag` therefore fails with **"Type 'string' is not
assignable to type 'undefined'"**, which names the overload the call fell through to and says
nothing about the collision. `/shots/all` filters on `$filterTags` for exactly this reason.
Check that list before naming a parameter after anything that sounds like a request setting.
**This is a `@sanity/client` fact and not a framework one** — it survived the port from Nuxt
unchanged and will survive the next one.

### Caching

**One number, at the fetch layer.** `REVALIDATE` in `sanity/fetch.ts` is 60 seconds, and it is
passed as `next: { revalidate }` on *every* read. Next then derives a route segment's own
revalidate from the lowest among the fetches it makes, so `/`, `/bio`, `/copy` and
`/copy/[slug]` prerender and revalidate on their own — confirm in `next build`'s output, which
prints the interval per route.

**There is deliberately no `export const revalidate` on any page**, and two reasons:

- Next's implicit caching only covers fetches discovered *before* a request-time API is used,
  and `/shots/all` awaits `searchParams` first. Relying on the segment default would cache every
  route except the one page that pages. Stating it on the fetch removes the asymmetry.
- A segment export must be a **literal**, read by static analysis rather than evaluated —
  `export const revalidate = REVALIDATE` fails the build with "Invalid segment configuration
  export". So it would mean the number in two places, with the second copy unable to reference
  the first.

**Both `/shots/*` routes are dynamic, and that is a decision.** They read `searchParams` for the
showcase. `generateStaticParams` there would look like an optimisation and do nothing, which is
why it is absent from `/shots/[slug]` and present on `/copy/[slug]`. What it costs is one React
render per request; it is *not* a Sanity request per request, because the read comes from the
Data Cache. What it buys is in *The showcase*: a shared `?photo=` link server-renders the
photograph, with its caption as the `<title>`.

One thing worth knowing before any query grows: **`@sanity/client` switches from GET to POST
above 11,264 encoded characters**, and Next's Data Cache does not cache POSTs. Every query here
is far under. A query that crosses that line stops being cached with nothing saying so.

### Errors

**Check the transport failure before the null.** A failed request and an empty result both leave
you holding `null`, and they mean opposite things — the CORS history in *The Studio* is the
archetype, and it cost real debugging time.

`orThrow(await sanityFetch(...))` makes that structural: it throws `SanityUnreachableError` on a
transport failure and hands back a value that, for a `*[…][0]` query, is still `X | null`. So the
second check stays a second check and stays at the call site, **where the answer differs**:

| Missing | Route | Because |
| --- | --- | --- |
| `homePage` | 500, `MissingDocumentError` | A singleton the Studio will not let her delete — the dataset is wrong. |
| `aboutPage` | 500, `MissingDocumentError` | Same. |
| `writingPage` | *nothing* | It holds a tab title and an optional intro; the page's content is the list beside it. Absent costs a paragraph. |
| a `post` / `gallery` by slug | 404, `notFound()` | Nothing guarantees the document exists; the address may be mistyped or changed. |
| a `?photo=` id | **a message in place** | A query parameter must never replace a working page with an error screen. |

Two things this gave up, both deliberately:

- **The 502 is gone; both errors are HTTP 500.** App Router gives a page no way to set a status —
  `notFound()` is the only exception. Nothing consumed the 502, and the distinction survives
  where it was actually used: `Error.name` in the server log.
- **Production redacts the message.** `error.tsx` receives a generic string and a `digest` hash;
  the real error, with its `cause`, is in the Vercel function log. That is the same hardening
  Nuxt did, and the reason the page prints the digest.

`SiteNav` is the **only** place that swallows a query error, and it does not use `orThrow`. The
nav is chrome on every page: a Sanity outage taking down the whole site because four gallery
links could not be listed would be worse than the failure it reports. That exception is now more
conspicuous, not less, because it is the one call site that opts out of the helper.

### Server and client

A `'use client'` directive is only needed at a **boundary** — a module imported by a Server
Component that itself needs hooks or event handlers. Anything imported by a client component is
already in the client graph and needs no directive of its own.

There are ten, and `grep -rln "^'use client'" web/src` is the list: `NavDrawerContext`,
`SiteSidebar`, `SiteNavList`, `MainColumn`, `AllShotsView`, `GalleryView`, `PhotoShowcase`,
`PhotoLink`, `useShowcase.ts`, and `error.tsx`. Everything else — every page,
every prose component, `SiteNav`, `FilterBar`, `PhotoStrip`, `FeaturedWriting`, `Lead`, `Row`,
`Intro` — is a Server Component.

**`SanityPhoto`, `GalleryGrid` and `GalleryStack` carry no directive and are dual-use**, and
that is what makes the presets' `renderPhoto` render prop legal. The front page passes one from
a Server Component; `AllShotsView` passes one from a client component; because the presets are
never marked, the function never crosses a boundary in either direction. **Marking a preset
`'use client'` would break the front page** with "functions cannot be passed to client
components" — so if one ever needs a hook, the render prop has to be reconsidered at the same
time.

Two client components exist only because of one attribute each — `MainColumn` for `inert`,
`SiteNavList` for `usePathname`. Splitting them off keeps the pages themselves on the server.

**`useSearchParams()` must not appear in the root layout's tree.** In a *prerendered* route it
drops everything below the nearest Suspense boundary out of the static HTML; from the layout
that would be every page on the site. `SiteSidebar` closes the drawer on `usePathname` alone for
this reason, and nothing in the chrome needs the query string.

**Types are generated, never hand-written.** `web/sanity.types.ts` is output from
`sanity schemas extract` + `sanity typegen generate`, run from `studio/`. Do not hand-edit it, do not write a
parallel `interface Photo` somewhere, and do not `as any` past a type error — a type error
here means the query and the schema disagree, which is information, not an obstacle. If a
type looks wrong, fix the schema or the query and re-run typegen.

### Photographs

**Every image on the site renders through `SanityPhoto`.** One component, no exceptions —
not in presets, not in the hero, not in the Studio preview.

It is responsible for:
- `srcset` / `sizes` off the Sanity image CDN, so phones don't download desktop pixels
- LQIP blur-up placeholder from the asset's metadata
- Aspect-ratio reservation, so nothing shifts as images load
- `alt` sourced from the photo document — never passed in ad hoc by a caller

Centralizing this is what makes ~250 photos on a phone connection acceptable. A raw `<img>`
or a bare CDN URL anywhere in the app is a bug.

It takes a whole photo projection and **not** an `alt`, an aspect ratio, a size, or a crop
offset. Passing `alt` per call site is how one photograph ends up described two ways; passing
a shape is a framing control, which is Rule 2's whole subject. By default the box is the
photograph's own proportions, read from the asset metadata, and the CDN URL carries a width, a
format and a quality — no `fit`, no `rect` — so the no-crop rule holds at the URL and not merely
by convention.

The one exception is the `crop` prop, which selects one of the named presets in `CROPS` —
`crop="square"` for preview thumbnails, `crop="lead"` for the /copy lead — each with its own
centred framing and its own much shorter srcset ladder. It takes a name and never dimensions or
an offset, so a call site still cannot invent a framing. See the thumbnail note in *The content
model* for why the list exists and what each entry costs.

**It is deliberately not `next/image`.** That would put Vercel's optimiser in front of an image
CDN that already does everything it does — a second transform of an already-transformed file,
billed per source image, to re-derive a width and a format Sanity negotiated. It would also move
the srcset ladder, the format choice and the placeholder behind a component this project does
not control, which is the opposite of the rule above: the value here is that one file decides
all of it and the decisions are readable. **The no-upscale clamp has no `next/image` equivalent
at all** — every candidate width is capped at the asset's own, and for a crop at what the source
can fill *at that ratio*, so a 599px original is offered at 400w and 599w and stops.

The same argument covers `public/joan-animated.png` in the sidebar: a static file, already at
the size it renders, with no second pipeline needed to serve it.

**Every *photograph* renders through one `<img>`, and `grep -rl "<img" web/src` is the check.**
It finds two *files*, and the count is the thing to read rather than the number: `SanityPhoto`,
and the illustrated portrait in `SiteSidebar` — a static asset that is site chrome rather than
one of her photographs, so it has no photo document, no alt from Sanity and nothing to
dereference. A third file is a bug until argued otherwise.

(`-l` rather than `-n`, because both files also *discuss* `<img>` at length in their comments —
a line-count grep returns six and reads like a violation. The two actual elements are
`SanityPhoto.tsx` and the portrait in `SiteSidebar.tsx`.)

It was briefly two for a much worse reason: `SitePhoto` and `RichParagraph` were static twins
of `SanityPhoto` and `ProseText` serving /copy while that page was on Unsplash placeholders.
All three — both twins and `~/content/writing` — died when /copy got its query. The
alternative considered at the time, teaching `SanityPhoto` to also accept bare URLs, would have
put a permanent hole in the rule to paper over a temporary one.

### The schema wins

**Sanity schema files are the source of truth for the content model.** Not this document,
not the generated types, not the GROQ queries. Schema changes flow outward:
schema → `typegen` → queries → components. When they disagree, the schema is right and the
rest needs updating.

**The app never writes to Sanity.** All content mutation happens in the Studio, in
`studio/promote.mjs`, or in `scripts/`. No write token in app code, no mutation endpoints, no
server routes that POST to the Content Lake.

## Commands

There is no root `package.json`. Next commands run from `web/`, Studio and schema commands run
from `studio/`, and the seed scripts run from the repo root — check which directory you are in
before running anything.

From **`web/`** — the Next app:

| Command | Purpose | Status |
| --- | --- | --- |
| `npm run dev` | Next dev server on :3000 | ✎ works |
| `npm run build` | Production build for Vercel — app only, never the Studio | ✎ works |
| `npm run start` | Serve the built output locally | ✎ works |
| `npm run typecheck` | `next typegen && tsc --noEmit` | ✎ works |

**`next typegen` is not optional in that last one.** It writes `.next/types/routes.d.ts`, where
the global `PageProps<'/shots/[slug]'>` and `RouteContext<'/api/photos/[id]'>` live. A cold
`tsc --noEmit` without it fails on every page and route-handler signature.

`npm run build` reports each route's rendering mode, and that output is worth reading rather
than skimming: `○`/`●` are prerendered, `ƒ` is dynamic. `/`, `/bio`, `/copy` and the
`/copy/[slug]` pages should be prerendered with a 1m revalidate; `/shots/*`, `/admin` and
`/api/photos*` should be dynamic. A content route silently becoming dynamic means something
started reading a request-time API.

From **`studio/`** — the Sanity Studio:

| Command | Purpose | Status |
| --- | --- | --- |
| `npm run dev` | Studio on :3333, against `SANITY_STUDIO_DATASET` | ✎ works |
| `npm run build` | Build the Studio bundle | ✎ works |
| `npm run deploy` | Ship the Studio to `joanatstake.sanity.studio`, pinned to `production` | ✎ host claimed and live |
| `npm run promote` | Mirror `development` onto `production`. `-- --dry-run` first. | ✎ works |
| `npm run typegen` | `sanity schemas extract --force` then `sanity typegen generate` | ✎ works |
| `npx sanity schemas validate` | Check the schema for problems. Touches no data. | ✎ works |
| `npx sanity documents validate --dataset <ds>` | Check the *content* against the schema. Read-only. Run it after any migration. | ✎ works |
| `npx sanity migrations run <id> --project c3808h1v --dataset <ds>` | A content migration, dry by default. `--no-dry-run` executes. Both `--project` and `--dataset` or neither. | ✎ works |

`deploy` and `promote` are the two commands that reach `production`, and they are not
substitutes: `deploy` ships the Studio bundle and no content, `promote` ships content and no
code. A schema change reaches her through the first; a content change through the second.

Note it is `sanity schemas extract` — plural. The singular form is not the command.

**The `--force` is load-bearing.** `schemas extract` refuses to overwrite an existing
`schema.json` without it — unattended it exits `USAGE_ERROR`, interactively it prompts and
defaults to *no*. Either way the `&&` short-circuits and the types silently do not
regenerate. Do not remove it.

`typegen` lives in `studio/` because the Studio owns the schema, but it writes
`web/sanity.types.ts`. Paths are configured under `typegen` in `studio/sanity.cli.ts`, whose
`path` glob is `../web/src/**/*.{ts,tsx}` — **a query file outside that glob generates no
types and no error.** Re-run
it after any schema change or any new/edited query, and **commit the regenerated types in
the same commit as the schema change** — the diff is what shows the change's effect on the
contract. Vercel builds `web/` and never runs typegen, so the file has to be in the repo.

`schemaExtraction` in `sanity.cli.ts` sets two things:

- `enabled: true` re-extracts `schema.json` during `sanity dev` and `sanity build`, so the
  schema can't drift from the generated types while the dev server is running.
- `enforceRequiredFields: true` makes `rule.required()` fields non-optional in the output —
  `photo.alt` types as `string`, not `string | undefined`, so `SanityPhoto` has no fallback
  branch. The caveat is that a *draft* can be invalid, so a required field can still be
  missing under a preview perspective. That does not apply while the app reads published
  content over the CDN with no preview token. **Revisit this flag the day Presentation or
  visual editing lands.**

  **It does not look at the validation level, and that makes `rule.required().warning()` a
  trap.** The warning form is the obvious way to spell "recommended, not required" — it shows
  an amber marker she can publish straight past — but typegen reads the `required()` and types
  the field as though it were mandatory. Verified on `post.summary` and `article.summary`:
  adding it flipped `summary` from `string | null` to `string` in all four query result types,
  while six of the seven documents in `development` have no summary at all. Nothing errors. The
  types simply start claiming a field is always there, every `item.summary &&` guard becomes a
  redundant check as far as the compiler is concerned, and the first code that trusts the type
  crashes on real content.

  **So a recommended-but-optional field checks for emptiness with `rule.custom(...).warning()`
  instead.** A custom function is opaque to schema extraction, so the field stays optional in
  the types and the Studio still shows the marker. Both summary fields do this; keep them in
  step, and keep the comment explaining why, because the shorter spelling will look like an
  obvious simplification to whoever reads it next.

Still TBD: `seed` (populate `development` with stock photos), which lands in `scripts/` at
the repo root. It stays there rather than joining `promote.mjs` in `studio/` because the two
authenticate differently — seeding writes documents through the client and needs
`SANITY_WRITE_TOKEN`, where the promote goes through the CLI and needs nothing. Its value has
also dropped: `development` now holds real content, so seeding it with stock photos is
something to do to a *third* dataset, not to the one being authored in.

### Fresh checkouts and worktrees

A worktree is a fresh checkout: no `.env` files, no `node_modules`. `npm run dev` in
`studio/` is impossible without the second and refuses to start without the first, since
`dataset.ts` throws on an unset `SANITY_STUDIO_DATASET`.

**`.worktreeinclude`** closes the first half. It lists the three gitignored `.env` files,
and Claude Code copies them into every worktree it creates — native, and no code to own.
It only fires for worktrees Claude Code makes, so `git worktree add` by hand and a fresh
`git clone` still need the files put there some other way.

It copies `studio/.env` verbatim, which is safe only because that file has exactly one
legitimate value. **`studio/.env` holds `development`.** Production is reached three other
ways and none of them needs this file to say so: `npm run deploy` pins
`SANITY_STUDIO_DATASET=production` itself, `npm run promote` pins the variable in the child
environment it hands the CLI, and a one-off look at real content is an inline override for that
single command, `SANITY_STUDIO_DATASET=production npm run dev` — an inline value beats the file,
which `npx sanity debug` will confirm.

So `production` never needs to be in that file, and it is the one edit that propagates:
every Claude-created worktree inherits the copy in silence, which turns a single mistake
into the rule in *Datasets* being defeated in every checkout at once rather than in one.
Finding it there is the bug — in the main checkout quite as much as in the worktree.

Dependencies are still a manual `npm ci` in each package of a new worktree. Automating that
sits unmerged on `chore/worktree-setup-script`, pending a decision on approach.

## Environment variables

Three `.env` files, because each tool loads `.env` from its own directory. They are separate
on purpose — do not consolidate them into one root file.

**`web/.env`** — read by Next. **All server-side. Nothing here is public, and nothing here
carries a `NEXT_PUBLIC_` prefix.**

| Name | Purpose |
| --- | --- |
| `SANITY_PROJECT_ID` | `c3808h1v`. Public information, but not a public *variable* — see below. |
| `SANITY_DATASET` | `development` locally, `production` on Vercel. |
| `SANITY_API_VERSION` | Pinned API date. Pin it; don't float. |
| `SANITY_STUDIO_URL` | `https://joanatstake.sanity.studio`. `/admin` redirects here. If empty, `/admin` returns a 503 with a legible message rather than failing oddly. |

**`web/.env` used to say "all public: these ship in the browser bundle", and the invariant has
flipped.** These were `NUXT_PUBLIC_SANITY_*` and were inlined into the client bundle, because
the app read Sanity from the browser. It no longer does — every read is on the server, and the
one that used to happen after hydration goes through `app/api/photos`. So:

- **No prefix.** `NEXT_PUBLIC_*` is substituted into the *bundle* at build time, so a value only
  the server reads should never carry one. Adding one to any of these would put the project id
  back in the JS for no gain.
- **`import 'server-only'` in `src/sanity/client.ts` enforces it.** Importing that module from
  anything in the client graph is a build error naming the file that did it, so the boundary is
  checked rather than remembered.
- **The check after any change here:** `grep -r "c3808h1v" web/.next/static/` must return
  nothing after a build.

**No defaults, deliberately.** `nuxt.config.ts` defaulted the dataset to `development`, and that
is exactly the failure worth preventing: a deploy missing the variable would quietly read a
dataset the live site does not publish from and look like it was working. `client.ts` throws at
module scope instead, which fails the **build** and names the variable. Same refusal
`studio/dataset.ts` makes, for the same reason — both wrong answers fail silently, so neither
gets to be the default.

**`web/.env` is a local file**, loaded by `next dev`, `next build` and `next start`. Only the
deployed server ignores it and reads real environment variables. So **every value here must also
be set in Vercel's project settings; a correct `web/.env` proves nothing about production.**

Three consequences, all verified:

- **A rename has to land in Vercel in the same window as the deploy.** Delete the old
  `NUXT_PUBLIC_*` entries rather than leaving them, so a half-finished rename cannot look
  half-working.
- **Non-prefixed variables are live `process.env` reads on the server**, so changing one in
  Vercel does not require a rebuild for anything rendered at request time. The prerendered
  routes are the caveat: their *first* HTML reflects build-time values and picks the change up on
  the next revalidation.
- **`next build` loads `web/.env`**, so a locally built artifact carries your `development`
  dataset. Vercel is unaffected, because `.env` is gitignored and never gets there.

**`studio/.env`** — read by the Sanity CLI and baked into the Studio bundle at build time.

| Name | Purpose |
| --- | --- |
| `SANITY_STUDIO_DATASET` | Dataset the Studio points at. **Required** — unset throws, via `studio/dataset.ts`. Set `development` here for local work; `npm run deploy` supplies `production` itself and overrides this file. |

There is no `SANITY_STUDIO_PROJECT_ID` — the project ID is hardcoded in the Studio config,
which is standard for Sanity and avoids a variable that can only ever have one value.

**`.env`** at the repo root — for `scripts/` only.

| Name | Purpose |
| --- | --- |
| `SANITY_WRITE_TOKEN` | Write access for seeding. |

**`SANITY_WRITE_TOKEN` is used by scripts only and is never referenced in app code.** Not in
`web/src/`, not in `next.config.ts`, nowhere. It never reaches the browser and never reaches
the Vercel runtime. If a task seems to need it in the app, re-read "The app never writes to
Sanity" above.

Note the name no longer disambiguates itself by prefix, now that the app's variables are also
bare `SANITY_*`. They never meet — this one lives in the repo-root `.env` and is read only by
`scripts/`, which has its own `package.json` and its own directory — but a variable named
`SANITY_WRITE_TOKEN` turning up in `web/.env` or in Vercel is a bug, not a convenience.

## Non-goals

Not "later" — **not part of this project**. Don't build them, don't leave hooks for them,
don't add a dependency that anticipates them.

- **No commerce.** No prints, no cart, no payments, no licensing flow.
- **No visitor accounts.** No login, no favorites, no comments. The only authenticated user is the editor, in the Studio.
- **No contact form.** `/contact` is text and links — email address, social links. No form, no form handler, no spam mitigation, no inbox to check.
- **No freeform page builder.** No drag-and-drop, no canvas, no per-photo position/size/crop controls, no arbitrary section nesting. See Rule 2.
- **No long-form writing by anyone else, and no rich text beyond `post.body` and `proseText`.** This non-goal used to read "no long-form writing in the CMS, no post type" and it was wrong — it assumed all her writing lived on someone else's site. Half of it does, and `article` covers that. The other half is ~15 pieces she self-published on the Squarespace site being replaced; they have nowhere to go, so `post` exists. What still holds: `article` stays body-less, and **the block config stays as short as it is** — one style, two decorators, one annotation. Adding a style, a decorator or a block type is a decision with a cost, not a default.

  This used to also read "prose fields elsewhere stay plain `text`", and that clause is gone: `homePage.featuredTitle` and `.featuredSubtitle` became `proseText` when her front-page copy turned out to need an italic and a link. Nothing was added to the type to allow it. The line worth defending was never *which fields* use `proseText` — it is what `proseText` is allowed to contain, which is unchanged. Widening the former is a normal content decision; widening the latter is the one that needs an argument.

## Working agreements

**Ask before adding any dependency.** Every one — runtime, dev, Sanity plugin, Tailwind
plugin, Next plugin. No exceptions for "tiny" or "everyone uses it". State what it's for and what
the alternative is without it, then wait. This applies to transitive-in-spirit additions too:
pulling in a component library to get one component is the thing this rule exists to catch.

**Flag rule conflicts before coding, not after.** If an ask appears to need an embedded image
or a positioning control, say so and propose the preset-shaped version instead.

**Prefer deleting a knob to documenting it.** The Studio should be boring.

## Open questions

Unresolved. Don't paper over these — raise them when the relevant work comes up.

- **The going-live checklist is down to one item, and the CORS half is retired.**
  1. **Replace the front page's six stock house photos** with five of Joan's, in `development`,
     then `npm run promote`. See the note under *The front page* — replace, do not delete.
  2. ~~`npx sanity cors add https://joanatstake.com --no-credentials`~~ — **no longer required.**
     Nothing in the browser talks to Sanity, so no request from `joanatstake.com` ever carries an
     `Origin` header to the Content Lake. See the CORS bullet in *The Studio*. **This stops being
     true the moment something in the client graph imports the Sanity client** — which
     `import 'server-only'` makes a build error rather than a surprise on DNS day.
- **The deploy checklist gained two items instead, and they broke production in that order.**
  1. **The framework preset.** Deleting `nuxt.config.ts` made Vercel's auto-detection fall
     through to no framework, which served `web/public/` as a static site and 404'd every route
     on a **green** deploy. `web/vercel.json` now pins `"framework": "nextjs"`. What that file
     cannot do, and so had to be done in the dashboard by hand: **clear any explicit Output
     Directory or Build Command override** left from the Nuxt project, because vercel.json
     overrides only the keys it declares. Same for **Root Directory**, which stays `web`. See
     *Directory structure* for the diagnostic signature — it is not a Next 404.
  2. **The four `SANITY_*` variables** must exist in Vercel's project settings under their new
     names, with the old `NUXT_PUBLIC_*` entries deleted, **in the same window as the deploy**.
     They do not all fail the same way, and the split is worth knowing before reading a green
     build as proof all four are set:

     | Variable | Needed | Missing |
     | --- | --- | --- |
     | `SANITY_PROJECT_ID` | **build** | red build, naming the variable |
     | `SANITY_DATASET` | **build** | same |
     | `SANITY_API_VERSION` | **build** | same |
     | `SANITY_STUDIO_URL` | **request** | **green build**, and `/admin` returns a 503 |

     The first three are `required()` calls at module scope in `sanity/client.ts`, so they throw
     during `next build` — unlike the Nuxt build, a missing one fails loudly rather than
     defaulting, which is the intended behaviour and still means a red deploy if forgotten. The
     fourth is read at request time by `app/admin/route.ts`, which is `force-dynamic` precisely
     so the Studio host resolves per request; absent, it deliberately answers 503 with a legible
     message rather than breaking the build. **So `SANITY_STUDIO_URL` is the one that a
     successful deploy says nothing about** — the only thing that catches it is opening `/admin`.
     See *Environment variables*.

  **The first hides the second, which is why they are numbered.** A green deploy that served
  `public/` proves nothing about the variables either way, so **(2) cannot be inferred from the
  site having deployed — check the settings.** Fixing (1) alone is what makes a missing variable
  able to go red, so a build failing on `SANITY_PROJECT_ID` straight after a preset fix is the
  system working rather than a new problem.

  **Both are done, verified live on 2026-08-11**, by dashboard changes — `vercel.json` was not
  merged at the time, so the repo half is what stops it regressing rather than what fixed it.
  Every route answers: `/`, `/bio`, `/copy`, `/shots/all` 200; the four old addresses 307; an
  unknown route 404s as `text/html` from `not-found.tsx` rather than as Vercel's plain text; and
  `/admin` 302s to `https://joanatstake.sanity.studio`, which is the only check that covers
  `SANITY_STUDIO_URL`. `x-vercel-cache` and `x-nextjs-prerender: 1` are present on `/`, so ISR is
  live. Kept here rather than deleted because the *ordering* is the reusable part.
- **When the promote stops.** The deployed Studio writes to `production` and `npm run promote`
  overwrites it, so the day Joan starts editing is the day the direction reverses for good.
  Nothing detects "she has been given the URL" — the preflight only catches it *after* she has
  created her first document. Decide deliberately when to retire the promote rather than
  letting the tripwire decide, and say so here when it happens.
- **Vision plugin in the Studio.** `@sanity/vision` (a GROQ playground) ships in
  `studio/sanity.config.ts` from the generator. It's useful while building and clutter for
  her — a visible tab that does nothing she needs. Keep it through the query-building phase;
  it is how the image metadata and the GROQ get verified. Delete the one line in the
  handover PR, so the decision has a home instead of drifting.
- ~~**ISR revalidation.**~~ **Half settled: it is 60 seconds, set once at the fetch layer.** See
  *Caching*. What is still open is the other half of the original question — **whether a delay is
  the right shape at all.** If a minute feels wrong to her, the answer is a Sanity webhook doing
  on-demand revalidation, which costs a secret, an endpoint and a hook to configure. Do not reach
  for it before she says the delay is a problem.
- **`cacheComponents` (PPR) is the thing that would let `/shots/[slug]` be static *and*
  server-render its showcase.** Today it is dynamic, because reading `searchParams` makes it so —
  see *Caching* for why that is the right trade at this size. A static shell with a dynamic hole
  would get both. It was deliberately not taken on inside a framework port: enabling it removes
  `dynamic`, `dynamicParams`, `revalidate` and `fetchCache` wholesale, which is a second
  migration wearing a flag. Revisit when the render cost is measurable rather than theoretical.
- **Fonts are hotlinked rather than vendored.** ~171 kB of latin woff2 across five files, from
  `fonts.gstatic.com`. Copying them into `web/public/fonts/` and serving them same-origin
  removes a third-party dependency, removes a DNS + TLS handshake from the critical path, and
  removes the silent-404 failure mode entirely. Deferred, not rejected — `web/public/` does not
  exist yet. Note the number moves with the spec: it was ~48 kB and one file under the previous
  one, so re-measure rather than quoting this line after a swap.
- **The copyright is only visible on a phone with the nav drawer open.** It sits at the bottom
  of the sidebar. If that turns out to matter, the fix is to *move* the single node into a slim
  `<footer>` at the end of `<main>` — never to duplicate it into both.
- ~~**`/bio` reads `homePage.introPhoto`.**~~ **Settled: the field is gone and so is the
  cross-document read.** `ABOUT_QUERY` is one document and one projection again. The rule that
  survives it is `aboutPage`'s: photographs on that page come from the body, as `postPhoto`
  members she places by typing around them, and there is no photo field to reach for instead.
  Worth knowing how the removal had to be finished, because the schema edit alone was not
  enough: Sanity's reference integrity reads *stored data*, not the schema, so the value left
  behind on `homePage` would have kept that photograph undeletable in the Studio with nothing
  on screen explaining why. The field was unset on the document as well.
- **`homePage.blurb`, `.featuredTitle` and `.featuredSubtitle` are fetched and not rendered.**
  See the note under *The front page*. They need a home, and until they get one `ProseHeading`
  has no caller.
- **The photo grid's `K` is tuned against five photographs of the shapes currently in
  `development`.** `home/PhotoStrip.tsx` wraps photographs into rows by a flex basis
  proportional to each one's aspect ratio; `K` (the `22rem` in the basis) sets roughly how tall
  a row wants to be before wrapping, and at the current content it produces a 3-then-2 split on
  a wide screen. Different photographs will pack differently — that is the mechanism working,
  not breaking. Both `K` and the growth cap beside it are properties of the grid, never of a
  photograph, so neither is a Rule 2 control — but re-measure them if `featuredPhotos` ever
  stops being exactly five.

  **The cap is `max-w-[calc(var(--r)*var(--k)*1.5)]` and used to be `sm:max-w-[55%]`.** Both
  exist for the degenerate case — a row left holding one photograph, which `flex-grow` stretches
  to the full column; a portrait at full width measured 765px tall before any cap existed. The
  percentage was still letting a lone photograph reach ~600px on a ~1100px column, which reads
  as a mistake rather than as a varying grid, so the cap now says what it is actually about:
  how much larger than its neighbours a photograph may get. **The cost is that it applies to
  every row, not only the last** — a row whose items all hit the cap leaves a ragged right edge
  instead of stretching to fill. `1.5` is the one number to turn.
- ~~**The preset set itself.**~~ **Settled: both are built.** `GalleryGrid` packs rows where
  every photo shares a height and takes a width from its own shape; `GalleryStack` gives each
  the full reading measure down a column. Neither crops. What is *not* settled is whether two
  is the right number — a third would be a component plus a `LAYOUT_PRESETS` line, always
  together, and the `PRESETS` map in `shots/GalleryView.tsx` now makes that pairing a
  typecheck failure rather than a convention.
- ~~**The tag vocabulary is real now, but only half-decided.**~~ **Settled, in the direction
  the evidence pointed.** The six placeholders (Street, Portrait, Landscape, Architecture,
  Water, Night) sat on zero photographs and existed only because the vocabulary was hardcoded
  and adding to it was a code change. They were not migrated. Only the five she actually used —
  South Africa, Life, Mexico 2022, USA 2020, Chile 2021 — became `tag` documents. Dropping them
  is safe in a way it never was before: she can add any of them back in two clicks, which is
  the point of the change.
- **The tagging ergonomics got worse, and that is the open question the tag change leaves.**
  She trades a checkbox grid for a reference picker — see the tag bullets in *The content
  model*. Watch it across a real upload session. The no-dependency fix is a custom input
  component on `photo.tags`; reaching for a plugin instead is a dependency and needs asking.
- **Infinite scroll on /shots/all gives up one thing that was not recoverable.** The
  filter lives in the URL and is shareable; scroll depth does not, so a refresh returns you to
  the first 24. Recording depth in the URL was considered and dropped, because restoring it
  means fetching every photograph up to that point in one request — the exact cost the paging
  exists to avoid. The other two usual objections do not apply or are handled: nothing is
  stranded below the scroll because the copyright lives in the sticky sidebar rather than a
  footer, and a `role="status"` region plus a real Load more button cover screen-reader and
  keyboard users. If the lost place ever matters, numbered pages are the fix, not a patch.
- **`PAGE_SIZE` is 24 and untested against real volume.** The dataset holds ~28 photographs;
  she is expected to upload ~250. The number that matters is not the document count but the
  LQIP payload — roughly a kilobyte per photo — so re-measure the first-page weight once the
  real set is in, rather than assuming 24 is still right.
- **Nav ordering is title A–Z**, which is predictable and needs no field. For a set of trips
  newest-first probably reads better, but "newest" wants an explicit order and an order is a
  field on `gallery` — so it is a question rather than something guessed at. See `queries/nav.ts`.
- **A gallery with a tag nothing carries yet renders "No photos here yet."** That is a real and
  legitimate state — she can make the page before tagging the photographs — but it is also what
  a mistyped tag looks like, and the two are indistinguishable from the page. If that bites, the
  fix is in the Studio rather than the app: a warning on `gallery.tag` when nothing carries it.
- ~~**`@portabletext/vue` is approved but not installed.**~~ **Settled, then reopened by the
  port and settled the other way.** Under Nuxt the renderer arrived transitively inside
  `@nuxtjs/sanity`'s `SanityContent`, so declaring it would have pinned a second copy of
  something already present. With that module gone there is nothing to inherit it from, so
  `@portabletext/react` is now a **direct** dependency — the same library family, the same
  `components` map shape (`block` for the styles, `marks` for the `hyperlink` annotation,
  `types` for `postPhoto`), just declared rather than borrowed.

  It brought one improvement worth using: **`InferComponents<T>`** derives each handler's
  `value` type from the TypeGen result, so a schema rename fails at the `components` map instead
  of falling through to an unknown-type renderer. `ProseBody`, `ProseText` and `ProseHeading`
  all use it. `InferStrictComponents` goes further and *requires* a handler per custom type —
  worth considering for `ProseBody`, which has exactly one.
- **Porting the Squarespace posts.** ~15 of them, and the schema is ready for them but the
  content is not. Every Squarespace date reads `January 01, 2030`, so real dates have to be
  recovered from the text; several slugs are junk
  (`/2018/8/22/8mc14cj2kpvx8ufmgy9utxtw0z8kbc`) and need clean replacements. Old links in
  the world break either way, so decide about redirects at the same time. A `scripts/` job
  against `development` first.
Resolved, kept because the reasoning still applies:

- ~~**`web/sanity.types.ts` may fall outside the app's TypeScript program.**~~ **The mechanism
  changed and the hazard did not.** Under Nuxt this was a real bug: `.nuxt/tsconfig.app.json`
  included `../app/**/*` and `../*.d.ts`, a `.ts` file at the web root matched neither, and the
  `declare module "@sanity/client"` augmentation typegen emits under
  `overloadClientMethods: true` sat outside the program. It needed an explicit
  `typescript.tsConfig.include` entry.

  That workaround is gone: `tsconfig.json`'s glob covers the whole of `web/`, so the file is in
  the program by ordinary means. **Keep the paragraph anyway, because the failure has a second
  face and it is nastier than the first.** `ClientReturn`'s own default fallback is `Any` — that
  is, `any`. So a lost augmentation does not merely weaken the types, it *silently switches them
  off*: every route keeps compiling and stops being checked. `sanityFetch` pins the fallback to
  `unknown` precisely to convert that into a compile error.

  **A green `npm run typecheck` is not evidence.** Two checks that are, and they take a minute:

  1. Point a query result at a field that does not exist. The compiler must reject it *naming
     the real result shape* — that proves the map is live.
  2. Hand `sanityFetch` a query string that is not in the generated map. The result must be
     `unknown`, not `any` — that proves the fallback is pinned.
