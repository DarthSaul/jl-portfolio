import styled from 'styled-components'

/**
 * The pieces `PhotoOrderInput` and `GalleryOrderInput` share. Both are the same shape — the
 * default array input, then the members she has not placed yet with a Place button each — so
 * they look and behave as one control in two places rather than two that drift apart.
 */

// Array members need a _key; this is the same shape Sanity's own inputs generate. Content
// keys only need uniqueness within the one array.
export function randomKey(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Styled with Sanity's own CSS custom properties so both Studio themes work, rather than
// with @sanity/ui — that package is a transitive dependency this project deliberately does
// not declare, and importing it undeclared is the borrowed-dependency trap CLAUDE.md
// documents (@portabletext under Nuxt). Plain elements + the theme variables cost nothing.

export const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

export const Notice = styled.p`
  margin: 0;
  padding: 0.75rem;
  border: 1px solid var(--card-border-color);
  color: var(--card-muted-fg-color);
  font-size: 0.8125rem;
  line-height: 1.4;
`

export const TailSection = styled.div`
  border: 1px solid var(--card-border-color);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

export const TailHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
`

export const TailTitle = styled.h4`
  margin: 0 0 0.25rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--card-fg-color);
`

export const TailCaption = styled.p`
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--card-muted-fg-color);
`

export const TailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 0.5rem;
`

export const Tile = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`

export const Thumb = styled.img`
  display: block;
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border: 1px solid var(--card-border-color);
`

export const PlaceButton = styled.button`
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
