<script setup lang="ts">
import type { SocialIcon } from '~/content/site'

/**
 * One social glyph, chosen by name.
 *
 * The four paths are hand-written inline SVG. Pulling in an icon library to get four icons is
 * exactly the kind of addition the dependency rule in CLAUDE.md exists to catch, and these
 * four are unlikely to ever become forty.
 *
 * They lived in `SiteFooter.vue` until the socials moved into the sidenav. Extracted rather
 * than moved wholesale so the sidebar's template is about layout and this file is about
 * glyphs.
 *
 * ## Why the component is `SiteSocialIcon` and not `SocialIcon`
 *
 * `~/content/site` already exports a *type* called `SocialIcon`. Nuxt would auto-import a
 * component at `components/SocialIcon.vue` under that same name, so any file importing the
 * type — this one, for a start — would shadow the component with it, and `<SocialIcon />` in
 * that file's template becomes a type error rather than an element. The `Site*` prefix
 * sidesteps the collision and matches the rest of the site chrome.
 *
 * `aria-hidden` is set here and not at the call site: every one of these sits inside a link
 * whose accessible name comes from `SITE.social[].label`, so the glyph must never contribute
 * a second one. Size is a class on this element, so a caller sets it with `class="size-5"`.
 */
defineProps<{ name: SocialIcon }>()
</script>

<template>
  <svg
    v-if="name === 'mail'"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
  >
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m2 7 10 6 10-6" />
  </svg>

  <svg
    v-else-if="name === 'linkedin'"
    viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
  >
    <path d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-1 1.83-2.05 3.76-2.05C21.4 8.65 22 11.1 22 14.3V21h-4v-6c0-1.43-.03-3.27-2-3.27-2 0-2.3 1.56-2.3 3.17V21h-4V9Z" />
  </svg>

  <svg
    v-else-if="name === 'threads'"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
  >
    <path d="M12.5 21c-5 0-8-3.3-8-9s3-9 8-9c3.4 0 5.7 1.5 6.7 4" />
    <path d="M9.3 9.4c1.6-1.3 5-1.6 6.6.3 1.3 1.6 1 5-2 6.4-2.6 1.2-4.9 0-4.9-1.7 0-1.9 2.6-2.8 5.4-2.4 3 .4 4.4 2.3 4.4 4.6" />
  </svg>

  <svg
    v-else
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
  >
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
</template>
