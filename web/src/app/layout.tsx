import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { MainColumn } from '@/components/MainColumn'
import { NavDrawerProvider } from '@/components/NavDrawerContext'
import { SiteNav } from '@/components/SiteNav'
import { SiteSidebar } from '@/components/SiteSidebar'
import { SITE } from '@/content/site'

import './globals.css'

/**
 * The title template. `template` appends " · Joan Lebow" to whatever a page sets; `default` is
 * what renders when a page sets nothing.
 *
 * A page that should *not* get the suffix — the front page and /bio, whose own titles already
 * carry her name — sets `title: { absolute: … }`, which is the App Router spelling of the Nuxt
 * app's `titleTemplate: '%s'` override.
 *
 * Nuxt needed this at runtime because it could not serialise a function into `app.head`. Next's
 * template is a string with a `%s`-style placeholder, so it is static config and lives here.
 */
export const metadata: Metadata = {
  title: {
    default: SITE.title,
    template: `%s · ${SITE.title}`,
  },
  description: SITE.description,
}

/**
 * The only layout: a left sidenav column and a main column, inside one 1440px shell.
 *
 * ## The container decision lives here
 *
 * It used to live in each page, because the front page's photo strip had to escape it and
 * constraining everything at this level would have needed a negative-margin escape hatch. Six
 * files carried their own `mx-auto max-w-[…] px-5` as a result.
 *
 * The sidenav settles it. The strip no longer has to escape the *viewport*, only the main
 * column, and the `bleed` utility does exactly that by reading back the `--gutter` that
 * `main-column` sets. So the container is decided once, here, and a page owns only its vertical
 * rhythm and — for prose — a reading measure.
 *
 * ## The server/client seam
 *
 * `NavDrawerProvider`, `SiteSidebar` and `MainColumn` are Client Components; `SiteNav` and every
 * page are Server Components. That composes because both server trees are passed *through* the
 * client ones as props (`nav`, `children`) rather than imported by them. A client module cannot
 * import a server one; it can render one it was handed.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavDrawerProvider>
          <div className="mx-auto flex min-h-dvh max-w-shell flex-col bg-canvas text-ink lg:flex-row">
            <SiteSidebar nav={<SiteNav />} />
            <MainColumn>{children}</MainColumn>
          </div>
        </NavDrawerProvider>
      </body>
    </html>
  )
}
