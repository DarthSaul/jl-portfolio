<script setup lang="ts">
/**
 * The only <img> in the app.
 *
 * CLAUDE.md requires every image to render through one component, so that srcset, lazy
 * loading and aspect-ratio reservation are decided in a single place for ~250 photos on a
 * phone connection. That component is meant to be `SanityPhoto`, fed by the Sanity image
 * CDN — but there is no schema and no assets yet, so this is the static stand-in.
 *
 * The API is deliberately Sanity-shaped so the swap is mechanical:
 *  - `alt` is required and has no default, so a call site cannot forget it
 *  - `src` is a bare URL; this component composes the transform params, exactly as it
 *    will compose Sanity's `?w=&auto=format` params later
 *  - `aspect` reserves the box before any bytes arrive
 *
 * When photos land in Sanity this file either becomes SanityPhoto or delegates to it, and
 * no caller changes. What must stay true either way: `grep -rn "<img" web/app` returns
 * exactly one hit, and it is this file.
 */

const props = withDefaults(
  defineProps<{
    /** Bare image URL, no query string. */
    src: string
    /** Belongs to the photo, never invented by the caller. See Rule 1 in CLAUDE.md. */
    alt: string
    /** CSS aspect-ratio, e.g. '4/5'. Omit only when the container already reserves height. */
    aspect?: string
    /** Rendered width hint for the browser's srcset pick. */
    sizes?: string
    /** Above the fold — load eagerly and at high priority. */
    priority?: boolean
  }>(),
  { sizes: '100vw' },
)

/** Wide enough for a 2x phone and a 1x laptop without shipping desktop pixels to a phone. */
const WIDTHS = [400, 800, 1200, 1600]

/** Unsplash-specific, and knowingly so — this whole component is the temporary half. */
const at = (w: number) => `${props.src}?auto=format&fit=crop&w=${w}&q=80`

const srcset = computed(() => WIDTHS.map(w => `${at(w)} ${w}w`).join(', '))
</script>

<template>
  <img
    :src="at(1200)"
    :srcset="srcset"
    :sizes="sizes"
    :alt="alt"
    :style="aspect ? { aspectRatio: aspect } : undefined"
    :loading="priority ? 'eager' : 'lazy'"
    :fetchpriority="priority ? 'high' : undefined"
    decoding="async"
    class="block w-full bg-neutral-100 object-cover"
  >
</template>
