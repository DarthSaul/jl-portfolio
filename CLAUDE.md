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
| **Sanity Studio, deployed via `sanity deploy`** | Sanity hosts the Studio at `<host>.sanity.studio`. `/admin` on this site redirects there, so she still only has to remember one URL. |
| **`@nuxtjs/sanity`** | Client + `useSanityQuery` wiring for the Nuxt app. |
| **GROQ** | Sanity's query language. Lets a route fetch exactly its shape in one request, following references. |
| **Sanity image CDN** | Transform params in the URL — resizing, format negotiation, and LQIP come free, no build-time image pipeline. |
| **Vercel + ISR** | Deployment. ISR means content changes appear on the live site without a build step she has to know about or wait for. |

### The Studio (Phase 1 approach)

The Studio is **not embedded in the Nuxt app**. Sanity Studio is React and Nuxt is Vue;
rather than bridge that, we run `sanity deploy` and let Sanity host the Studio at
`<host>.sanity.studio`. `/admin` on this site is a redirect to it.

Consequences to keep in mind:

- **The Studio is a separate deployment artifact.** Pushing the Nuxt app to Vercel does not
  ship Studio changes, and `sanity deploy` does not ship app changes. A schema change only
  reaches her after `sanity deploy` runs. This is the main cost of the approach — when a task
  touches `sanity/schemas/`, deploying the Studio is part of finishing it.
- **The redirect is a `302`, not a `301`.** A permanent redirect gets cached in her browser
  and would be genuinely annoying to undo if we later embed the Studio. Keep it temporary
  while the arrangement is temporary.
- **The deployed Studio's dataset is baked in at deploy time** from `SANITY_STUDIO_DATASET`.
  Deploy it pointed at `production`. For work against `development`, run the Studio locally.

This is Phase 1. Revisit only if the hop to a second domain actually confuses her, or if
embedded preview / visual editing becomes worth the bridge — not on general principle.

### Datasets

Two datasets on one Sanity project:

- `development` — stock photos, for building and experimenting. Default for local dev.
- `production` — her real content. Never seeded, never scripted against casually.

Any script that writes must take the dataset explicitly and must not default to `production`.

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

1. A new component in `app/components/presets/`.
2. A new option in the hard-coded preset list in the gallery schema.

The schema field is a `string` with a fixed `options.list`. It is never a free-text field.
A preset value that has no matching component must be impossible.

---

## Site structure

| Route | Contents |
| --- | --- |
| `/` | Intro + 5–10 featured photos |
| `/shots` | ~50 curated photos, plus links to the trip galleries |
| `/shots/[slug]` | 5 trip galleries, ~50 photos each |
| `/writing` | Links out to articles published elsewhere. No article bodies live here. |
| `/about` | Short text + a photo |
| `/contact` | Text and links only — see non-goals |
| `/admin` | 302 redirect to the Sanity-hosted Studio. No page component. |

## Planned directory structure

Nothing below exists yet. This is the target shape — follow it when scaffolding.

```
CLAUDE.md
nuxt.config.ts              Nuxt config: sanity module, routeRules (ISR + /admin redirect), Tailwind
sanity.config.ts            Studio config: schema registry. basePath stays '/' —
                            the deployed Studio is served at the root of its own host.
sanity.cli.ts               Project/dataset for the sanity CLI (schema extract, typegen)
sanity.types.ts             GENERATED — do not edit by hand
schema.json                 GENERATED — typegen intermediate

app/
  app.vue
  layouts/
  pages/
    index.vue
    shots/index.vue
    shots/[slug].vue
    writing.vue
    about.vue
    contact.vue
  components/
    SanityPhoto.vue         The only place an <img> is emitted (see conventions)
    presets/                One component per layout preset
  queries/                  GROQ, one file per route
    home.ts
    shots.ts
    trip.ts
    writing.ts
    about.ts
    contact.ts
  composables/
  assets/css/

sanity/
  schemas/
    index.ts                Schema registry
    documents/              photo, gallery, article, page
    objects/

scripts/
  seed.ts                   Writes stock content to `development`

public/
```

## Conventions

**GROQ lives in `app/queries/`, one file per route. Never inline in a component.**
A query is the contract between a route and the content model. Keeping them in one directory
means a schema change has one obvious place to look for breakage, and typegen can find them.

**Queries are declared with `defineQuery` from `groq`.** Sanity's typegen only extracts and
types queries wrapped in `defineQuery()`. A raw template literal produces no type and
silently opts that route out of type checking.

```ts
// app/queries/trip.ts
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

**Types are generated, never hand-written.** `sanity.types.ts` is output from
`sanity schema extract` + `sanity typegen generate`. Do not hand-edit it, do not write a
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

**Sanity schema files are the source of truth for the content model.** Not this document,
not the generated types, not the GROQ queries. Schema changes flow outward:
schema → `typegen` → queries → components. When they disagree, the schema is right and the
rest needs updating.

**The app never writes to Sanity.** All content mutation happens in the Studio or in
`scripts/`. No write token in app code, no mutation endpoints, no server routes that POST to
the Content Lake.

## Commands

Every one of these is **TBD** — no `package.json` exists yet. Intended shape:

| Command | Purpose | Status |
| --- | --- | --- |
| `npm run dev` | Nuxt dev server, `development` dataset | TBD |
| `npm run build` | Production build for Vercel — app only, not the Studio | TBD |
| `npm run studio` | `sanity dev` — local Studio against `development` | TBD |
| `npm run studio:deploy` | `sanity deploy` — ship the Studio to `<host>.sanity.studio` | TBD |
| `npm run seed` | Populate `development` with stock photos and sample galleries | TBD |
| `npm run typegen` | `sanity schema extract` then `sanity typegen generate` | TBD |

`typegen` must be re-run after any schema change or any new/edited query. Consider wiring it
into `dev` and `build` once the shape settles.

## Environment variables

| Name | Purpose |
| --- | --- |
| `NUXT_PUBLIC_SANITY_PROJECT_ID` | Sanity project ID. Public — it's in the client bundle by design. |
| `NUXT_PUBLIC_SANITY_DATASET` | `development` locally, `production` on Vercel. |
| `NUXT_PUBLIC_SANITY_API_VERSION` | Pinned API date. Pin it; don't float. |
| `SANITY_STUDIO_PROJECT_ID` | Same project ID, under the name the Sanity CLI and Studio bundle expect. |
| `SANITY_STUDIO_DATASET` | Dataset the Studio points at. Baked into the bundle at `sanity deploy` time — set it to `production` when deploying, `development` when running `sanity dev`. |
| `SANITY_WRITE_TOKEN` | Write access for `scripts/` only. |

**`SANITY_WRITE_TOKEN` is used by scripts only and is never referenced in app code.** Not in
`app/`, not in `server/`, not in `nuxt.config.ts`, not in runtime config. It never reaches
the browser and never reaches the Vercel runtime — it lives in `.env.local` and in whatever
runs the seed. If a task seems to need it in the app, re-read "The app never writes to
Sanity" above.

The `NUXT_PUBLIC_*` names assume `@nuxtjs/sanity` config surfaces at
`runtimeConfig.public.sanity`. Confirm against the module when `nuxt.config.ts` lands and
correct this table if it differs.

## Non-goals

Not "later" — **not part of this project**. Don't build them, don't leave hooks for them,
don't add a dependency that anticipates them.

- **No commerce.** No prints, no cart, no payments, no licensing flow.
- **No visitor accounts.** No login, no favorites, no comments. The only authenticated user is the editor, in the Studio.
- **No contact form.** `/contact` is text and links — email address, social links. No form, no form handler, no spam mitigation, no inbox to check.
- **No freeform page builder.** No drag-and-drop, no canvas, no per-photo position/size/crop controls, no arbitrary section nesting. See Rule 2.
- **No long-form writing in the CMS.** `/writing` links out to articles published elsewhere. No rich-text article bodies, no post type, no portable-text renderer for essays. Short intro/about/caption text only.

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

- **The Studio hostname.** Unclaimed. `sanity deploy` prompts for it on first run; once
  chosen it's the redirect target in `nuxt.config.ts`.
- **ISR revalidation.** Time-based `routeRules` will make edits appear on a delay. If that
  delay feels wrong to her, it becomes a Sanity webhook doing on-demand revalidation. Start
  with the simple version.
- **The preset set itself.** Which presets exist, and what each guarantees at narrow widths,
  is undecided. That's a design conversation, not an implementation detail.
