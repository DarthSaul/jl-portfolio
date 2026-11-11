import { SiteSocialIcon } from '@/components/SiteSocialIcon'
import { SITE } from '@/content/site'

/**
 * The Instagram strip at the foot of the front page: her handle, a Follow button, and six square
 * tiles — the mockup's layout. Six across from `md` up, three on a phone.
 *
 * **Placeholders.** Not connected to Instagram yet; the tiles are blank and each links to her
 * profile. When it is wired up, the posts must reach the page server-side like everything else —
 * nothing in the browser calls a third-party API (see CLAUDE.md, "The browser never talks to
 * Sanity", which applies in spirit here).
 *
 * The handle and address are read from `SITE.social`'s Instagram entry, so the header icon, the
 * footer link and this strip can never point at three different accounts. A Server Component with
 * no data.
 *
 * The Follow pill is the second `rounded-full` exception (the mockup's one rounded shape); its
 * text stays canvas on hover — the accent hover is for text links, and red on black is unreadable.
 */
const PLACEHOLDER_TILES = 6

export function InstagramFeed() {
  const instagram = SITE.social.find(link => link.icon === 'instagram')
  if (!instagram) return null

  const handle = `@${new URL(instagram.href).pathname.replaceAll('/', '')}`

  return (
    <section aria-labelledby="instagram-heading">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-3.5">
        <div className="flex items-center gap-3">
          <SiteSocialIcon name="instagram" className="size-6 text-ink" />
          <h2 id="instagram-heading" className="type-display-md text-ink">
            <a href={instagram.href} target="_blank" rel="me noopener" className="transition-colors hover:text-accent">
              {handle}
            </a>
          </h2>
        </div>

        <a
          href={instagram.href}
          target="_blank"
          rel="me noopener"
          className="type-button-md rounded-full bg-ink px-5 py-3 text-canvas transition-opacity hover:opacity-80"
        >
          Follow on Instagram
        </a>
      </div>

      <ul className="grid grid-cols-3 gap-1.5 md:grid-cols-6">
        {Array.from({ length: PLACEHOLDER_TILES }, (_, index) => (
          <li key={index}>
            <a
              href={instagram.href}
              target="_blank"
              rel="me noopener"
              aria-label={`Instagram post ${index + 1}`}
              className={`block aspect-square ${index % 2 === 0 ? 'bg-placeholder' : 'bg-placeholder-alt'}`}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
