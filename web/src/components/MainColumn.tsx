'use client'

import type { ReactNode } from 'react'

import { useNavDrawer } from './NavDrawerContext'

/**
 * Everything below the header — `<main>` and the footer — and the other half of the drawer's
 * focus management.
 *
 * A Client Component only because of `inert`, which has to follow the drawer state. The page and
 * the footer arrive as props from the root layout, so both stay Server Components — passing a
 * server-rendered tree through a client boundary is the whole point of the props.
 *
 * `inert` is on a wrapper rather than on `<main>` so the footer goes inert with it: the drawer is
 * a full-screen sheet, and nothing beneath it should be reachable by Tab while it is open. React
 * 19 treats `inert` as a real boolean attribute and emits nothing when it is false.
 *
 * `<main>` owns the gutter (`main-column`) and the shell width, so a page owns only its vertical
 * rhythm and — for prose — a reading measure. `SiteHeader` uses the same box, so the wordmark and
 * the page's left edge line up.
 *
 * `SiteHeader` also closes the drawer when the viewport crosses `md`, which is the other half of
 * never leaving this attribute stranded over a layout that has no drawer.
 */
export function MainColumn({ children, footer }: { children: ReactNode, footer: ReactNode }) {
  const { isOpen } = useNavDrawer()

  return (
    <div inert={isOpen} className="flex flex-1 flex-col">
      <main className="main-column mx-auto w-full max-w-shell flex-1 pt-4 pb-20 lg:pt-6 lg:pb-28">
        {children}
      </main>
      {footer}
    </div>
  )
}
