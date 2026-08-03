<script setup lang="ts">
import { HOME_QUERY } from '~/queries/home'

/**
 * The front page. Seven slots in a fixed order — see CLAUDE.md.
 *
 * Slots 1 to 3 are the site name, the byline and the nav, which sit in the header of every
 * page and are rendered by the layout. This page is slots 4 to 7, and every string in it comes
 * from one request.
 *
 * One query for the whole page, following references as it goes. That is the shape CLAUDE.md
 * asks for: a route fetches exactly its own shape, and the GROQ that defines it lives in
 * `~/queries/home` rather than in this file, because a query is the contract between a route
 * and the content model and a schema change needs one obvious place to look for breakage.
 *
 * `homePage.title` is the browser tab title and nothing else — the schema says as much to her,
 * and it is deliberately not rendered as a heading on the page.
 */
const { data: home } = await useSanityQuery(HOME_QUERY)

/**
 * `homePage` is a singleton and the Studio will not let her delete it, so a missing document
 * means the dataset is wrong — the wrong dataset name, or one that was never seeded. Failing
 * loudly beats rendering a page with seven empty slots, which reads as a broken site rather
 * than a misconfigured one.
 */
if (!home.value) {
  throw createError({
    statusCode: 500,
    statusMessage: 'No homePage document found in this dataset.',
    fatal: true,
  })
}

/**
 * `titleTemplate` is overridden to the bare title for this page only.
 *
 * app.vue appends " · Joan Lebow" to whatever a page sets, which is right everywhere else and
 * wrong here — `homePage.title` is already her name, and the default would render it twice.
 * Her current site titles its front page with the plain wordmark, and this matches it while
 * still taking the value from the field the Studio tells her controls the browser tab.
 */
useHead({ title: home.value.title, titleTemplate: '%s' })
</script>

<template>
  <div v-if="home" class="space-y-20 pb-4 sm:space-y-24">
    <!-- No horizontal padding below `md`, so the hero photo runs full-bleed on a phone and
         Hero.vue's card supplies its own gutter. From `md` up the usual 20px returns, and the
         photo's right edge lines up with every section beneath it. -->
    <div class="mx-auto max-w-[1080px] md:px-5">
      <HomeHero
        :heading="home.introHeading"
        :intro="home.intro"
        :photo="home.introPhoto"
      />
    </div>

    <ProseText
      :value="home.blurb"
      class="mx-auto max-w-[1080px] px-5 text-lg leading-relaxed sm:text-xl"
    />

    <div class="mx-auto max-w-[1080px] px-5">
      <HomeFeaturedWriting :items="home.featuredWriting" />
    </div>

    <HomePhotoStrip
      :title="home.featuredTitle"
      :subtitle="home.featuredSubtitle"
      :photos="home.featuredPhotos"
    />
  </div>
</template>
