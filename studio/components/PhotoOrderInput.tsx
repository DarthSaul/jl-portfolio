import {useCallback, useEffect, useMemo, useState} from 'react'
import {insert, setIfMissing, useClient, useFormValue} from 'sanity'
import type {ArrayOfObjectsInputProps, Reference} from 'sanity'
import styled from 'styled-components'

/**
 * The input for `gallery.leadPhotos` ("Photo order").
 *
 * The stored array is only the photos she has PLACED — the rest of the page is a tail the
 * site computes at query time (`web/src/sanity/queries/shots.ts`), so the default array
 * input showed a blank field on a gallery whose page renders thirty photographs. She could
 * not see the current order anywhere but the live site, which made the field look broken
 * rather than optional. This input closes that gap: it renders the default array (drag to
 * reorder, as before) and then the tail below it — the same photos, in the same order, the
 * page will append. "Place" moves one into the arranged list; "Place all" materialises the
 * whole page order so every photo becomes draggable.
 *
 * The tail query must stay the SAME QUERY as the site's, or the Studio shows her one order
 * and the page renders another: published photos carrying any of the gallery's tags, minus
 * the placed ones, `_createdAt` asc. Published only (`!(_id in path("drafts.**"))`) because
 * the site reads published content — a draft photo she has not published yet is not on the
 * page, so showing it here would be the lie in the other direction. The caption says so.
 *
 * A failed fetch renders as a failure, never as an empty tail — "request that did not
 * happen must never look like a query that found nothing" is this repo's oldest scar.
 */

// Matches the site's pinned SANITY_API_VERSION vintage. The Studio's own data plane does not
// read this; it is only for the tail preview fetch below.
const API_VERSION = '2026-07-31'

// The `photos` leg is the site's tail (GALLERY_QUERY), reduced to what a thumbnail needs —
// `references($tagIds)` with an array of ids is a union, the same any-of reading the site
// gives the tags. If the ordering or the filters here ever change, change queries/shots.ts
// in the same commit — the two disagreeing means the Studio previews an order the page does
// not render. The `titles` leg exists for the caption naming the tags; one fetch keeps the
// names consistent with the tail they describe, and keeps one failure state.
const TAIL_QUERY = `{
  "titles": *[_type == "tag" && _id in $tagIds] | order(title asc)[].title,
  "photos": *[
    _type == "photo"
    && references($tagIds)
    && !(_id in $placed)
    && !(_id in path("drafts.**"))
    && defined(image.asset)
  ] | order(_createdAt asc){
    _id,
    alt,
    "thumb": image.asset->url + "?w=180&h=180&fit=crop&auto=format"
  }
}`

interface TailPhoto {
  _id: string
  alt: string | null
  thumb: string
}

interface TailResult {
  titles: string[]
  photos: TailPhoto[]
}

// “Life”, “Mexico 2022” and “Street” — a spoken list, for the caption naming the tags.
function quotedList(titles: string[]): string {
  const quoted = titles.map((title) => `“${title}”`)
  if (quoted.length <= 1) return quoted.join('')
  return `${quoted.slice(0, -1).join(', ')} and ${quoted[quoted.length - 1]}`
}

// Array members need a _key; this is the same shape Sanity's own inputs generate. Content
// keys only need uniqueness within the one array.
function randomKey(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function PhotoOrderInput(props: ArrayOfObjectsInputProps) {
  const {onChange, renderDefault} = props
  const client = useClient({apiVersion: API_VERSION})
  // Path from the document root — this field and `tags` are siblings at the top level.
  // Only members with a real `_ref` count, so a half-cleared member triggers nothing; the
  // ids are SORTED so reordering the tags is not a refetch — the tail is the same set
  // either way.
  const tagsValue = useFormValue(['tags']) as Reference[] | undefined
  const tagKey = (Array.isArray(tagsValue) ? tagsValue : [])
    .map((entry) => entry?._ref)
    .filter(Boolean)
    .sort()
    .join(',')
  const tagIds = useMemo(() => (tagKey ? tagKey.split(',') : []), [tagKey])
  const hasTags = tagIds.length > 0

  // Keyed by content rather than array identity, so a re-render that rebuilds the same
  // members does not refetch. A drag DOES change the key (order changes) and refetches
  // needlessly; the result is identical and the cost is one small query, accepted.
  const placedKey = (props.value ?? [])
    .map((member) => (member as Reference)._ref)
    .filter(Boolean)
    .join(',')
  const placedIds = useMemo(() => (placedKey ? placedKey.split(',') : []), [placedKey])

  // The SET of placed ids, order ignored — a drag is a permutation of the same set and must
  // not blank the tail while its (needless) refetch runs; a photo added through the default
  // input's picker is a different set and must.
  const placedSetKey = useMemo(() => [...placedIds].sort().join(','), [placedIds])

  // The result is keyed by the tag set AND the placed set it was fetched FOR, and `tail`
  // derives to null the moment either stops matching. Without the tag key, switching the
  // gallery's tags leaves the previous set's photos on screen — with live Place buttons —
  // for the length of the new fetch, and Place must never append a photo from a tag the
  // gallery no longer points at. Without the placed key, a photo placed through the default
  // input's own picker lingers in the stale tail with a live Place button, and pressing it
  // inserts a duplicate. The `cancelled` flag alone cannot cover either: it stops the stale
  // write, not the stale render.
  const [fetched, setFetched] = useState<
    (TailResult & {tagKey: string; placedSetKey: string}) | null
  >(null)
  const [failed, setFailed] = useState(false)
  const current =
    fetched && fetched.tagKey === tagKey && fetched.placedSetKey === placedSetKey
      ? fetched
      : null
  const tail = current ? current.photos : null
  const tagTitles = current ? current.titles : []

  useEffect(() => {
    // No tags: nothing to fetch and nothing to clear — every branch below gates on `hasTags`,
    // and a stale `fetched` is already unreachable through the derivation above.
    if (tagIds.length === 0) return undefined
    let cancelled = false
    setFailed(false)
    client
      .fetch<TailResult>(TAIL_QUERY, {tagIds, placed: placedIds})
      .then(({titles, photos}) => {
        if (!cancelled)
          setFetched({
            tagKey: tagIds.join(','),
            placedSetKey: [...placedIds].sort().join(','),
            titles,
            photos,
          })
      })
      .catch(() => {
        // The failure state, distinct from the empty state — see the header comment.
        if (!cancelled) {
          setFetched(null)
          setFailed(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [client, tagIds, placedIds])

  const place = useCallback(
    (ids: string[]) => {
      onChange([
        setIfMissing([]),
        insert(
          ids.map((id) => ({_type: 'reference', _ref: id, _key: randomKey()})),
          'after',
          [-1],
        ),
      ])
      // Optimistic: the effect above refetches and will agree, but waiting for the round
      // trip makes "Place" feel broken on a slow connection. The placed-set key moves with
      // it, or the optimistic render would fail its own staleness check and blank the tail.
      setFetched((current) =>
        current
          ? {
              ...current,
              placedSetKey: [...current.placedSetKey.split(',').filter(Boolean), ...ids]
                .sort()
                .join(','),
              photos: current.photos.filter((photo) => !ids.includes(photo._id)),
            }
          : current,
      )
    },
    [onChange],
  )

  return (
    <Root>
      {renderDefault(props)}

      {hasTags && failed && (
        <Notice role="alert">
          Couldn’t load the tagged photos to show what follows — check your connection and
          reopen this document. The gallery page itself is unaffected.
        </Notice>
      )}

      {hasTags && !failed && tail !== null && tail.length === 0 && (
        <Notice>
          {placedIds.length > 0
            ? 'Every tagged photo is placed — the list above is the whole page, in this order.'
            : tagIds.length === 1
              ? 'No published photos carry this tag yet, so the gallery page is empty. Tag some photos, or check the tag for a typo.'
              : 'No published photos carry these tags yet, so the gallery page is empty. Tag some photos, or check the tags for a typo.'}
        </Notice>
      )}

      {hasTags && !failed && tail !== null && tail.length > 0 && (
        <TailSection>
          <TailHeader>
            <div>
              <TailTitle>
                Then the page shows these — {tail.length} more, newest additions last
              </TailTitle>
              <TailCaption>
                {tagTitles.length > 0
                  ? `Filling from the ${tagTitles.length === 1 ? 'tag' : 'tags'} ${quotedList(tagTitles)}. `
                  : ''}
                These are the tagged photos you haven’t placed — they follow the list above in
                this order. Place them to drag them anywhere. Unpublished photos appear here
                once published.
              </TailCaption>
            </div>
            <PlaceButton type="button" onClick={() => place(tail.map((photo) => photo._id))}>
              Place all
            </PlaceButton>
          </TailHeader>
          <TailGrid>
            {tail.map((photo) => (
              <Tile key={photo._id}>
                <Thumb src={photo.thumb} alt={photo.alt ?? ''} loading="lazy" />
                <PlaceButton type="button" onClick={() => place([photo._id])}>
                  Place
                </PlaceButton>
              </Tile>
            ))}
          </TailGrid>
        </TailSection>
      )}
    </Root>
  )
}

// Styled with Sanity's own CSS custom properties so both Studio themes work, rather than
// with @sanity/ui — that package is a transitive dependency this project deliberately does
// not declare, and importing it undeclared is the borrowed-dependency trap CLAUDE.md
// documents (@portabletext under Nuxt). Plain elements + the theme variables cost nothing.

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const Notice = styled.p`
  margin: 0;
  padding: 0.75rem;
  border: 1px solid var(--card-border-color);
  color: var(--card-muted-fg-color);
  font-size: 0.8125rem;
  line-height: 1.4;
`

const TailSection = styled.div`
  border: 1px solid var(--card-border-color);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const TailHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
`

const TailTitle = styled.h4`
  margin: 0 0 0.25rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--card-fg-color);
`

const TailCaption = styled.p`
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--card-muted-fg-color);
`

const TailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 0.5rem;
`

const Tile = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`

const Thumb = styled.img`
  display: block;
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border: 1px solid var(--card-border-color);
`

const PlaceButton = styled.button`
  flex-shrink: 0;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--card-border-color);
  background: var(--card-bg-color);
  color: var(--card-fg-color);
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;

  &:hover {
    background: var(--card-code-bg-color);
  }
`
