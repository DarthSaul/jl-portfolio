<script setup lang="ts">
import type { HOME_QUERY_RESULT } from '~~/sanity.types'

type Home = NonNullable<HOME_QUERY_RESULT>

/**
 * Slot 4 — the heading and introduction. DESIGN.md's `hero-band`.
 *
 * The headline in `display-hero` — Playfair at 64px, the spec's most-recognisable typographic
 * signature — and the intro in the serif body face beneath it. No card, no fill, no border:
 * `hero-band` sits on the canvas, and the elevation table is emphatic that "Level 0 — Flat"
 * is where almost every surface lives. The size of the type is the whole effect.
 *
 * ## What used to be here
 *
 * A photograph in the right two-thirds with a card overlapping its left edge by 100px, built as
 * a width overrun inside a grid track. That composition and its `min-w-0` are gone along with
 * the photograph, which now lives under the bio — see `queries/about.ts`, which also explains
 * why reading it from `homePage` is a stopgap.
 *
 * Worth knowing what left with it: that hero was CLAUDE.md's worked example of the no-crop rule
 * holding under pressure, and the argument still stands, it just no longer has a demonstration
 * on the front page. If a photograph ever returns here, the rule returns with it — a hero with
 * text over an image is the classic case that wants a crop, and `photo.image` still has no
 * hotspot by design.
 *
 * The front page now opens with the photographs and reaches this second, which is another
 * reason the band carries no image of its own: a hero photo directly under the grid would be
 * the sixth photograph in a row of five.
 */
defineProps<{
  heading: Home['introHeading']
  intro: Home['intro']
}>()
</script>

<template>
  <section class="max-w-read">
    <h2 v-if="heading" class="type-display-hero text-ink">
      {{ heading }}
    </h2>

    <!-- `body-serif-lg` is DESIGN.md's lead-paragraph token — Lora at 19px. Serif for
         narrative, sans for structure: this is narrative. -->
    <ProseText
      :value="intro"
      :class="['type-body-serif-lg', heading && 'mt-6']"
    />
  </section>
</template>
