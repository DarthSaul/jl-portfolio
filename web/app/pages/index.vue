<script setup lang="ts">
import { HOME } from '~/content/home'

/**
 * Home. Section order follows joanatstake.com exactly.
 *
 * Every string comes from `~/content/home` — nothing is typed into this template. That
 * boundary is what makes the eventual swap to a GROQ query in `~/queries/home` a change to
 * one import rather than a rewrite of the page.
 *
 * No `title` is set: the template in app.vue renders the bare wordmark when a page has none.
 */
</script>

<template>
  <div class="space-y-20 pb-4 sm:space-y-24">
    <!-- The hero card is flush to the container's left edge on desktop, so this one gets
         no horizontal padding above `md`; Hero.vue re-adds it on mobile. -->
    <div class="mx-auto max-w-[1080px] md:px-5">
      <HomeHero />
    </div>

    <div class="mx-auto max-w-[1080px] space-y-6 px-5 text-lg leading-relaxed sm:text-xl">
      <RichParagraph v-for="(para, i) in HOME.intro" :key="i" :runs="para" />
    </div>

    <div class="mx-auto max-w-[1080px] px-5">
      <HomeFeaturedWriting />
    </div>

    <div class="mx-auto max-w-[1080px] space-y-6 px-5">
      <h2 class="text-2xl font-normal text-muted sm:text-3xl">
        {{ HOME.handle.heading }}
      </h2>
      <RichParagraph :runs="HOME.handle.body" class="text-lg leading-relaxed sm:text-xl" />
    </div>

    <div class="mx-auto max-w-[1080px] px-5">
      <HomePhotoStrip :photos="HOME.strip" />
    </div>
  </div>
</template>
