'use client'

import Link from 'next/link'
import { useEffect } from 'react'

/**
 * Where a route's thrown error lands — both `SanityUnreachableError` (the request did not happen)
 * and `MissingDocumentError` (it happened and found nothing). Both are HTTP 500.
 *
 * ## What is knowable here, and what is not
 *
 * **In production Next redacts the message.** `error.message` is replaced with a generic string
 * and only `error.digest` — a hash — crosses to the browser. That is deliberate hardening and it
 * is the same trade the Nuxt app made: it replaced a 5xx `message` with "Server Error" and
 * forwarded only the status line. So this page cannot tell a visitor which of the two failures
 * happened, and should not try.
 *
 * **The real diagnostic is the server log**, where the error arrives whole — name, message and
 * `cause`. For a `SanityUnreachableError` the `cause` is the underlying Sanity client error: a
 * 404 for a dataset name that does not exist, a 401, an outage. That is what reaches Vercel's
 * function logs, and it is the first place to look. `digest` is printed below precisely so a
 * report from her can be matched to a line in that log.
 *
 * In development the overlay shows the whole thing and this component is barely seen.
 *
 * ## Why there is no 502 any more
 *
 * The Nuxt app distinguished a transport failure (502) from a missing singleton (500) in the
 * status code. App Router gives a page no way to set one — `notFound()` is the only exception,
 * and it is 404. Nothing consumed the 502, and the distinction survives where it was actually
 * used: `error.name` in the log.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // The browser half. On a client-side navigation the throw never touches the server, so this
    // console is the only place the failure appears at all.
    console.error(error)
  }, [error])

  return (
    <div className="max-w-read space-y-6">
      <h2 className="type-display-lg text-ink">Something went wrong.</h2>

      <p className="type-body-serif-lg text-muted">
        This page could not be loaded. It is most likely temporary — try again, or head back to
        the start.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="type-body-sm-strong border border-ink px-5 py-3 uppercase tracking-[0.1em] text-ink transition-colors hover:bg-ink hover:text-canvas"
        >
          Try again
        </button>

        <Link
          href="/"
          className="type-body-sm-strong uppercase tracking-[0.1em] text-ink underline underline-offset-4"
        >
          Go to the start
        </Link>
      </div>

      {error.digest && (
        <p className="type-caption text-muted">
          Reference:
          {' '}
          {error.digest}
        </p>
      )}
    </div>
  )
}
