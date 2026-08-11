'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * Whether the mobile nav drawer is open. The only piece of state shared across the chrome.
 *
 * **State and actions only — no effects, and that is a rule rather than an omission.** This has
 * three consumers (`SiteSidebar`, `MainColumn`, `PhotoShowcase`), so an effect registered here
 * would register once per consumer: three `keydown` listeners, three `matchMedia` subscriptions,
 * and an Escape press closing the drawer three times. Every effect belongs to `SiteSidebar`,
 * which is the single component that owns the element.
 *
 * The provider sits in the root layout, so the state survives client-side navigation — the same
 * property Nuxt's `useState` gave it, by a different mechanism.
 */

type NavDrawer = {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const NavDrawerContext = createContext<NavDrawer | null>(null)

export function NavDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  // Stable identities, so a consumer can put `close` in an effect's dependency array without
  // the effect re-running on every render of the tree.
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen(current => !current), [])

  const value = useMemo(
    () => ({ isOpen, open, close, toggle }),
    [isOpen, open, close, toggle],
  )

  return <NavDrawerContext value={value}>{children}</NavDrawerContext>
}

export function useNavDrawer(): NavDrawer {
  const context = useContext(NavDrawerContext)
  if (!context) throw new Error('useNavDrawer must be used inside <NavDrawerProvider>.')
  return context
}
