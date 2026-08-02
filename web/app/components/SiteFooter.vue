<script setup lang="ts">
import { SITE } from '~/content/site'

/**
 * Four circular social links plus the copyright line.
 *
 * The glyphs are hand-written inline SVG. Pulling in an icon library to get four icons is
 * exactly the kind of addition the dependency rule in CLAUDE.md exists to catch, and these
 * four are unlikely to ever become forty.
 *
 * Each link is icon-only, so the accessible name comes from `SITE.social[].label` via
 * aria-label — without it a screen reader announces four identical empty links.
 */
</script>

<template>
  <footer class="px-5 py-14 text-center">
    <ul class="flex items-center justify-center gap-3">
      <li v-for="link in SITE.social" :key="link.href">
        <a
          :href="link.href"
          :aria-label="link.label"
          v-bind="link.icon === 'mail' ? {} : { target: '_blank', rel: 'me noopener' }"
          class="flex size-9 items-center justify-center rounded-full bg-neutral-400 text-white transition-colors hover:bg-ink"
        >
          <svg
            v-if="link.icon === 'mail'"
            class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
          >
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m2 7 10 6 10-6" />
          </svg>

          <svg
            v-else-if="link.icon === 'linkedin'"
            class="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
          >
            <path d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-1 1.83-2.05 3.76-2.05C21.4 8.65 22 11.1 22 14.3V21h-4v-6c0-1.43-.03-3.27-2-3.27-2 0-2.3 1.56-2.3 3.17V21h-4V9Z" />
          </svg>

          <svg
            v-else-if="link.icon === 'threads'"
            class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
          >
            <path d="M12.5 21c-5 0-8-3.3-8-9s3-9 8-9c3.4 0 5.7 1.5 6.7 4" />
            <path d="M9.3 9.4c1.6-1.3 5-1.6 6.6.3 1.3 1.6 1 5-2 6.4-2.6 1.2-4.9 0-4.9-1.7 0-1.9 2.6-2.8 5.4-2.4 3 .4 4.4 2.3 4.4 4.6" />
          </svg>

          <svg
            v-else
            class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
          </svg>
        </a>
      </li>
    </ul>

    <p class="mt-4 text-sm text-muted">
      {{ SITE.copyright }}
    </p>
  </footer>
</template>
