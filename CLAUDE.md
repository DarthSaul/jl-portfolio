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
| **Nuxt 4** (Vue 3) | File-based routing, SSR/SSG per route, and a small surface area for a site this size. |
| **TypeScript** | Content shapes come from generated types — the compiler catches schema drift. |
| **Tailwind CSS** | Layout presets are the only place layout is decided; utility classes keep that decision local to the preset component. |
| **Sanity** (hosted Content Lake) | The CMS. Structured content, real references between documents, and an editing UI we control the shape of. |
| **Sanity Studio, deployed via `sanity deploy`** | Sanity hosts the Studio at `joanatstake.sanity.studio`. `/admin` on this site redirects there, so she still only has to remember one URL. |
| **`@nuxtjs/sanity`** | Client + `useSanityQuery` wiring for the Nuxt app. |
| **GROQ** | Sanity's query language. Lets a route fetch exactly its shape in one request, following references. |
| **Sanity image CDN** | Transform params in the URL — resizing, format negotiation, and LQIP come free, no build-time image pipeline. |
| **Vercel + ISR** | Deployment. ISR means content changes appear on the live site without a build step she has to know about or wait for. |

### The Studio (Phase 1 approach)

The Studio is **not embedded in the Nuxt app**. Sanity Studio is React and Nuxt is Vue;
rather than bridge that, the Studio is its own npm package in `studio/` with its own
`package.json`, deployed to `joanatstake.sanity.studio`. `/admin` on the site redirects to it.

Sanity project: **`c3808h1v`** ("Portfolio: Joan Lebow"). Hardcoded in `studio/sanity.config.ts`
and `studio/sanity.cli.ts` — it's public, and the Studio only ever talks to one project.

Studio hostname: **`https://joanatstake.sanity.studio`**, claimed and live. Pinned as
`studioHost` in `studio/sanity.cli.ts`, so deploys no longer prompt and can't land on a
different host by typo. CORS is registered for it and for `http://localhost:3333`.

Consequences to keep in mind:

- **The Studio is a separate deployment artifact.** Pushing the Nuxt app to Vercel does not
  ship Studio changes, and `sanity deploy` does not ship app changes. A schema change only
  reaches her after a Studio deploy. This is the main cost of the approach — when a task
  touches `studio/schemaTypes/`, deploying the Studio is part of finishing it.
- **Studio auto-updates are on** (`autoUpdates: true` in `studio/sanity.cli.ts`). Sanity ships
  Studio improvements to her without a redeploy from us. Schema changes still need a deploy;
  only the Studio shell auto-updates.
- **Studio dependencies stay out of the app's install.** React, `styled-components`, and
  `sanity` live in `studio/package.json`, so a Vercel build of the Vue site never installs
  them. This is the main reason the two halves have separate `package.json` files.
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
- **Every *app* origin needs one too, and without credentials.** Different flag, different
  reason, and the Studio line above is the wrong template to copy. The app never logs in — it
  reads a public dataset anonymously — so `--no-credentials` grants a browser exactly what
  `curl` already returns to anyone holding the project id. `--credentials` on an app origin
  would be a real widening for no gain. Four entries exist today:

  | Origin | Credentials | For |
  | --- | --- | --- |
  | `https://joanatstake.sanity.studio` | yes | deployed Studio |
  | `http://localhost:3333` | yes | `sanity dev` |
  | `https://*.vercel.app` | **no** | the app, production and every preview deploy |
  | `http://localhost:3000` | **no** | the app, `npm run dev` |

  The wildcard is deliberate: Vercel gives each preview deploy its own hostname, and one entry
  covers all of them. It does not cover an apex domain — **`joanatstake.com` needs its own
  `npx sanity cors add https://joanatstake.com --no-credentials` on the day DNS is connected**,
  or the site breaks the moment anyone navigates between pages. That is one of exactly two
  going-live steps; the other is replacing the stock photographs in `development` and running
  `npm run promote`, in *Datasets* below. Neither requires touching a dataset's existence or
  its visibility.

  **Know how a missing app origin fails, because it does not look like CORS.** SSR sends no
  `Origin` header, so a hard load always works. Nuxt purges a route's cached data on unmount,
  so navigating away from a page and back re-runs its query *in the browser* — which does send
  one, gets a 403, and leaves the result `null`. Identical to a query that found nothing. `/`
  spent a while reporting "No homePage document found in this dataset" for this, and the dataset
  was correct throughout. `index.vue` now checks `error` before `data` and returns a 502 naming
  the origin. Any route that gains a query should do the same.

  Diagnosing it takes three requests, and the contrast between them *is* the signature — a
  status alone does not distinguish "origin rejected" from "dataset empty":

  ```sh
  U="https://c3808h1v.apicdn.sanity.io/v2026-07-31/data/query/production?query=*%5B0%5D"

  # allowlisted origin  -> 200, and the origin echoed back
  curl -sS -D - -o /dev/null "$U" -H "Origin: https://jl-portfolio-seven.vercel.app" \
    | grep -iE '^HTTP|^access-control-allow-origin'

  # origin not on the list -> 403, and no allow-origin header at all
  curl -sS -D - -o /dev/null "$U" -H "Origin: https://example.com" \
    | grep -iE '^HTTP|^access-control-allow-origin'

  # no Origin header -> 200. This is the SSR path, and why hard loads never showed the bug.
  curl -sS -o /dev/null -w '%{http_code}\n' "$U"
  ```

  **Grep those headers case-insensitively.** Under HTTP/2 all header names are lowercase, so a
  pattern anchored on `Access-Control-Allow-Origin` matches nothing and reads as a rejection on
  an origin that is in fact allowed.

Sanity's own guidance now treats a standalone, separately-deployed Studio as the recommended
shape and embedding as legacy — it slows builds, couples Studio updates to app deploys, and
rules out Studio auto-updates. So this is the mainline path, not a workaround.

This is Phase 1. Revisit only if the hop to a second domain actually confuses her, or if
embedded preview / visual editing becomes worth the bridge — not on general principle.

### Datasets

Two datasets on project `c3808h1v`, both created:

- `development` (public) — **where content is authored.** What local dev points at, via
  `SANITY_STUDIO_DATASET` in `studio/.env` and `NUXT_PUBLIC_SANITY_DATASET` in `web/.env`.
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

#### Stock content is cleaned in `development`, not in `production`

`production` was first seeded on 2026-08-03 from `development`, because the Vercel deployment
reads `production` and the front page throws a 500 when no `homePage` document exists. It was
promoted over on 2026-08-04, which is when the arrangement above became the workflow rather
than a one-off; the two datasets held identical id sets — 41 documents each — immediately
afterwards. **The Vercel app is at `jl-portfolio-seven.vercel.app` and `joanatstake.com` is not
pointed at it**, so `production` is a staging dataset wearing the production name until DNS is
connected.

That first promote is also what `/about` was waiting on. `aboutPage` existed only in
`development`, so the live route returned a 500 while `/` and `/writing` returned 200 — a
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

The same photograph appears on `/shots` and on a trip page. It must be **one record with one
alt text**, or the two copies drift apart the first time she fixes a typo in one of them.

If a caption genuinely needs to differ by context, that is a discussion to have — not
something to solve by duplicating the photo.

### Rule 2 — Layout is a small set of presets, not freeform positioning.

She picks **which photos**, **in what order**, and **which preset**. She never positions
anything. She never sets a width, a column count, a crop offset, or a breakpoint.

Presets are Vue components that guarantee the result works at every width. They are the
product, not a limitation of it. Do not work around this constraint, do not add per-photo
overrides "just for this one case", and do not propose a drag-and-drop canvas or freeform
page builder — that is the exact thing this project exists to replace.

Adding a preset means two changes, always together:

1. A new component in `web/app/components/presets/`.
2. A new option in the hard-coded preset list in the gallery schema.

The schema field is a `string` with a fixed `options.list`. It is never a free-text field.
A preset value that has no matching component must be impossible.

---

## Site structure

| Route | Contents |
| --- | --- |
| `/` | Seven fixed slots — see *The front page* below |
| `/shots` | ~50 curated photos, plus links to the trip galleries |
| `/shots/[slug]` | 5 trip galleries, ~50 photos each |
| `/writing` | Her own posts and links out to others, newest first, interleaved |
| `/writing/[slug]` | A `post` — writing that lives here. An `article` never reaches it. |
| `/about` | Her bio — prose with photographs in it. Same body shape as a `post`. |
| `/contact` | Text and links only — see non-goals |
| `/admin` | 302 redirect to the Sanity-hosted Studio. No page component. |

## The front page

Seven slots, in this fixed order. She fills them; she never reorders them. Confirmed
against the Squarespace site this replaces.

| # | Slot | Where it lives |
| --- | --- | --- |
| 1 | Site name | `siteSettings.title` |
| 2 | Byline — "STAKING THINGS OUT, MAKING A FEW CLAIMS" | `siteSettings.byline` |
| 3 | Nav | Frontend only. No schema. |
| 4 | Heading + intro, printed over a photo of her | `homePage.introHeading` / `introPhoto` / `intro` |
| 5 | Blurb, 3–4 sentences, usually carrying a link | `homePage.blurb` |
| 6 | Featured writing — exactly 3, posts and links mixed | `homePage.featuredWriting` |
| 7 | Featured photos — title, subtitle, a row of exactly 5 | `homePage.featuredTitle` / `featuredSubtitle` / `featuredPhotos` (the first two are `proseText`) |

The byline is on `siteSettings`, not `homePage`, because it sits in the header of **every**
page. Slot 6's own heading is hardcoded in the component; only slot 7's is editable.

**Status: slots 4–7 read from Sanity. Slots 1–3 do not yet.** The site name and byline still
come from `web/app/content/site.ts`, because no `siteSettings` document exists in either
dataset — the type is in the schema, nothing has been created against it. Slot 3, the nav, is
frontend-only by design and stays there. Wiring the header means creating the singleton and
giving the layout a query, which is site chrome rather than front-page work and touches every
route, so it did not ride along with slots 4–7.

**Slot 7 is still pointed at stock photographs, and they are load-bearing.**
`homePage.featuredPhotos` holds six real-estate-listing photos of a house — the last of the
stock content, in both datasets. **Deleting them is not the fix; replacing them is.** The strip
renders whatever the array references, so removing them empties slot 7 rather than improving it.
Swapping in five of Joan's photographs, in `development`, then `npm run promote`, is a named
launch blocker in *Open questions*. Everything else on the front page is her real copy.

## The content model

Twelve types. The schema files in `studio/schemaTypes/` are the source of truth; this table
is a map, not a spec.

| Type | Shape | Notes |
| --- | --- | --- |
| `photo` | image, alt (required), caption, place, dateTaken, tags | Rule 1's anchor. No title field. |
| `gallery` | title, slug, description, preset, photos → refs | Rule 2's home: `LAYOUT_PRESETS`. |
| `post` | title, slug, summary, coverPhoto → ref, publishedAt, body | Writing that lives **here**. Body is prose + `postPhoto`. |
| `article` | title, publication, url, publishedAt, summary, coverPhoto → ref | A link out. No body, by design. |
| `homePage` | title, introHeading, introPhoto → ref, intro, blurb, featuredWriting → refs, featuredTitle, featuredSubtitle, featuredPhotos → refs | Singleton. See *The front page*. |
| `shotsPage` | title, intro, photos → refs, galleries → refs | Singleton |
| `writingPage` | title, intro | Singleton. Posts and articles are queried, not listed by hand. |
| `aboutPage` | title, body | Singleton. Body is prose + `postPhoto`, like `post`. Called **Bio** in the Studio. |
| `contactPage` | title, intro | Singleton. The links live on `siteSettings`. |
| `siteSettings` | title, byline, description, shareImage → ref, links | Singleton |
| `link` | label, url | Object. Used only by `siteSettings.links`. |
| `postPhoto` | photo → ref | Object. A photo between paragraphs of any body — `post` or `aboutPage`. |
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
- **No `hotspot`, and no crop on a photograph. Preview thumbnails are the one exception.**
  Sanity's usual advice is `hotspot: true` on every image; here it is a per-photo framing
  control, which Rule 2 forbids. That decision only stays coherent if **every preset
  preserves the native aspect ratio**, and it still does. If a preset ever wants uniform
  tiles, that reopens Rule 2 — it does not get decided inside a component.
  - **The exception is a preview thumbnail, and it is deliberately narrow.** `/writing` lists
    each piece behind a small circular avatar of its cover photo, matching the site this
    replaces. A circle is a square crop, so `SanityPhoto` has a `square` prop that asks the
    CDN for `fit=crop&crop=center`.

    What keeps it inside Rule 2 is that nothing about it is a choice: the size is fixed by the
    component, the crop is always centred, and **she has no control over any of it** — no knob
    in the Studio, none at the call site. It is a preset that happens to crop. The prop is a
    boolean rather than a shape for exactly that reason; the moment it takes dimensions or an
    offset it has become the thing Rule 2 exists to prevent.

    It also earns its place on weight, which is what prompted it. The row used to render a
    full-width cover at native proportions and let CSS shrink it, so the page shipped seven
    ~1200px JPEGs to fill what is now a 128px circle.

    **The cost is real and lands on her.** With no hotspot the crop is centred, so a cover
    whose subject sits near an edge loses it in the thumbnail, and the only remedy is choosing
    a different photo. If that starts to bite, the conversation is `hotspot` on `photo.image`
    — a Rule 2 decision, not a component one.

    **The photograph itself is never cropped.** `square` is for previews only; a photo at
    reading size — a gallery, a post body, the front-page intro — keeps its own proportions.
    `grep -rn "square" web/app/components/` should stay a short list, and every hit should be
    a thumbnail.
  - The front page's intro (slot 4) was the first real test of this, and the rule held. A
    hero with text on it is the classic case that wants a crop; instead the photo renders at
    its native ratio — the right two-thirds of the container, with the heading and intro on a
    card overlapping its left edge by 100px — which means **the photo's own proportions
    decide how tall that section is**. The cost is real and lands on her: which photo she
    picks matters. That is a description in the Studio, not a control. Check
    `grep -rn "hotspot *:" studio/schemaTypes/` returns nothing — the only `hotspot` in the
    tree is the comment in `photo.ts` saying why.

    The overlap is a width overrun inside a grid track, not absolute positioning, so the card
    cannot escape the container at any width. `min-w-0` on it is load-bearing: a grid track's
    automatic minimum is its item's min-content size, so an item deliberately wider than its
    track will otherwise widen the track and squeeze the photo below two-thirds.
- **Image metadata is set at upload and never backfilled.** The `metadata` array on
  `photo.image` *replaces* Sanity's defaults rather than extending them, so `lqip`,
  `blurhash`, `thumbhash` and `palette` are restated there deliberately — dropping one
  silently breaks the blur-up placeholder for every photo uploaded afterwards. `exif` is
  in; `location` is out, because it is GPS and the production dataset is readable by
  anyone with the project id.
- **Adding a tag to `PHOTO_TAGS` is free. Renaming or removing one is not** — the old
  string stays on every photo already using it, no longer matches the list, and its
  checkbox quietly disappears. Adding a tag also adds its browse list in the sidebar,
  because `structure.ts` maps over the same array.
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
    - The reason it needs its own root element at all: **`SanityContent` sets
      `inheritAttrs: false` and returns `PortableText` with no wrapper**, so a `class` handed
      to it is silently dropped. That is what the `<div>` in `ProseText` is for, and it is a
      trap worth knowing before wiring the next editable heading.
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
.env.example                ✎ Root env, for scripts/ only
.worktreeinclude            ✎ Gitignored files Claude Code copies into a new worktree

web/                        ✎ The Nuxt app. Vercel's root directory.
  package.json              ✎ nuxt, vue, @nuxtjs/sanity, tailwind. No React.
  nuxt.config.ts            ✎ sanity module, Tailwind, routeRules (ISR — TBD)
  tsconfig.json             ✎
  .env.example              ✎ NUXT_PUBLIC_* only
  sanity.types.ts           ✎ GENERATED by studio typegen — do not edit by hand.
                              Committed: Vercel builds web/ and never runs typegen.
  app/
    app.vue                 ✎
    layouts/                ✎ default.vue
    pages/
      index.vue             ✎ LIVE — reads homePage from Sanity
      shots/index.vue
      shots/[slug].vue
      writing/index.vue     ✎ LIVE — posts and links out, newest first, from Sanity
      writing/[slug].vue    ✎ LIVE — one post, body and all
      about.vue             ✎ LIVE — the bio, through ProseBody
      contact.vue
    components/
      SanityPhoto.vue       ✎ The only place an <img> is emitted (see conventions)
      ProseText.vue         ✎ Renders a proseText field via SanityContent
      ProseHeading.vue      ✎ The same, as a real <h2> — see the note above
      ProseLink.vue         ✎ The `hyperlink` annotation inside one
      ProseBody.vue         ✎ A body of prose with photos in it — post.body and aboutPage.body
      BodyPhoto.vue         ✎ The postPhoto member of one, floated and wrapped by the text
      home/                 ✎ Hero, FeaturedWriting, PhotoStrip — slots 4, 6 and 7
      writing/              ✎ ListItem — one row of the COPY list
      presets/                One component per layout preset
    utils/                  ✎ date.ts — formatDate, auto-imported. See the UTC note in it.
    queries/                ✎ GROQ, one file per route
      photo.ts              ✎ The shared photo projection. Not a route — see below.
      home.ts               ✎
      shots.ts
      trip.ts
      writing.ts            ✎ WRITING_QUERY (the list) and POST_QUERY (one post)
      about.ts              ✎ ABOUT_QUERY — the bio, body dereferenced
      contact.ts
    content/                ✎ Site chrome only, now the placeholders are gone.
      site.ts               ✎ Wordmark, nav, footer links. Deliberately never CMS content.
    composables/
    assets/css/             ✎ tailwind.css
  server/
    routes/
      admin.ts              ✎ 302 redirect to NUXT_PUBLIC_SANITY_STUDIO_URL
  public/

studio/                     ✎ Sanity Studio. Standalone, deployed separately.
  package.json              ✎ sanity, react, styled-components, @sanity/vision
  sanity.config.ts          ✎ Schema registry, structure, singleton locking. No basePath
                              — the deployed Studio is served at its own host's root.
  sanity.cli.ts             ✎ projectId, autoUpdates, schemaExtraction, typegen paths
  structure.ts              ✎ Sidebar shape + SINGLETON_TYPES
  dataset.ts                ✎ requireDataset() — throws when unset, never defaults
  promote.mjs               ✎ development → production. Here, not scripts/, because it
                              authenticates as the CLI user and needs no write token.
  .env.example              ✎ SANITY_STUDIO_DATASET only
  .promote/                   GENERATED — dataset tarballs and backups, gitignored
  schema.json                 GENERATED — typegen intermediate, gitignored
  schemaTypes/
    index.ts                ✎ Schema registry
    photoPicker.ts          ✎ excludeAlreadyChosen — shared reference-picker filter
    documents/              ✎ photo, gallery, post, article,
                              homePage, shotsPage, writingPage, aboutPage,
                              contactPage, siteSettings
    objects/                ✎ link, postPhoto, proseText

scripts/                      Still empty. The promote deliberately is not here — see above.
  seed.ts                     Writes stock content to `development`
```

**`web/` is Vercel's root directory** — set it in project settings, or Vercel will try to
build the repo root and find no app.

## Conventions

**GROQ lives in `web/app/queries/`, one file per route. Never inline in a component.**
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
// web/app/queries/trip.ts
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

`@nuxtjs/sanity` bundles `groq` and auto-imports both `groq` and `defineQuery`, so there is
no separate package to install and `.vue` files need no import. Keep the explicit import in
`web/app/queries/*.ts` anyway — those files are read by the typegen parser, and being explicit
costs nothing.

**Types are generated, never hand-written.** `web/sanity.types.ts` is output from
`sanity schemas extract` + `sanity typegen generate`, run from `studio/`. Do not hand-edit it, do not write a
parallel `interface Photo` somewhere, and do not `as any` past a type error — a type error
here means the query and the schema disagree, which is information, not an obstacle. If a
type looks wrong, fix the schema or the query and re-run typegen.

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
photograph's own proportions, read from the asset metadata, and the CDN URL carries only `w`
and `auto=format` — no `fit`, no `rect` — so the no-crop rule holds at the URL and not merely
by convention.

The one exception is the boolean `square` prop, which switches to a centred square crop for
preview thumbnails and its own much shorter srcset ladder. It takes no dimensions and no
offset — on or off — so a call site still cannot invent a framing. See the thumbnail note in
*The content model* for why it exists and what it costs.

**There is exactly one `<img>` in the app, and `grep -rn "<img" web/app` is the check.** It
was briefly two: `SitePhoto` and `RichParagraph` were static twins of `SanityPhoto` and
`ProseText` serving /writing while that page was on Unsplash placeholders. All three — both
twins and `~/content/writing` — died when /writing got its query. The alternative considered
at the time, teaching `SanityPhoto` to also accept bare URLs, would have put a permanent hole
in the rule to paper over a temporary one.

**Sanity schema files are the source of truth for the content model.** Not this document,
not the generated types, not the GROQ queries. Schema changes flow outward:
schema → `typegen` → queries → components. When they disagree, the schema is right and the
rest needs updating.

**The app never writes to Sanity.** All content mutation happens in the Studio, in
`studio/promote.mjs`, or in `scripts/`. No write token in app code, no mutation endpoints, no
server routes that POST to the Content Lake.

## Commands

There is no root `package.json`. Nuxt commands run from `web/`, Studio and schema commands
run from `studio/`, and the seed scripts run from the repo root — check which directory you
are in before running anything.

From **`web/`** — the Nuxt app:

| Command | Purpose | Status |
| --- | --- | --- |
| `npm run dev` | Nuxt dev server on :3000 | ✎ works |
| `npm run build` | Production build for Vercel — app only, never the Studio | ✎ works |
| `npm run preview` | Serve the built output locally | ✎ works |

From **`studio/`** — the Sanity Studio:

| Command | Purpose | Status |
| --- | --- | --- |
| `npm run dev` | Studio on :3333, against `SANITY_STUDIO_DATASET` | ✎ works |
| `npm run build` | Build the Studio bundle | ✎ works |
| `npm run deploy` | Ship the Studio to `joanatstake.sanity.studio`, pinned to `production` | ✎ host claimed and live |
| `npm run promote` | Mirror `development` onto `production`. `-- --dry-run` first. | ✎ works |
| `npm run typegen` | `sanity schemas extract --force` then `sanity typegen generate` | ✎ works |
| `npx sanity schemas validate` | Check the schema for problems. Touches no data. | ✎ works |

`deploy` and `promote` are the two commands that reach `production`, and they are not
substitutes: `deploy` ships the Studio bundle and no content, `promote` ships content and no
code. A schema change reaches her through the first; a content change through the second.

Note it is `sanity schemas extract` — plural. The singular form is not the command.

**The `--force` is load-bearing.** `schemas extract` refuses to overwrite an existing
`schema.json` without it — unattended it exits `USAGE_ERROR`, interactively it prompts and
defaults to *no*. Either way the `&&` short-circuits and the types silently do not
regenerate. Do not remove it.

`typegen` lives in `studio/` because the Studio owns the schema, but it writes
`web/sanity.types.ts`. Paths are configured under `typegen` in `studio/sanity.cli.ts`. Re-run
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

**`web/.env`** — read by Nuxt. All public: these ship in the browser bundle.

| Name | Purpose |
| --- | --- |
| `NUXT_PUBLIC_SANITY_PROJECT_ID` | `c3808h1v`. Public by design. |
| `NUXT_PUBLIC_SANITY_DATASET` | `development` locally, `production` on Vercel. |
| `NUXT_PUBLIC_SANITY_API_VERSION` | Pinned API date. Pin it; don't float. |
| `NUXT_PUBLIC_SANITY_STUDIO_URL` | `https://joanatstake.sanity.studio`. `/admin` redirects here. If empty, `/admin` returns a 503 with a legible message rather than failing oddly. |

**`web/.env` is a local file.** Nuxt loads it for `npm run dev`, `npm run build`, and
`npm run preview` — `preview` even prints *"Loading .env. This will not be loaded when
running the server in production."* Only the deployed production server ignores it and reads
real environment variables instead. So every `NUXT_PUBLIC_*` value must also be set in
Vercel's project settings; a correct `web/.env` proves nothing about production.

Two consequences, both verified:

- Running `node .output/server/index.mjs` directly skips `.env` and returned a 503 on
  `/admin`, while `npm run preview` returned a 302 from that same build. If you're smoke-testing
  what production will do, the raw node invocation is the honest one.
- `npm run build` bakes `.env` values into the output as build-time defaults — a probe value
  in `.env` turned up inside `.output/server/chunks/nitro/nitro.mjs`. So a locally built
  artifact carries your `development` dataset. Vercel is unaffected, because `.env` is
  gitignored and never gets there.

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
`web/app/`, not in `web/server/`, not in `nuxt.config.ts`, not in runtime config. It never
reaches the browser and never reaches the Vercel runtime. If a task seems to need it in the
app, re-read "The app never writes to Sanity" above.

Confirmed against `@nuxtjs/sanity` v2: the module merges its options onto
`runtimeConfig.public.sanity`, so `NUXT_PUBLIC_SANITY_PROJECT_ID` / `_DATASET` /
`_API_VERSION` override `projectId` / `dataset` / `apiVersion` at runtime. Verified end to
end — the values in `nuxt.config.ts` are build-time defaults, not the source of truth.

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

**Ask before adding any dependency.** Every one — runtime, dev, Nuxt module, Sanity plugin,
Tailwind plugin. No exceptions for "tiny" or "everyone uses it". State what it's for and what
the alternative is without it, then wait. This applies to transitive-in-spirit additions too:
pulling in a component library to get one component is the thing this rule exists to catch.

**Flag rule conflicts before coding, not after.** If an ask appears to need an embedded image
or a positioning control, say so and propose the preset-shaped version instead.

**Prefer deleting a knob to documenting it.** The Studio should be boring.

## Open questions

Unresolved. Don't paper over these — raise them when the relevant work comes up.

- **The going-live checklist, both halves.** Neither is optional and neither is hard; they
  just have to happen on the same day, and both are easy to forget because the site looks fine
  without them right up until it doesn't.
  1. **Replace slot 7's six stock house photos** with five of Joan's, in `development`, then
     `npm run promote`. See the note under *The front page* — replace, do not delete.
  2. **`npx sanity cors add https://joanatstake.com --no-credentials`.** See the app-origin
     CORS bullet; without it the site breaks on the first client-side navigation, and the
     symptom looks nothing like CORS.
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
- **ISR revalidation.** Time-based `routeRules` will make edits appear on a delay. If that
  delay feels wrong to her, it becomes a Sanity webhook doing on-demand revalidation. Start
  with the simple version.
- **The preset set itself.** `grid` and `stack` exist in the schema; neither has a component
  yet. What each guarantees at narrow widths is undecided — a design conversation, not an
  implementation detail. Both must preserve native aspect ratio — the thumbnail exception is
  for previews and does not reach them; see the no-crop note in *The content model*.
- **The real tag vocabulary.** `PHOTO_TAGS` in `studio/schemaTypes/documents/photo.ts` holds
  placeholders. Lock the real list with her before the Studio is deployed to `production` —
  adding is free afterwards, renaming and removing are not.
- ~~**`@portabletext/vue` is approved but not installed.**~~ **Settled: it is never installed
  directly.** `/writing/[slug]` renders `post.body` — the first route to read one — and needed
  nothing added. `SanityContent` ships with `@nuxtjs/sanity`, already renders Portable Text for
  `proseText`, and takes the same `components` map for a body: `block` for the styles, `marks`
  for the `hyperlink` annotation, `types` for `postPhoto`. `@portabletext/vue` still arrives
  transitively, which is why `ProseLink` and `PostPhoto` can import their props types from it.
  Adding it to `web/package.json` would pin a second copy of something already present.
- **Porting the Squarespace posts.** ~15 of them, and the schema is ready for them but the
  content is not. Every Squarespace date reads `January 01, 2030`, so real dates have to be
  recovered from the text; several slugs are junk
  (`/2018/8/22/8mc14cj2kpvx8ufmgy9utxtw0z8kbc`) and need clean replacements. Old links in
  the world break either way, so decide about redirects at the same time. A `scripts/` job
  against `development` first.
Resolved, kept because the reasoning still applies:

- ~~**`web/sanity.types.ts` may fall outside the app's TypeScript program.**~~ **It did, and
  it is fixed.** `.nuxt/tsconfig.app.json` includes `../app/**/*` and `../*.d.ts`; a `.ts`
  file at the web root matches neither, so the `declare module "@sanity/client"` augmentation
  typegen emits under `overloadClientMethods: true` was outside the program. `typescript.tsConfig.include`
  in `nuxt.config.ts` now names the file explicitly.

  Worth knowing how this fails, because it does not fail loudly: without the augmentation
  `ClientReturn<Q, unknown>` falls back to its second parameter, so every `useSanityQuery`
  result types as `unknown` and *nothing errors* — the routes simply stop being typechecked.
  A green `npm run typecheck` is not evidence. The check that is: point a query result at a
  field that does not exist and confirm the compiler rejects it, naming the real result shape.
