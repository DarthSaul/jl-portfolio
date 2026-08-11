import 'server-only'

import { createClient } from '@sanity/client'

/**
 * The one Sanity client, and it is server-side only.
 *
 * `import 'server-only'` is the enforcement, not a note: importing this module from anything in
 * the client graph is a build error naming the file that did it. That matters because the whole
 * environment-variable story rests on it — nothing here carries a `NEXT_PUBLIC_` prefix, so
 * nothing here reaches the browser bundle, and the day something did the values would silently
 * come back `undefined` rather than leaking. The error is better than either outcome.
 *
 * The site has exactly one read that happens after hydration — "load more" on /shots/all — and
 * it goes through `app/api/photos` for this reason. See CLAUDE.md.
 */

/**
 * No defaults, deliberately, and this is the same refusal `studio/dataset.ts` makes.
 *
 * `nuxt.config.ts` used to default the dataset to `development`, which is precisely the failure
 * worth preventing: a deploy missing the variable would read a dataset the live site does not
 * publish from, quietly, and look like it was working. Both wrong answers fail silently, so
 * neither gets to be the default.
 *
 * Throwing at module scope means the *build* fails and names the variable, rather than a route
 * failing at request time with a 500 that says nothing.
 */
const required = (name: string): string => {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `${name} is not set. Copy web/.env.example to web/.env, and set the same value in the `
      + `Vercel project settings — a correct web/.env proves nothing about production.`,
    )
  }
  return value
}

export const client = createClient({
  projectId: required('SANITY_PROJECT_ID'),
  dataset: required('SANITY_DATASET'),
  apiVersion: required('SANITY_API_VERSION'),

  // Reads go through the CDN. Content changes reach the page through ISR revalidation rather
  // than through a live read — see `REVALIDATE` in ./fetch.
  useCdn: true,

  // Belt and braces. At this API version the default perspective is already `published`, and an
  // anonymous read of a public dataset cannot see drafts regardless — but the app rendering a
  // draft would be a real bug, and stating it costs nothing. The day a preview/draft mode is
  // added, this is the line that has to change on purpose rather than by omission.
  perspective: 'published',
})
