import {useCallback, useEffect, useMemo, useState} from 'react'
import {insert, setIfMissing, useClient} from 'sanity'
import type {ArrayOfObjectsInputProps, Reference} from 'sanity'
import styled from 'styled-components'

import {
  Notice,
  PlaceButton,
  Root,
  TailCaption,
  TailHeader,
  TailSection,
  TailTitle,
  randomKey,
} from './orderInputParts'

/**
 * The input for `siteSettings.galleryOrder` ("Gallery order").
 *
 * The same shape as `PhotoOrderInput`, one level up: the default array (drag to reorder), then
 * every gallery she has not placed yet, with Place and Place all. A gallery she creates is
 * therefore never invisible here — it turns up under the list the moment it is published — and
 * never missing from the site either, because the menu shows unplaced galleries after the
 * placed ones, A–Z.
 *
 * The tail query must stay the SAME QUERY as the `rest` leg of `NAV_QUERY` in
 * `web/src/sanity/queries/nav.ts`, or the Studio previews a menu the site does not render:
 * published galleries with a slug, minus the placed ones, title A–Z. Published only for the
 * reason `PhotoOrderInput` gives — the site reads published content.
 *
 * A failed fetch renders as a failure, never as an empty tail.
 */

const API_VERSION = '2026-07-31'

const TAIL_QUERY = `*[
  _type == "gallery"
  && defined(slug.current)
  && !(_id in $placed)
  && !(_id in path("drafts.**"))
] | order(title asc){_id, title}`

interface TailGallery {
  _id: string
  title: string | null
}

export function GalleryOrderInput(props: ArrayOfObjectsInputProps) {
  const {onChange, renderDefault} = props
  const client = useClient({apiVersion: API_VERSION})

  const placedKey = (props.value ?? [])
    .map((member) => (member as Reference)._ref)
    .filter(Boolean)
    .join(',')
  const placedIds = useMemo(() => (placedKey ? placedKey.split(',') : []), [placedKey])
  // Order ignored: a drag is a permutation of the same set and must not blank the tail.
  const placedSetKey = useMemo(() => [...placedIds].sort().join(','), [placedIds])

  // Keyed by the placed set it was fetched for, so a gallery placed through the default
  // input's own picker cannot linger in a stale tail with a live Place button.
  const [fetched, setFetched] = useState<{placedSetKey: string; galleries: TailGallery[]} | null>(
    null,
  )
  const [failed, setFailed] = useState(false)
  const tail = fetched && fetched.placedSetKey === placedSetKey ? fetched.galleries : null

  useEffect(() => {
    let cancelled = false
    setFailed(false)
    client
      .fetch<TailGallery[]>(TAIL_QUERY, {placed: placedIds})
      .then((galleries) => {
        if (!cancelled) setFetched({placedSetKey: [...placedIds].sort().join(','), galleries})
      })
      .catch(() => {
        if (!cancelled) {
          setFetched(null)
          setFailed(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [client, placedIds])

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
      // Optimistic, as in PhotoOrderInput — the refetch will agree.
      setFetched((current) =>
        current
          ? {
              placedSetKey: [...current.placedSetKey.split(',').filter(Boolean), ...ids]
                .sort()
                .join(','),
              galleries: current.galleries.filter((gallery) => !ids.includes(gallery._id)),
            }
          : current,
      )
    },
    [onChange],
  )

  return (
    <Root>
      {renderDefault(props)}

      {failed && (
        <Notice role="alert">
          Couldn’t load the galleries that aren’t in this list yet — check your connection and
          reopen Site settings. The site’s menu is unaffected.
        </Notice>
      )}

      {!failed && tail !== null && tail.length > 0 && (
        <TailSection>
          <TailHeader>
            <div>
              <TailTitle>Not placed yet — {tail.length} more</TailTitle>
              <TailCaption>
                These appear at the end of the menu, A–Z, above All Shots. Place them to drag
                them anywhere. A new gallery shows up here once it’s published.
              </TailCaption>
            </div>
            <PlaceButton type="button" onClick={() => place(tail.map((gallery) => gallery._id))}>
              Place all
            </PlaceButton>
          </TailHeader>
          <TailList>
            {tail.map((gallery) => (
              <TailRow key={gallery._id}>
                <span>{gallery.title || 'Untitled gallery'}</span>
                <PlaceButton type="button" onClick={() => place([gallery._id])}>
                  Place
                </PlaceButton>
              </TailRow>
            ))}
          </TailList>
        </TailSection>
      )}
    </Root>
  )
}

const TailList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`

const TailRow = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.25rem 0;
  font-size: 0.8125rem;
  color: var(--card-fg-color);
`
