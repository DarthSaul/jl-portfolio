import type { RouteLocationRaw } from 'vue-router'

import type { PhotoProjection } from '~/queries/photo'

/**
 * One photograph, alone on the page, at an address someone can send.
 *
 * ## Why it is a query parameter and not a route
 *
 * `?photo=<_id>` on whichever `/shots/*` page you were already on. The obvious alternative is a
 * nested route — `/shots/[slug]/[photo]` — and it was rejected on one measured fact: **Nuxt keys
 * a page by its *interpolated path*, not by `fullPath`.** A navigation that changes only the
 * query string therefore keeps the same key, `<RouterView>` reuses the component instance, and
 * `setup` does not re-run.
 *
 * That is the whole feature working for free on `/shots/all`, which holds two things a route
 * change would destroy: `appended`, every photograph loaded past the first page, and the
 * `IntersectionObserver` driving it. Recovering those under a nested route means lifting the
 * accumulator into `useState` and hand-rolling scroll restoration, which is a lot of machinery
 * bought with a prettier address. `useSanityQuery` watches its params object and nothing else,
 * so opening the showcase also fires no request at all.
 *
 * The query string composes, too: `?tag=life&photo=X` is a photograph reached from a filtered
 * index, and closing it returns to that filter rather than to the unfiltered pile.
 *
 * ## Open pushes, close replaces
 *
 * Opening is a `push`, so Back closes the showcase — which is what a visitor expects from
 * something that filled the page. Closing is a `replace` to the same address minus `photo`, so
 * repeatedly opening and closing does not stack history entries you then have to walk back
 * through.
 *
 * Escape performs the *same navigation* as the close link rather than calling `router.back()`.
 * That matters for the deep-linked visitor: `back()` would take them off the site, where this
 * takes them to the index they were sent a photograph from. It also means the close link,
 * Escape and Back all converge on one code path — the `watch` on `activeId` below — instead of
 * three handlers that have to agree.
 *
 * ## What is deliberately not here
 *
 * No fetching. The two pages resolve the id differently — a gallery has all its photographs
 * already and looks the photo up in the array it was handed, while the index may need to ask
 * for one it has not paged to — and a composable that tried to serve both would have to know
 * which page it was on. So this owns the *route state* and the pages own their data.
 *
 * No lifecycle hooks either, following `useNavDrawer`'s rule. The `watch` below is safe because
 * this is called exactly once per page; the window listener that closes on Escape belongs to
 * `PhotoShowcase.vue`, which is the single element owner, and registering it here would mean a
 * second listener the day a second component calls this.
 */
export function usePhotoShowcase(photos: Ref<PhotoProjection[]>) {
  const route = useRoute()

  /**
   * `''` when nothing is showcased.
   *
   * `route.query.photo` is `string | string[] | null` — a visitor can type `?photo=a&photo=b`
   * and get an array. Anything that is not a single string is treated as no showcase rather
   * than guessed at, which is the same posture `tag` takes on the index.
   */
  const activeId = computed(() => {
    const value = route.query.photo
    return typeof value === 'string' ? value : ''
  })

  const isOpen = computed(() => activeId.value !== '')

  /** The photograph in the currently loaded list, or `null` if it is not among them. */
  const inList = computed(() =>
    activeId.value ? photos.value.find(photo => photo._id === activeId.value) ?? null : null,
  )

  const index = computed(() =>
    activeId.value ? photos.value.findIndex(photo => photo._id === activeId.value) : -1,
  )

  /** Where clicking a photograph goes. Spreads the existing query so `?tag=` survives. */
  const openTo = (id: string): RouteLocationRaw => ({
    path: route.path,
    query: { ...route.query, photo: id },
  })

  /** The same address without `photo`. Used by the close link, by Escape, and by nothing else. */
  const closeTo = computed<RouteLocationRaw>(() => {
    const { photo: _photo, ...rest } = route.query
    return { path: route.path, query: rest }
  })

  /**
   * The photographs either side, within the loaded list.
   *
   * `null` at the ends, and `null` for both when the showcased photograph is not in the list at
   * all — a deep link past the first page of the index. Hiding the controls is the honest
   * answer there: "previous" would have to mean "previous among the 24 you have not loaded",
   * which is not a thing, and guessing would send someone to an unrelated photograph.
   */
  const previous = computed(() =>
    index.value > 0 ? photos.value[index.value - 1] ?? null : null,
  )

  const next = computed(() =>
    index.value >= 0 && index.value < photos.value.length - 1
      ? photos.value[index.value + 1] ?? null
      : null,
  )

  /**
   * Where the index was scrolled to when the showcase opened.
   *
   * The pages render the grid behind a `v-if`, so opening collapses the document and the browser
   * clamps `scrollY` to the new maximum — by the time the showcase closes, the old position is
   * gone. Nuxt's default `scrollBehavior` returns `undefined` for a same-path navigation, so
   * nothing restores it either.
   *
   * Restoring on `nextTick` is only reliable because `SanityPhoto` reserves every box from the
   * asset's own dimensions: the grid's full height is back on the next tick, without waiting for
   * a single image to decode. That is a decision made elsewhere paying off here, and it is worth
   * knowing before anyone considers making the reservation conditional.
   */
  const savedScroll = ref(0)

  watch(activeId, (id, previousId) => {
    if (!import.meta.client) return

    if (id && !previousId) {
      savedScroll.value = window.scrollY
      window.scrollTo({ top: 0 })
      return
    }

    if (!id && previousId) {
      nextTick(() => window.scrollTo({ top: savedScroll.value }))
    }
  })

  return { activeId, isOpen, inList, index, previous, next, openTo, closeTo }
}
