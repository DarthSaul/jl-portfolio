import 'server-only'

/**
 * Joan's latest Instagram posts, read on the server for the front page's Instagram strip.
 *
 * The Instagram Graph API through **Facebook Login** (`graph.facebook.com`): a Facebook user
 * token (starts `EAA`) stored server-side as `INSTAGRAM_ACCESS_TOKEN` — no `NEXT_PUBLIC_`, same as
 * the Sanity variables — reading the media of her professional account by its Instagram user id.
 * The browser never sees the token and never calls this API.
 *
 * Not `graph.instagram.com`: that host is the *Instagram Login* route and rejects an `EAA` token
 * with "Cannot parse access token". The two routes take different tokens; this one is ours.
 *
 * ## It never throws
 *
 * Returns `null` on a missing token, a transport failure, an Instagram error (an expired token is
 * the likely one) or an unexpected shape, and logs `instagram: …`. The strip then shows its
 * placeholder tiles, still linking to her profile. This is the third call site that swallows
 * errors (after `SiteNav` and `getSiteSettings()`), and the argument is: a third party's outage or
 * a lapsed token must never 500 her front page, and the placeholders are an honest page.
 *
 * Log lines never include the request URL — it carries the token.
 *
 * ## Caching
 *
 * An hour, independent of Sanity's 60s. Instagram's image URLs are signed and expire (days, not
 * hours), so an hour keeps them fresh while staying far inside the API's rate limits. The token
 * lasts 60 days and is refreshed by hand for now — see CLAUDE.md.
 */

const API = 'https://graph.facebook.com/v26.0'

/**
 * Her Instagram professional account's id (an IG User id, not her @handle). Not a secret — it
 * only works with a token — so it lives here rather than in the environment. If the account is
 * ever re-linked, `GET /me/accounts?fields=instagram_business_account` on the token finds it.
 */
const IG_USER_ID = '17841400061475266'
const REVALIDATE_SECONDS = 3600
export const POST_COUNT = 6

/** Exactly what the strip renders. Not a Sanity shape, so it is written by hand. */
export type InstagramPost = {
  id: string
  permalink: string
  /** Photo URL, or a video's cover frame, or an album's first photo. Instagram's CDN, signed. */
  imageUrl: string
  /** Her alt text if she wrote one, else the caption's first line, else null. */
  description: string | null
  timestamp: string
}

type ApiMedia = {
  id?: string
  media_type?: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url?: string
  thumbnail_url?: string
  permalink?: string
  caption?: string
  alt_text?: string
  timestamp?: string
}

// `alt_text` is requested but this route has not returned it so far; when absent the caption's
// first line stands in.
const FIELDS = 'id,media_type,media_url,thumbnail_url,permalink,caption,alt_text,timestamp'

/** First line of a caption, trimmed to something an `alt` can carry. Hashtag tails dropped. */
const captionLine = (caption?: string) => {
  const line = caption?.split('\n')[0]?.replace(/(\s#\S+)+\s*$/, '').trim()
  if (!line) return null
  return line.length > 140 ? `${line.slice(0, 139)}…` : line
}

const toPost = (media: ApiMedia): InstagramPost | null => {
  // A video's media_url is the video itself; its picture is thumbnail_url. Meta also documents
  // media_url as omittable (copyright-flagged audio), so fall through to the thumbnail.
  const imageUrl = media.media_type === 'VIDEO'
    ? media.thumbnail_url
    : media.media_url ?? media.thumbnail_url
  if (!media.id || !media.permalink || !imageUrl || !media.timestamp) return null
  return {
    id: media.id,
    permalink: media.permalink,
    imageUrl,
    description: media.alt_text?.trim() || captionLine(media.caption),
    timestamp: media.timestamp,
  }
}

export async function getInstagramPosts(): Promise<InstagramPost[] | null> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!token) {
    console.warn('instagram: INSTAGRAM_ACCESS_TOKEN is not set; showing placeholders')
    return null
  }

  // A few spare, in case a post has no usable picture and is skipped.
  const url = `${API}/${IG_USER_ID}/media?fields=${FIELDS}&limit=${POST_COUNT + 4}&access_token=${encodeURIComponent(token)}`

  try {
    const response = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } })
    const body = await response.json() as { data?: ApiMedia[], error?: { message?: string, code?: number } }

    if (!response.ok || body.error) {
      console.error(`instagram: API error ${response.status} (code ${body.error?.code ?? '?'}): ${body.error?.message ?? 'no message'}`)
      return null
    }
    if (!Array.isArray(body.data)) {
      console.error('instagram: unexpected response shape (no data array)')
      return null
    }

    return body.data.flatMap(media => toPost(media) ?? []).slice(0, POST_COUNT)
  }
  catch (error) {
    console.error(`instagram: request failed: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}
