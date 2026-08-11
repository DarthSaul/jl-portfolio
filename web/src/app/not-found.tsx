import Link from 'next/link'

/**
 * The 404. Reached by `notFound()` from `/copy/[slug]` and `/shots/[slug]` when the slug names
 * no document, and by any address with no route at all.
 *
 * Note what does *not* reach here: a bad or hidden `?photo=` on either `/shots` page. That is a
 * query parameter, and CLAUDE.md's rule is that a query parameter must never be able to replace
 * a working gallery with an error screen — so the showcase renders its own "that photo is not
 * here" message with a way back, in place, and the page around it keeps working.
 */
export default function NotFound() {
  return (
    <div className="max-w-read space-y-6">
      <h2 className="type-display-lg text-ink">Nothing at this address.</h2>

      <p className="type-body-serif-lg text-muted">
        The page you are looking for has moved or never existed.
      </p>

      <ul className="flex flex-wrap items-center gap-6">
        {[
          { href: '/', label: 'Start' },
          { href: '/shots/all', label: 'All shots' },
          { href: '/copy', label: 'Copy' },
        ].map(link => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="type-body-sm-strong uppercase tracking-[0.1em] text-ink underline underline-offset-4"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
