import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { MainColumn } from '@/components/MainColumn'
import { NavDrawerProvider } from '@/components/NavDrawerContext'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteNav } from '@/components/SiteNav'
import { getSiteSettings } from '@/sanity/siteSettings'

import './globals.css'

/**
 * The title template. `template` appends " · <site name>" to whatever a page sets; `default` is
 * what renders when a page sets nothing. The site name and description are hers, from
 * `siteSettings` — so this is `generateMetadata` rather than a static `metadata` export.
 *
 * A page that should *not* get the suffix — the front page and /bio, whose own titles already
 * carry her name — sets `title: { absolute: … }`, which is the App Router spelling of the Nuxt
 * app's `titleTemplate: '%s'` override.
 *
 * Nuxt needed this at runtime because it could not serialise a function into `app.head`. Next's
 * template is a string with a `%s`-style placeholder, so it is static config and lives here.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { title, description } = await getSiteSettings()
  return {
    title: {
      default: title,
      template: `%s · ${title}`,
    },
    description,
  }
}

/**
 * The only layout: a sticky top bar, the page, and a slim footer.
 *
 * ## The container decision lives here
 *
 * The bar spans the viewport; its contents, `<main>` and the footer each sit in the same centred
 * `max-w-shell` box with the `main-column` gutter, so the wordmark, the page and the copyright
 * share a left edge. A page owns only its vertical rhythm and — for prose — a reading measure.
 *
 * ## The server/client seam
 *
 * `NavDrawerProvider`, `SiteHeader` and `MainColumn` are Client Components; `SiteNav`,
 * `SiteFooter` and every page are Server Components. That composes because the server trees are
 * passed *through* the client ones as props (`nav`, `footer`, `children`) rather than imported by
 * them. A client module cannot import a server one; it can render one it was handed.
 */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const { title } = await getSiteSettings()

  return (
    <html lang="en">
      <body>
        <NavDrawerProvider>
          <div className="flex min-h-dvh flex-col bg-canvas text-ink">
            <SiteHeader nav={<SiteNav />} title={title} />
            <MainColumn footer={<SiteFooter />}>{children}</MainColumn>
          </div>
        </NavDrawerProvider>
      </body>
    </html>
  )
}
