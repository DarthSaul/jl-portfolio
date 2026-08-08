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
| **Tailwind CSS** | Layout presets are the only place layout is decided; utility classes keep that decision local to the preset component. v4, CSS-first — the `@theme` and `@utility` block in `web/app/assets/css/tailwind.css` is the single source for type, colour and container width. **There is no `tailwind.config.ts` and one should not be added.** |
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
  `SANITY_STUDIO_DATASET` is unset. There is no safe default: `production` means a machine
  without `studio/.env` silently edits her real photos, and `development` means a deploy
  silently ships a Studio full of stock content. Both are wrong, so neither is the default.
  `npm run deploy` pins `production` itself, so the deployed Studio cannot inherit a local
  `.env`. Local work sets `development` in `studio/.env`.
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
  going-live steps; the other is clearing the stock content out of `production`, in *Datasets*
  below. Neither requires touching the dataset itself.

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

- `development` (public) — stock photos, for building and experimenting. What local dev
  points at, via `SANITY_STUDIO_DATASET` in `studio/.env` and `NUXT_PUBLIC_SANITY_DATASET`
  in `web/.env`.
- `production` (public) — eventually her real content. Reached only by an explicit
  `SANITY_STUDIO_DATASET=production`, which `npm run deploy` supplies.

Any script that writes must take the dataset explicitly and must not default to `production`.

**`production` currently holds a copy of `development`'s stock content, and that is
temporary.** It was seeded on 2026-08-03 — a 22-document, 14-asset copy of `development` —
because the Vercel deployment reads `production` and the front page throws a 500 when no
`homePage` document exists. This file used to say `production` was never seeded, and the
reasoning behind that line still holds *for a live site*: stock photographs published under
her name is exactly the failure it was guarding against. What made it safe to override is that
nothing is live yet. **The Vercel app is at `jl-portfolio-seven.vercel.app` and
`joanatstake.com` is not pointed at it**, so `production` is a staging dataset wearing the
production name until DNS is connected.

Two consequences that outlive the seeding:

- **Connecting the domain is not a DNS-only task — but it does not need the dataset wiped
  either.** The stock content has to be gone before `joanatstake.com` resolves. Deleting and
  recreating `production` is not how to get there, and an earlier draft of this section said it
  was, on the grounds that nothing tracked which documents were seeded. Something does: every
  seeded document kept its `_id` through the import. Verified 2026-08-03 — all 36 documents in
  `production` share an `_id` with one in `development`, and **not one document is
  production-only**. So the seeded set is recoverable, and a targeted delete is available.

  **But "seeded" and "safe to delete" are not the same set, and conflating them deletes her
  front page.** Singletons are pinned by `structure.ts` to a `documentId` equal to the type
  name — `homePage`'s `_id` is the literal string `homePage`, identical in both datasets by
  construction, not by coincidence. It is also the exact document she edits, because a singleton
  is edited in place and never replaced. It is seeded *and* must survive. A manifest of imported
  ids has the same hazard for the same reason: it would list `homePage` too. The problem is not
  how provenance is recorded, it is that provenance does not imply disposability.

  So the delete has to be scoped, and a `scripts/` job is the place for it (GROQ cannot span
  datasets, and the rule above requires both dataset names be passed explicitly):

  - **By type.** Remove the stock *content* — `photo`, `post`, `article` and their image assets.
    Never singletons; those get edited, not deleted.
  - **By modification time.** The import stamped `_updatedAt` on everything it wrote — currently
    `2026-08-03T17:09:09Z`. Anything with a later `_updatedAt` is something she has touched since,
    which means it is no longer stock regardless of where its `_id` came from. Skip those.
  - **Dry run first**, listing what would go, before anything is deleted.

  That ordering also survives the passage of time in a way a wipe does not: the moment she adds
  or edits real content, a wipe takes it and the scoped delete does not. And recreating has a
  trap of its own — `--visibility` is optional on `sanity dataset create`, `development` started
  private, and a private dataset read anonymously returns **HTTP 200 with an empty result**
  rather than an error. Rebuilding the dataset to fix stock content would risk reintroducing the
  silent failure documented directly below, to solve something a scoped delete already solves.

  So the going-live checklist is content plus one CORS entry, and neither step touches the
  dataset itself. See the app-origin CORS bullet above for the second.
- **`npx sanity dataset copy <src> <dst>` refuses when the target already exists**, and there
  is no `--force`. Copying into a dataset that exists is `sanity dataset export` followed by
  `sanity dataset import <tarball> --dataset <name>`, which is what was actually run. It
  strengthens references on the way in, so the result is a genuine copy rather than one dataset
  pointing at another's assets. Note it does *not* mint new `_id`s — asset ids are content
  hashes and document ids are carried over verbatim, which is what makes the seeded set
  identifiable above.

**Both datasets are `public`, and `development` had to be changed to match.** It started
private, which broke the app in a genuinely nasty way: an anonymous read of a private dataset
returns **HTTP 200 with an empty result set**, not a 401. Nothing errors, nothing logs, the
query just resolves to `null` and the page renders as though the content had been deleted.

Public here means public *reads*; writes still need a token, and the Studio still requires a
login. The alternative was a server-only read token in `web/.env`, and it was rejected on the
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

The same photograph appears on `/shots/everything` and on a gallery page. It must be **one record with one
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
| `/shots/everything` | Every photo she has uploaded except those flagged `excludeFromIndex`. Tag filters, infinite scroll. A **static route, so it shadows `[slug]`** — `gallery.ts` refuses the slug `everything` because of it. |
| `/shots/[slug]` | One gallery, rendered through its preset. **Her galleries define this route** — creating one in the Studio makes the page and lists it in the nav. |
| `/writing` | Her own posts and links out to others, newest first, interleaved |
| `/writing/[slug]` | A `post` — writing that lives here. An `article` never reaches it. |
| `/about` | Her bio — prose with photographs in it. Same body shape as a `post`. |
| `/contact` | Text and links only — see non-goals |
| `/admin` | 302 redirect to the Sanity-hosted Studio. No page component. |

## The front page

**The numbered slots are gone, and this section is kept because what replaced them is
smaller.** The page began as seven fixed slots mirroring the Squarespace site it replaces,
numbered 1–7 in `homePage`'s field order. Slots 1–3 became site chrome on every page; slot 4
moved to `/about`; and two more are parked. Numbering three surviving fields against a scheme
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
commented line in `index.vue`; `featuredTitle` and `featuredSubtitle` came off the photo row
when it became a grid, and `ProseHeading` has had no caller since. All three are still in the
schema and still in `HOME_QUERY`, waiting on a decision about where they belong now the page
opens with photographs instead of closing with them. Do not delete the fields or the query
lines to tidy up — that is a content decision, not a cleanup.

**The whole introduction left this page.** `introHeading` and `intro` are `aboutPage`'s fields
now and open `/about`; the component that renders them moved with them, from `home/Hero.vue` to
`about/Intro.vue`. `introPhoto` was deleted outright rather than following them — `aboutPage`
has no photo field by design, and photographs on that page come from the body. Nothing on the
front page shows a photograph of her any more, which is the intended end state rather than a
gap: the page opens with her work.

**Status: the site name and byline still do not read from Sanity.** They come from
`web/app/content/site.ts`, because no `siteSettings` document exists in either dataset — the
type is in the schema, nothing has been created against it. Wiring them means creating the
singleton and giving the layout a query, which is site chrome rather than front-page work and
touches every route.

**Slot 3, the nav, is no longer purely frontend — and that reverses a decision this file used
to state flatly.** It said the nav was frontend-only by design and stayed there, and that held
while every route was known at build time. It stopped holding the moment she could create a
gallery and expect a page to exist for it: the route table is now partly hers.

The reversal is deliberately partial, and the split is the thing to preserve. The four
top-level items are still hardcoded in `content/site.ts`, because they are the shape of the
site. Only the gallery sub-items under START come from Sanity, via `queries/nav.ts`. One
consequence worth knowing: `SiteNav` is the only place on the site that **swallows a query
error**. Every route throws on a failed Sanity read, because a page with no content is broken;
this is chrome on every page, so a failure costs the gallery links and leaves the site
navigable rather than taking down every route at once.

Three things about that sub-list, all in `SiteNav.vue`:

- **Its order is not the query's.** `NAV_QUERY` returns title A–Z; the component then pins one
  gallery to the top by slug (`PINNED_FIRST`, currently `life`) and appends EVERYTHING at the
  bottom. So app code names one of her documents — deliberately, and it fails soft in every
  direction: renaming the gallery keeps the pin, changing its slug or deleting it just drops
  the pin and leaves the rest alone. If the order ever needs to be hers, that is an ordering
  field on `gallery`, which is a schema change and a new knob.
- **It collapses**, via a button beside START rather than by making START itself the toggle —
  a link that also expands is the classic nav trap where a keyboard user reaches the section
  and never the page. Open by default; the state is a plain `ref` and survives client-side
  navigation because `SiteNav` lives in the layout and does not unmount.
- **`v-show`, never `v-if`, on the group.** The button's `aria-controls` names the list by id,
  and `v-if` would remove the element it points at exactly when the group is closed — which is
  when that attribute is being read.

**Slots 1–3 are no longer a header.** They are the top of the left sidenav — `SiteSidebar.vue`
— on every page, and a hamburger drawer below `lg`. That does not change where they read from
or what would have to happen to wire them to `siteSettings`; it changes only which file to
open. One consequence worth knowing: the byline sits in the collapsible part of the sidebar, so
on a phone it is visible only while the nav is open. The alternative was the same string in two
places, which is worse.

## The content model

Twelve types. The schema files in `studio/schemaTypes/` are the source of truth; this table
is a map, not a spec.

| Type | Shape | Notes |
| --- | --- | --- |
| `photo` | image, alt (required), caption, place, dateTaken, tags, **excludeFromIndex** | Rule 1's anchor. No title field. A tag can now drive a page — see below. |
| `gallery` | title, slug, description, preset, **tag**, photos → refs | Rule 2's home: `LAYOUT_PRESETS`. Fills from a tag **or** a hand-picked list — see *Two ways a gallery fills itself*. |
| `post` | title, slug, summary, coverPhoto → ref, publishedAt, body | Writing that lives **here**. Body is prose + `postPhoto`. |
| `article` | title, publication, url, publishedAt, summary, coverPhoto → ref | A link out. No body, by design. |
| `homePage` | title, blurb, featuredWriting → refs, featuredTitle, featuredSubtitle, featuredPhotos → `featuredPhoto` objects | Singleton. See *The front page*. The whole introduction — heading, text and photo — has left this document. |
| `writingPage` | title, intro | Singleton. Posts and articles are queried, not listed by hand. |
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
- **Adding a tag to `PHOTO_TAGS` is free. Renaming or removing one is not** — the old
  string stays on every photo already using it, no longer matches the list, and its
  checkbox quietly disappears. Adding a tag also adds its browse list in the sidebar,
  because `structure.ts` maps over the same array.
  - **A tag `value` is now load-bearing in a second place, and that doubles the cost of
    changing one.** A `gallery` can point at a tag, in which case every photo carrying it
    appears on that gallery's page. Renaming a value used by a gallery breaks two things at
    once, in different places, and neither says so: the photos keep the old string and drop
    out of the list, and the gallery's `tag` matches nothing so its page goes *empty rather
    than erroring*. The `title` is only ever a Studio label and is free to change whenever.
    Change titles; leave values alone. The values are slug-shaped (`mexico-2022`) for the same
    reason.
  - **Nothing marks which tags are "project" tags and which are browse-only**, and that is
    deliberate. "Does this tag have a page" is answered by whether a gallery points at it —
    one fact in one place, rather than a flag on the tag that could disagree with reality.
- **`excludeFromIndex` is a boolean on `photo`, deliberately not a tag.** It hides a photograph
  from `/shots/everything` and from nowhere else — she asked for it so an article's cover photo
  need not appear among her photography. It was very nearly an "Exclude" *tag*, and the reason
  it is not is what tags have become: a tag is a topic, it generates a browse list, and a
  gallery can be pointed at one. An "Exclude" value sitting between "Mexico 2022" and "Street"
  would be one mis-click from a published gallery of exactly the photographs she meant to hide.

  Its scope is narrow on purpose. A flagged photograph still appears wherever she placed it by
  hand — an article cover, a body of prose, a gallery, the front page — because a flag that
  silently emptied those would be a worse surprise than the one it prevents.
- **`web/app/content/tags.ts` is a second copy of the tag vocabulary, and the compiler is what
  keeps it honest.** The app cannot import `PHOTO_TAGS` — separate packages, separate installs
  — but it needs the human-readable titles for the filter row. `TAG_LABELS` is typed
  `Record<PhotoTag, string>` where `PhotoTag` comes from typegen, so adding a tag to the schema
  and not adding a label here is a compile error naming the missing one. Same trick as the
  `PRESETS` map: duplication that cannot drift is a different thing from duplication.
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
  - **`postPhoto.layout` is a preset, and it is the one place that distinction has been
    tested.** The object's own comment used to end "do not add a width, a size, an alignment or
    a 'full bleed' toggle to it", and a full-width option looks exactly like the last of those.
    The line Rule 2 actually draws: it forbids *positioning* — a width, a column count, a crop
    offset, a breakpoint, numbers she sets per photograph — and explicitly permits *presets*,
    "components that guarantee the result works at every width". `layout` is a fixed list of
    two, carries no numbers, and both branches are responsive on their own terms, so it is the
    second thing. What must still never appear there: a width, a percentage, an alignment, or
    anything that only makes sense at one screen size.

    Two consequences worth knowing before touching it. The class map in `BodyPhoto.vue` is
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
                              web/app/assets/css/tailwind.css, with ONE deliberate departure
                              (the canvas is cream, not white). It has been swapped twice
                              already — see "The design system" in Conventions for what a swap
                              is and is not allowed to move.
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
      index.vue             ✎ LIVE — the photo grid and featured writing, from Sanity
      shots/everything.vue  ✎ LIVE — the index of every photo, filters + infinite scroll.
                              STATIC, so it shadows [slug] — gallery.ts refuses that slug.
      shots/[slug].vue      ✎ LIVE — one gallery, through its preset. No shots/index.vue:
                              /shots itself was a stub and is gone, so it 404s while its
                              children do not.
      writing/index.vue     ✎ LIVE — posts and links out, newest first, from Sanity
      writing/[slug].vue    ✎ LIVE — one post, body and all
      about.vue             ✎ LIVE — intro, body and the portrait
      contact.vue
    components/
      SanityPhoto.vue       ✎ The only place an <img> is emitted (see conventions)
      SiteSidebar.vue       ✎ All the chrome: wordmark, byline, nav, socials, copyright.
                              The desktop column AND the mobile drawer, one instance —
                              see the single-<h1> note in the file. There is no SiteHeader
                              and no SiteFooter; this replaced both.
      SiteNav.vue           ✎ The nav inside it, stacked
      SiteSocialIcon.vue    ✎ Four hand-written glyphs. Named Site* because content/site.ts
                              already exports a `SocialIcon` *type*, and the auto-import
                              would collide with it.
      ProseText.vue         ✎ Renders a proseText field via SanityContent
      ProseHeading.vue      ✎ The same, as a real <h2> — see the note above. NO CALLER right
                              now: it rendered homePage.featuredTitle above the photographs,
                              and that field is looking for a new home. Not dead code yet.
      ProseLink.vue         ✎ The `hyperlink` annotation inside one. The only user of
                              --color-link.
      ProseBody.vue         ✎ A body of prose with photos in it — post.body and aboutPage.body
      BodyPhoto.vue         ✎ The postPhoto member of one, floated and wrapped by the text
      about/                ✎ Intro — the heading and introduction at the top of /about.
                              Was `home/Hero.vue`; moved with the fields it renders.
      home/                 ✎ FeaturedWriting, PhotoStrip — slots 6 and 7.
                              PhotoStrip no longer owns a layout: it uses the `grid` preset
                              through its slot so each photo can become a link. The name is
                              now a lie worth fixing the next time that file is opened.
      writing/              ✎ ListItem — one row of the WRITING list
      shots/                ✎ FilterBar — the tag filters on /shots/everything, built from
                              DESIGN.md's button-outline / button-primary pair. Links, not
                              buttons, so the filter is in the URL and shareable.
      presets/              ✎ One component per layout preset, and the list is exhaustive by
                              typecheck — see the PRESETS map in pages/shots/[slug].vue.
                              GalleryGrid (wrap-and-fill rows, also used by the front page)
                              and GalleryStack (full-measure column).
    utils/                  ✎ date.ts — formatDate, auto-imported. See the UTC note in it.
    queries/                ✎ GROQ, one file per route
      photo.ts              ✎ The shared photo projection. Not a route — see below.
      nav.ts                ✎ NAV_QUERY — the galleries listed under START. Not a route
                              either: it is chrome, read on every page.
      everything.ts         ✎ EVERYTHING_QUERY (first page, total, tags in use) and
                              MORE_PHOTOS_QUERY (one further slice). Filters on $filterTag,
                              NOT $tag — see the reserved-key note in Conventions.
      home.ts               ✎
      shots.ts              ✎ GALLERY_QUERY — one gallery, both fill modes resolved to one
                              `photos` array. Read the `^` scoping notes before editing it.
      writing.ts            ✎ WRITING_QUERY (the list) and POST_QUERY (one post)
      about.ts              ✎ ABOUT_QUERY — the bio, body dereferenced
      contact.ts
    content/                ✎ Site chrome only, now the placeholders are gone.
      tags.ts               ✎ TAG_LABELS — the tag vocabulary's titles, for the filter row.
                              Exhaustive over the generated tag union, so it cannot drift
                              from the schema without failing typecheck.
      site.ts               ✎ Wordmark, tagline, nav, social links. Deliberately never CMS
                              content. (Was "footer links" — there is no footer any more.)
    composables/            ✎ useNavDrawer.ts — open/closed state for the mobile nav.
                              State and actions only: it is called from two components, so a
                              lifecycle hook in it would register two Escape listeners. Every
                              effect lives in SiteSidebar.vue.
    assets/css/             ✎ tailwind.css — the design system. Type, colour and container
                              width are decided here and nowhere else. See Conventions.
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
  .env.example              ✎ SANITY_STUDIO_DATASET only
  schema.json                 GENERATED — typegen intermediate, gitignored
  schemaTypes/
    index.ts                ✎ Schema registry
    photoPicker.ts          ✎ excludeAlreadyChosen — shared reference-picker filter
    documents/              ✎ photo, gallery, post, article,
                              homePage, writingPage, aboutPage,
                              contactPage, siteSettings
    objects/                ✎ link, postPhoto, proseText, featuredPhoto

scripts/
  seed.ts                     Writes stock content to `development`
```

**`web/` is Vercel's root directory** — set it in project settings, or Vercel will try to
build the repo root and find no app.

## Conventions

### The design system

**`DESIGN.md` is the spec; `web/app/assets/css/tailwind.css` is the implementation.** Colour,
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
tailwindcss@4.3.3: with a token absent, `hover:text-accent` emits zero rules — no warning, no
error, the class simply stays in the markup doing nothing. After any palette change, grep the
old token names across `web/app` and expect hits only in prose. That is the only thing standing
between a deleted token and a stale class that looks fine in review.

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
exception the spec allows, "circular icon containers only": exactly two call sites, the
thumbnails on /writing and the social links in the sidebar. `grep -rn "rounded-" web/app`
should return those two and nothing else.

Worth keeping straight across spec swaps, because the previous one was built on generous radii:
**a corner radius is not a crop.** It is a surface treatment — `SanityPhoto` reads the box from
the asset's own metadata and the CDN URL carries only `w` and `auto=format`, with no `fit` and
no `rect`. Rule 2 is about who decides framing, and rounding a corner decides nothing. So
`rounded-*` on a photograph is a design question, free to come and go with the spec;
`object-cover` on one is a Rule 2 question and is not.

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

**A GROQ parameter cannot be named after a fetch option, and the error will not tell you
that.** `QueryParams` in `@sanity/client` declares a list of keys as `never` — `tag`, `query`,
`perspective`, `signal`, `token`, `cache`, `headers`, `method`, `timeout`, `useCdn` and more —
on the grounds that passing one as a GROQ parameter is nearly always a mistake. `tag` is
Sanity's request tagging. A parameter named `$tag` therefore fails with **"Type 'string' is not
assignable to type 'undefined'"**, which names the overload the call fell through to and says
nothing about the collision. `/shots/everything` filters on `$filterTag` for exactly this
reason. Check that list before naming a parameter after anything that sounds like a request
setting.

**Two more things about `useSanityQuery` that fail in ways that do not name themselves**, both
hit while building that page:

- **Its params argument must be a plain reactive object, never a `computed`.** It calls
  `reactive(params)` and then `JSON.stringify(params)` to build a cache key; a `ComputedRef`
  makes the second one throw *"Converting circular structure to JSON … ComputedRefImpl"* from
  inside the composable. Declare `reactive({ … })` and mutate a property to refetch — the
  composable already pushes the object onto its own `watch` list.
- **`useSanity().fetch` is not the same as `useSanity().client.fetch`.** The helper declares
  `fetch: SanityClient['fetch']`, an indexed access on an *overloaded* method, which TypeScript
  flattens to one signature instead of carrying all four. Use `client.fetch` for the imperative
  path, and give it an explicit result type from `sanity.types.ts`.

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

**The app never writes to Sanity.** All content mutation happens in the Studio or in
`scripts/`. No write token in app code, no mutation endpoints, no server routes that POST to
the Content Lake.

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
| `npm run typegen` | `sanity schemas extract --force` then `sanity typegen generate` | ✎ works |
| `npx sanity schemas validate` | Check the schema for problems. Touches no data. | ✎ works |

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
the repo root.

### Fresh checkouts and worktrees

A worktree is a fresh checkout: no `.env` files, no `node_modules`. `npm run dev` in
`studio/` is impossible without the second and refuses to start without the first, since
`dataset.ts` throws on an unset `SANITY_STUDIO_DATASET`.

**`.worktreeinclude`** closes the first half. It lists the three gitignored `.env` files,
and Claude Code copies them into every worktree it creates — native, and no code to own.
It only fires for worktrees Claude Code makes, so `git worktree add` by hand and a fresh
`git clone` still need the files put there some other way.

It copies `studio/.env` verbatim, which is safe only because that file has exactly one
legitimate value. **`studio/.env` holds `development`.** Production is reached two other
ways and neither of them writes to it: `npm run deploy` pins `SANITY_STUDIO_DATASET=production`
itself, and a one-off look at real content is an inline override for that single command,
`SANITY_STUDIO_DATASET=production npm run dev` — an inline value beats the file, which
`npx sanity debug` will confirm.

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

- **Vision plugin in the Studio.** `@sanity/vision` (a GROQ playground) ships in
  `studio/sanity.config.ts` from the generator. It's useful while building and clutter for
  her — a visible tab that does nothing she needs. Keep it through the query-building phase;
  it is how the image metadata and the GROQ get verified. Delete the one line in the
  handover PR, so the decision has a home instead of drifting.
- **ISR revalidation.** Time-based `routeRules` will make edits appear on a delay. If that
  delay feels wrong to her, it becomes a Sanity webhook doing on-demand revalidation. Start
  with the simple version.
- **Fonts are hotlinked rather than vendored.** ~171 kB of latin woff2 across five files, from
  `fonts.gstatic.com`. Copying them into `web/public/fonts/` and serving them same-origin
  removes a third-party dependency, removes a DNS + TLS handshake from the critical path, and
  removes the silent-404 failure mode entirely. Deferred, not rejected — `web/public/` does not
  exist yet. Note the number moves with the spec: it was ~48 kB and one file under the previous
  one, so re-measure rather than quoting this line after a swap.
- **The copyright is only visible on a phone with the nav drawer open.** It sits at the bottom
  of the sidebar. If that turns out to matter, the fix is to *move* the single node into a slim
  `<footer>` at the end of `<main>` — never to duplicate it into both.
- ~~**`/about` reads `homePage.introPhoto`.**~~ **Settled: the field is gone and so is the
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
  `development`.** `home/PhotoStrip.vue` wraps photographs into rows by a flex basis
  proportional to each one's aspect ratio; `K` (the `22rem` in the basis) sets roughly how tall
  a row wants to be before wrapping, and at the current content it produces a 3-then-2 split on
  a wide screen. Different photographs will pack differently — that is the mechanism working,
  not breaking. The `sm:max-w-[55%]` beside it is a guard so a leftover single photograph
  cannot grow to fill a whole row; measured, it was reaching 765px tall at tablet widths
  without it. Both are properties of the grid, never of a photograph, so neither is a Rule 2
  control — but re-measure them if `featuredPhotos` ever stops being exactly five.
- ~~**The preset set itself.**~~ **Settled: both are built.** `GalleryGrid` packs rows where
  every photo shares a height and takes a width from its own shape; `GalleryStack` gives each
  the full reading measure down a column. Neither crops. What is *not* settled is whether two
  is the right number — a third would be a component plus a `LAYOUT_PRESETS` line, always
  together, and the `PRESETS` map in `pages/shots/[slug].vue` now makes that pairing a
  typecheck failure rather than a convention.
- **The tag vocabulary is real now, but only half-decided.** The six original placeholders
  (Street, Portrait, …) are still there alongside the five she asked for. That was a
  deliberate call — she may want both trip tags and visual-category tags — but it means eleven
  checkboxes on every photo, six of which nobody has chosen on purpose. Worth revisiting with
  her before the Studio ships, and cheap only until she starts using them: adding is free
  afterwards, renaming and removing are not, and a value is now a page as well as a tag.
- **Infinite scroll on /shots/everything gives up one thing that was not recoverable.** The
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
