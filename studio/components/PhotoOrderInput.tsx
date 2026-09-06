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
 * and the page renders another: published photos carrying the tag, minus the placed ones,
 * `_createdAt` asc. Published only (`!(_id in path("drafts.**"))`) because the site reads
 * published content — a draft photo she has not published yet is not on the page, so
 * showing it here would be the lie in the other direction. The caption says so.
 *
 * A failed fetch renders as a failure, never as an empty tail — "request that did not
 * happen must never look like a query that found nothing" is this repo's oldest scar.
 */

// Matches the site's pinned SANITY_API_VERSION vintage. The Studio's own data plane does not
// read this; it is only for the tail preview fetch below.
const API_VERSION = '2026-07-31'

// The site's tail (GALLERY_QUERY), reduced to what a thumbnail needs. If the ordering or the
// filters here ever change, change queries/shots.ts in the same commit — the two disagreeing
// means the Studio previews an order the page does not render.
const TAIL_QUERY = `*[
  _type == "photo"
  && references($tagId)
  && !(_id in $placed)
  && !(_id in path("drafts.**"))
  && defined(image.asset)
] | order(_createdAt asc){
  _id,
  alt,
  "thumb": image.asset->url + "?w=180&h=180&fit=crop&auto=format"
}`

interface TailPhoto {
  _id: string
  alt: string | null
  thumb: string
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
  // Path from the document root — this field and `tag` are siblings at the top level.
  const tagRef = (useFormValue(['tag']) as Reference | undefined)?._ref

  // Keyed by content rather than array identity, so a re-render that rebuilds the same
  // members does not refetch. A drag DOES change the key (order changes) and refetches
  // needlessly; the result is identical and the cost is one small query, accepted.
  const placedKey = (props.value ?? [])
    .map((member) => (member as Reference)._ref)
    .filter(Boolean)
    .join(',')
  const placedIds = useMemo(() => (placedKey ? placedKey.split(',') : []), [placedKey])

  // The result is keyed by the tag it was fetched FOR, and `tail` derives to null the moment
  // `tagRef` stops matching. Without the key, switching the gallery's tag leaves the previous
  // tag's photos on screen — with live Place buttons — for the length of the new fetch, and
  // Place must never append a photo from a tag the gallery no longer points at. The
  // `cancelled` flag alone cannot cover that: it stops the stale write, not the stale render.
  const [fetched, setFetched] = useState<{tag: string; photos: TailPhoto[]} | null>(null)
  const [failed, setFailed] = useState(false)
  const tail = fetched && fetched.tag === tagRef ? fetched.photos : null

  useEffect(() => {
    // No tag: nothing to fetch and nothing to clear — every branch below gates on `tagRef`,
    // and a stale `fetched` is already unreachable through the derivation above.
    if (!tagRef) return undefined
    let cancelled = false
    setFailed(false)
    client
      .fetch<TailPhoto[]>(TAIL_QUERY, {tagId: tagRef, placed: placedIds})
      .then((photos) => {
        if (!cancelled) setFetched({tag: tagRef, photos})
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
  }, [client, tagRef, placedIds])

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
      // trip makes "Place" feel broken on a slow connection.
      setFetched((current) =>
        current
          ? {...current, photos: current.photos.filter((photo) => !ids.includes(photo._id))}
          : current,
      )
    },
    [onChange],
  )

  return (
    <Root>
      {renderDefault(props)}

      {tagRef && failed && (
        <Notice role="alert">
          Couldn’t load the tagged photos to show what follows — check your connection and
          reopen this document. The gallery page itself is unaffected.
        </Notice>
      )}

      {tagRef && !failed && tail !== null && tail.length === 0 && (
        <Notice>
          {placedIds.length > 0
            ? 'Every tagged photo is placed — the list above is the whole page, in this order.'
            : 'No published photos carry this tag yet, so the gallery page is empty. Tag some photos, or check the tag for a typo.'}
        </Notice>
      )}

      {tagRef && !failed && tail !== null && tail.length > 0 && (
        <TailSection>
          <TailHeader>
            <div>
              <TailTitle>
                Then the page shows these — {tail.length} more, newest additions last
              </TailTitle>
              <TailCaption>
                Photos carrying the tag that you haven’t placed. They follow the list above in
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
