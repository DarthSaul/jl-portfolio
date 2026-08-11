/**
 * The two ways a route can fail to get content, kept distinct because they mean opposite things
 * and once cost real debugging time when they were not.
 *
 * A failed request and an empty result both leave you holding `null`. `SanityUnreachableError`
 * says the request did not happen; `MissingDocumentError` says it happened and found nothing.
 * Conflating them is how "the dataset is empty" gets diagnosed for hours when the actual cause
 * was somewhere else entirely — see the CORS history in CLAUDE.md, which is the archetype.
 *
 * Both surface as an HTTP 500 through `app/error.tsx`. App Router gives a page no way to set a
 * status code — only `notFound()` carries one — so the 502 the Nuxt app threw is gone. Nothing
 * consumed it. What survives is the distinction itself: `error.name` in the server log, and
 * `error.digest` on the page, still tell the two apart.
 */

export class SanityUnreachableError extends Error {
  override readonly name = 'SanityUnreachableError'

  constructor(cause: unknown) {
    super('Could not reach Sanity — see the logged cause.', { cause })
  }
}

export class MissingDocumentError extends Error {
  override readonly name = 'MissingDocumentError'

  /** @param what The document type, as it appears in the schema — e.g. `homePage`. */
  constructor(what: string) {
    super(`No ${what} document found in this dataset.`)
  }
}
