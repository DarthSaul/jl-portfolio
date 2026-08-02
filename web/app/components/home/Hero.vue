<script setup lang="ts">
import { HOME } from '~/content/home'

/**
 * The overlapping hero: photograph on the right, black text card overlapping it on the left.
 *
 * This lives in `components/home/`, not `components/presets/`. A preset is something the
 * editor picks from a fixed list in the gallery schema, and CLAUDE.md is explicit that
 * adding one means a component *and* a matching schema option, always together. There is no
 * gallery schema yet, so registering a preset is impossible and creating one here would
 * leave the list half-populated. This is a fixed composition belonging to one page.
 *
 * The overlap is a grid overlay rather than absolute positioning, so the card cannot escape
 * its container or collide with the text below at any width. Below `md` the two stack with
 * the card pulled up over the photo's lower edge, which is what her site does on a phone.
 */
const { hero } = HOME
</script>

<template>
  <section class="grid md:grid-cols-12 md:items-start">
    <!-- Photo: right two-thirds on desktop, full width on mobile. -->
    <div class="md:col-span-8 md:col-start-5 md:row-start-1">
      <SitePhoto
        v-bind="hero.photo"
        priority
        sizes="(min-width: 768px) 66vw, 100vw"
      />
    </div>

    <!-- Card: overlaps the photo's left edge on desktop, its bottom edge on mobile. -->
    <div class="-mt-16 px-5 md:col-span-6 md:col-start-1 md:row-start-1 md:mt-14 md:px-0">
      <div class="bg-ink p-7 text-white sm:p-9">
        <h2 class="text-xl font-normal sm:text-2xl">
          {{ hero.heading }}
        </h2>
        <RichParagraph :runs="hero.body" class="mt-4 text-base leading-relaxed sm:text-lg" />
      </div>
    </div>
  </section>
</template>
