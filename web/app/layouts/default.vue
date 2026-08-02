<script setup lang="ts">
/**
 * The only layout. Header, page, footer.
 *
 * The max-width container lives in each page rather than here, because the home page's
 * photo strip runs edge to edge while its prose does not. Constraining everything at this
 * level would make that impossible without a negative-margin escape hatch.
 */
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-white text-ink">
    <SiteHeader />

    <main class="flex-1">
      <slot />
    </main>

    <SiteFooter />
  </div>
</template>
