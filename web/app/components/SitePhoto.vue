<script setup lang="ts">
/**
 * The static stand-in for `SanityPhoto`, and now the *second* <img> in the app rather than
 * the only one.
 *
 * That is a temporary and deliberate exception to CLAUDE.md's one-image-component rule. The
 * front page renders through `SanityPhoto` off the Sanity image CDN; /writing is still on
 * Unsplash placeholders and still renders through this. Two components emitting an <img> is
 * the honest state of a half-migrated site — the alternative was teaching `SanityPhoto` to
 * also accept bare URLs, which would leave a permanent hole in the rule to fix a temporary
 * one.
 *
 * This file is deleted with `~/content/writing`, at which point `grep -rn "<img" web/app`
 * goes back to returning exactly one hit. Nothing new should be pointed at it.
 *
 * The API stayed deliberately Sanity-shaped, which is what made that migration mechanical:
 *  - `alt` is required and has no default, so a call site cannot forget it
 *  - `src` is a bare URL; this component composes the transform params, exactly as
 *    `SanityPhoto` composes Sanity's
 *  - `aspect` reserves the box before any bytes arrive
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
