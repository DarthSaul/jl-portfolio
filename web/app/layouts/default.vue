<script setup lang="ts">
/**
 * The only layout: a left sidenav column and a main column, inside one 1440px shell.
 *
 * ## The container decision moved here
 *
 * It used to live in each page, because the home page's photo strip had to escape it and
 * constraining everything at this level would have needed a negative-margin escape hatch. Six
 * files carried their own `mx-auto max-w-[…] px-5` as a result — five pages and
 * `writing/ListItem.vue`.
 *
 * The sidenav settles it. The strip no longer has to escape the *viewport*, only the main
 * column, and the `bleed` utility does exactly that by reading back the `--gutter` that
 * `main-column` sets. So the container is decided once, here, and a page owns only its
 * vertical rhythm and — for prose — a reading measure.
 *
 * ## Two load-bearing details
 *
 * `min-w-0` on `<main>`, for the same reason it is on the Hero card: a flex item's automatic
 * minimum is its min-content size, so the photo strip's `overflow-x` row or one long unbroken
 * word would widen the column and squeeze the sidebar rather than scrolling inside it.
 *
 * `:inert="isOpen || undefined"`, and **never a bare boolean**. `inert` is not in Vue's
 * `specialBooleanAttrs` list, but it *is* in the SSR-side `isBooleanAttr` list — so
 * `:inert="false"` renders nothing on the server and `inert="false"` on the client. An element
 * with `inert="false"` is still inert, because presence is what counts, not the value. The
 * failure is that the whole page becomes permanently unclickable, only after hydration, and
 * only on the client. `SiteSidebar` also closes the drawer when the viewport crosses `lg`,
 * which is the other half of never leaving this attribute stranded.
 */
const { isOpen } = useNavDrawer()
</script>

<template>
  <div class="mx-auto flex min-h-dvh max-w-shell flex-col bg-canvas text-ink lg:flex-row">
    <SiteSidebar />

    <main
      :inert="isOpen || undefined"
      class="main-column min-w-0 flex-1 pt-10 pb-20 lg:pt-14 lg:pb-28"
    >
      <slot />
    </main>
  </div>
</template>
