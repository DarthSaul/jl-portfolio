import { SiteSocialIcon } from '@/components/SiteSocialIcon'
import { SITE } from '@/content/site'
import { POST_COUNT, getInstagramPosts } from '@/instagram/feed'
import { formatDate } from '@/lib/date'

/**
 * The Instagram strip at the foot of the front page: her handle, a Follow button, and six square
 * tiles — the mockup's layout. Six across from `md` up, three on a phone.
 *
 * **Her six latest posts**, read on the server by `getInstagramPosts()` (`src/instagram/feed.ts`)
 * and cached for an hour; each tile links to the post on Instagram. Nothing in the browser calls
 * Instagram's API. When the read fails — no token, an expired one, Instagram down — the strip
 * shows six blank placeholder tiles linking to her profile instead, so the page never breaks.
 *
 * ## The tiles' `<img>` — the third file on CLAUDE.md's `<img` list
 *
 * These are not Sanity photos, so `SanityPhoto` cannot render them: no asset, no LQIP, no
 * dimensions, no srcset. The images load straight from Instagram's CDN (the URL Instagram returns,
 * signed and expiring, which is why the feed is re-read hourly rather than stored).
 *
 * **The crop is CSS `object-cover`, and that is a deliberate exception to Rule 2's "crops belong
 * in the CDN URL":** Instagram's CDN takes no crop or size parameters, and Instagram's own grid
 * shows every post as a centred square, so this matches what her followers see. The cost is the
 * hidden pixels of a 4:5 post — six lazy images at the foot of the page. `no-referrer` keeps the
 * site's address out of Instagram's logs.
 *
 * The handle and address are read from `SITE.social`'s Instagram entry, so the header icon, the
 * footer link and this strip can never point at three different accounts. An async Server
 * Component.
 *
 * The Follow pill is the second `rounded-full` exception (the mockup's one rounded shape); its
 * text stays canvas on hover — the accent hover is for text links, and red on black is unreadable.
 */
export async function InstagramFeed() {
  const instagram = SITE.social.find(link => link.icon === 'instagram')
  if (!instagram) return null

  const posts = await getInstagramPosts()

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
        {posts?.length
          ? posts.map(post => (
              <li key={post.id}>
                <a
                  href={post.permalink}
                  target="_blank"
                  rel="noopener"
                  className="block aspect-square overflow-hidden bg-placeholder"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- see the doc comment */}
                  <img
                    src={post.imageUrl}
                    alt={post.description ?? `Instagram post from ${formatDate(post.timestamp)}`}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="block size-full object-cover transition-opacity hover:opacity-85"
                  />
                </a>
              </li>
            ))
          : Array.from({ length: POST_COUNT }, (_, index) => (
              <li key={index}>
                <a
                  href={instagram.href}
                  target="_blank"
                  rel="me noopener"
                  aria-label={`${handle} on Instagram`}
                  className={`block aspect-square ${index % 2 === 0 ? 'bg-placeholder' : 'bg-placeholder-alt'}`}
                />
              </li>
            ))}
      </ul>
    </section>
  )
}
