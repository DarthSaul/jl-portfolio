<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

import type { PhotoProjection } from '~/queries/photo'

/**
 * One photograph, alone on the page, at the size the viewport allows.
 *
 * The view half of `usePhotoShowcase` — that composable owns the route state, this owns the
 * frame and every effect. See it for why the address is `?photo=<id>` rather than a route.
 *
 * ## Not a modal, deliberately
 *
 * In-page, inside `<main>`. No `role="dialog"`, no focus trap, no scroll lock, no backdrop.
 * Three reasons, in order of weight: a shared link should render the photograph *as the page*
 * on the server rather than as an overlay above a grid nobody asked to see; the sidebar stays
 * usable, so a visitor who arrived on one photograph can reach the rest of the site; and none
 * of `SiteSidebar`'s drawer machinery has to be duplicated to hold it open. Escape and Back
 * still close it, which is the part of a dialog that people actually expect.
 *
 * The page keeps its own `<h2>` above this, so the heading outline is identical whether the
 * showcase is open or not. The photograph is named three times over, all from the photo
 * document: `alt` on the image, the caption in a `<figcaption>`, and the browser tab.
 *
 * ## Sizing is a bound, not a crop
 *
 * `max-width: --showcase-h × --ar` on a wrapper, with `SanityPhoto` left exactly as it is
 * inside it. That is the load-bearing shape of this: the alternative — putting `max-h-*` and
 * `w-auto` on the image — would pit `w-auto` against the `w-full` `SanityPhoto` emits, and
 * Tailwind v4 resolves conflicting utilities by emitted-CSS order rather than class-list order,
 * so which one won would be luck. The wrapper carries the bound and `w-full` keeps doing its
 * job.
 *
 * No `crop`, no `CROPS` entry and no new srcset ladder. The showcase is the largest rendering
 * on the site, which makes the existing uncropped ladder exactly right: its top rung is the
 * asset's own width, so a 2x laptop gets the real file rather than an upscale of it.
 */
const props = defineProps<{
  /** The photograph, or `null` when the id in the URL resolves to nothing. */
  photo: PhotoProjection | null
  closeTo: RouteLocationRaw
  previousTo: RouteLocationRaw | null
  nextTo: RouteLocationRaw | null
}>()

const router = useRouter()

const ratio = computed(() => (props.photo ? photoRatio(props.photo) : 1.5))

/**
 * The rendered width is `min(column, budget × ratio)`, and on this page — uniquely — that is a
 * function of the photograph's own shape: a 3:2 landscape renders around 1030px wide where a
 * 2:3 portrait renders around 460px. Every other call site on the site can state one hint
 * because the box does not move; here a single landscape-shaped hint would hand every portrait
 * roughly twice the pixels the layout can show, on the one page showing exactly one photograph
 * and the one moment a visitor is waiting for it. Same argument `GalleryGrid.compact` makes.
 *
 * 1088px is the widest the main column gets: `--container-shell` 90rem, less
 * `--container-sidebar` 15rem, less two 3.5rem `xl` gutters. Re-derive it if the shell changes.
 *
 * `78vh` approximates `--showcase-h` rather than restating it. `sizes` only picks a rung from a
 * five-rung ladder, so being a little out lands on the same rung nearly always — and `vh`
 * against `dvh` over-asks slightly, which is the safe direction to be wrong in.
 */
const sizes = computed(
  () =>
    `(min-width: 1024px) min(1088px, calc(78vh * ${ratio.value})), `
    + `min(100vw, calc(78vh * ${ratio.value}))`,
)

const frame = useTemplateRef<HTMLElement>('frame')

/**
 * Escape closes, by performing the same navigation the close link performs.
 *
 * The listener is here rather than in the composable for `useNavDrawer`'s stated reason: a
 * lifecycle hook in a composable called from two places registers two listeners. This component
 * is the single owner of the element, so it is the single owner of the effect.
 *
 * It defers to the nav drawer. On a phone the drawer can be open over an `inert` `<main>`, and
 * an Escape then means "close the menu" — the thing on top wins, and without this both would
 * close at once and the visitor would lose the photograph they were looking at as well.
 */
const { isOpen: navOpen } = useNavDrawer()

const onKeydown = (event: KeyboardEvent) => {
  if (navOpen.value) return

  if (event.key === 'Escape') {
    router.replace(props.closeTo)
    return
  }

  // Arrow keys move through the loaded set. Guarded on the same `null`s the buttons are, so the
  // keyboard cannot reach a photograph the controls say is not there.
  if (event.key === 'ArrowLeft' && props.previousTo) router.push(props.previousTo)
  if (event.key === 'ArrowRight' && props.nextTo) router.push(props.nextTo)
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  // The frame takes focus so Escape works without a click first, and so a screen reader lands on
  // the photograph rather than back at the top of the document.
  frame.value?.focus()
})

/**
 * On the way out: drop the listener, and give focus back to the tile that opened this.
 *
 * The tile is found by *id* rather than by a saved element reference, because the index is
 * rendered behind a `v-if` — the node that was clicked no longer exists, and the one replacing
 * it is a different object. `ShotsPhotoLink` stamps `data-showcase-id` for exactly this lookup.
 *
 * `nextTick`, because the tiles are re-created by the same navigation that unmounts this. The
 * page heading is the fallback for the deep-linked case, where the visitor never had a tile to
 * come from; both pages give theirs `tabindex="-1"` so it can receive focus without entering
 * the tab order.
 */
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)

  const id = props.photo?._id
  nextTick(() => {
    const tile = id ? document.querySelector<HTMLElement>(`[data-showcase-id="${id}"]`) : null
    ;(tile ?? document.querySelector<HTMLElement>('main h2'))?.focus()
  })
})

const CONTROL
  = 'type-body-sm-strong uppercase tracking-[0.1em] text-muted transition-colors hover:text-ink'
</script>

<template>
  <!-- `tabindex="-1"` makes this focusable programmatically without putting it in the tab order,
       which is what a container that is being focused *for* the visitor wants. `outline-none`
       because the focus is ours rather than theirs — the photograph is plainly the subject of
       the page, and a ring around the whole viewport would say nothing. Keyboard focus on the
       controls below is untouched. -->
  <div
    ref="frame"
    tabindex="-1"
    :style="{ '--ar': ratio }"
    class="showcase-frame space-y-6 outline-none"
  >
    <template v-if="photo">
      <!-- `--ar` is the photograph's own shape, read from the asset; `showcase-frame` supplies
           `--showcase-h`. Both are set on the container above rather than here, because custom
           properties inherit and the controls below need the same width to line up with the
           photograph. Between them the figure is at most as tall as the budget and at most as
           wide as the column, with the ratio intact either way. `w-full` so a photograph
           narrower than the column still starts from the column and shrinks to fit. -->
      <figure class="mx-auto w-full max-w-[calc(var(--showcase-h)*var(--ar))]">
        <SanityPhoto :photo="photo" :sizes="sizes" priority />

        <figcaption v-if="photo.caption" class="type-caption mt-3 text-muted">
          {{ photo.caption }}
        </figcaption>
      </figure>

      <!--
        Links, not buttons, for `FilterBar`'s reason: the state is in the URL, so each control is
        a real address that can be middle-clicked, bookmarked and followed without JavaScript.
        The arrow keys in the script do the same navigations.

        Previous and next are absent rather than disabled when there is nowhere to go. A disabled
        control at the end of a gallery is a promise the page cannot keep, and on the index a
        deep-linked photograph outside the loaded set genuinely has no neighbours to offer.
      -->
      <nav aria-label="Photo" class="mx-auto flex max-w-[calc(var(--showcase-h)*var(--ar))] items-center justify-between gap-4">
        <NuxtLink v-if="previousTo" :to="previousTo" :class="CONTROL">
          ← Previous
        </NuxtLink>
        <span v-else />

        <NuxtLink :to="closeTo" replace :class="CONTROL">
          Close
        </NuxtLink>

        <NuxtLink v-if="nextTo" :to="nextTo" :class="CONTROL">
          Next →
        </NuxtLink>
        <span v-else />
      </nav>
    </template>

    <!-- A `?photo=` naming nothing — a mistyped id, a deleted photograph, or one she has hidden
         from the index. Deliberately not a `createError`: this is a query parameter, and letting
         one replace a working gallery with an error screen would be a much worse failure than
         the one it reports. Same register as the gallery page's "No photos here yet." -->
    <div v-else class="max-w-read space-y-4">
      <p class="type-body-serif-lg text-muted">
        That photo is not here — it may have been removed.
      </p>
      <NuxtLink :to="closeTo" replace class="type-body-sm-strong uppercase tracking-[0.1em] text-ink underline">
        Back to the photos
      </NuxtLink>
    </div>
  </div>
</template>
