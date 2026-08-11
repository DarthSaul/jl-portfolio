'use client'

import type { ReactNode } from 'react'

import { useNavDrawer } from './NavDrawerContext'

/**
 * The main column, and the other half of the drawer's focus management.
 *
 * A Client Component only because of `inert`, which has to follow the drawer state. Everything
 * inside it arrives as `children` from the root layout, so the pages themselves stay Server
 * Components — passing a server-rendered tree through a client boundary as children is the whole
 * point of the prop.
 *
 * `min-w-0`, for the usual flex reason: a flex item's automatic minimum is its min-content size,
 * so the photo grid or one long unbroken word would widen this column and squeeze the sidebar
 * rather than wrapping inside it.
 *
 * `inert={isOpen}` — a plain boolean, and in React that is correct. Vue needed
 * `:inert="isOpen || undefined"` because `inert="false"` is still inert (presence is what
 * counts, not the value) and Vue's SSR would emit the attribute for a `false` binding; the
 * failure was a page that became permanently unclickable after hydration. React 19 handles
 * `inert` as a real boolean attribute and emits nothing when it is false, so the workaround —
 * and the paragraph explaining it — is deleted rather than translated.
 *
 * `SiteSidebar` also closes the drawer when the viewport crosses `lg`, which is the other half of
 * never leaving this attribute stranded over a layout that has no drawer.
 */
export function MainColumn({ children }: { children: ReactNode }) {
  const { isOpen } = useNavDrawer()

  return (
    <main inert={isOpen} className="main-column min-w-0 flex-1 pt-10 pb-20 lg:pt-14 lg:pb-28">
      {children}
    </main>
  )
}
