import type { SocialIcon } from '@/content/site'

/**
 * One social glyph, chosen by name.
 *
 * The four glyphs are inline SVG — three hand-written, Substack's the simple-icons path (CC0).
 * Pulling in an icon library to get four icons is exactly the kind of addition the dependency
 * rule in CLAUDE.md exists to catch, and these four are unlikely to ever become forty.
 *
 * ## Why the component is `SiteSocialIcon` and not `SocialIcon`
 *
 * `@/content/site` already exports a *type* called `SocialIcon`, and this file imports it. The
 * `Site*` prefix sidesteps the collision and matches the rest of the site chrome. (React needs
 * no auto-import registry for this to bite — a component and a type of the same name in the
 * same module scope collide on their own.)
 *
 * `aria-hidden` is set here and not at the call site: every one of these sits inside a link
 * whose accessible name comes from `SITE.social[].label`, so the glyph must never contribute a
 * second one. Size is a class on this element, so a caller sets it with `className="size-5"`.
 */
export function SiteSocialIcon({ name, className }: { name: SocialIcon, className?: string }) {
  const stroke = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    className,
  } as const

  if (name === 'mail') {
    return (
      <svg {...stroke}>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m2 7 10 6 10-6" />
      </svg>
    )
  }

  if (name === 'linkedin') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
        <path d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-1 1.83-2.05 3.76-2.05C21.4 8.65 22 11.1 22 14.3V21h-4v-6c0-1.43-.03-3.27-2-3.27-2 0-2.3 1.56-2.3 3.17V21h-4V9Z" />
      </svg>
    )
  }

  if (name === 'substack') {
    // Filled rather than stroked, like linkedin above: Substack's mark is three solid bars,
    // and an outline version reads as a hamburger menu.
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
        <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.539 24V10.812H1.46zM22.539 0H1.46v2.836h21.08V0z" />
      </svg>
    )
  }

  return (
    <svg {...stroke}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
