import type { DocSection } from '@/lib/docs'

/**
 * "On this page" — the Field Guide's section navigation, in two shapes: a sticky rail beside
 * the article from `xl` up, and a native `<details>` disclosure above it below that. They are
 * two exports rather than one responsive component because they sit in different places in the
 * page's layout — the rail outside the reading column, the disclosure inside it.
 *
 * Deliberately server-rendered with no `'use client'`: the links are plain `#anchor` hops and
 * `<details>` opens itself, so there is no state, no scroll-spy, and nothing added to the
 * ten-file client list in CLAUDE.md. Both shapes are `print:hidden` — on paper the guide's own
 * numbered headings are the table of contents.
 */

function TocList({ sections, className = '' }: { sections: DocSection[], className?: string }) {
  return (
    <ul className={`space-y-1 ${className}`}>
      {sections.map(section => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            className="type-body-sm block py-1 text-muted transition-colors hover:text-ink"
          >
            {section.title}
          </a>
        </li>
      ))}
    </ul>
  )
}

/** The sticky rail, right of the article. Scrolls within itself if a short window runs out. */
export function DocsTocRail({ sections }: { sections: DocSection[] }) {
  return (
    <nav aria-label="On this page" className="hidden w-44 shrink-0 xl:block print:hidden">
      <div className="sticky top-14 max-h-[calc(100dvh-7rem)] overflow-y-auto">
        <p className="type-body-sm-strong uppercase tracking-[0.18em] text-muted">On this page</p>
        <TocList sections={sections} className="mt-4" />
      </div>
    </nav>
  )
}

/** The disclosure above the article, for every width the rail does not fit. */
export function DocsTocInline({ sections }: { sections: DocSection[] }) {
  return (
    <details className="mb-10 border border-hairline print:hidden xl:hidden">
      <summary className="type-body-sm-strong cursor-pointer px-4 py-3 uppercase tracking-[0.18em] text-ink">
        On this page
      </summary>
      <TocList sections={sections} className="border-t border-hairline px-4 py-4" />
    </details>
  )
}
