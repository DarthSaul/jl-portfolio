<script setup lang="ts">
import type { MORE_PHOTOS_QUERY_RESULT } from '~~/sanity.types'
import type { PhotoProjection } from '~/queries/photo'
import { ALL_SHOTS_QUERY, MORE_PHOTOS_QUERY } from '~/queries/allShots'
import { PHOTO_BY_ID_QUERY } from '~/queries/photo'

/**
 * /shots/all — every photograph she has uploaded, minus the ones she has hidden.
 *
 * A static route, so it wins over `[slug].vue`. That shadowing is why `gallery.ts` refuses a
 * slug of "all": without the guard a gallery could claim this address, publish cleanly
 * and then be permanently unreachable with nothing saying why.
 *
 * ## Paging, and what infinite scroll costs
 *
 * Photographs load as you reach the bottom. That was chosen over numbered pages knowing the
 * three things it gives up, and two of them are dealt with here:
 *
 * - **Reaching the end of the page.** Normally infinite scroll strands whatever sits below it.
 *   Here it strands nothing: the copyright and social links live in the sticky sidebar, not in
 *   a footer at the end of `<main>`, so they stay reachable at any scroll depth. This is the
 *   layout paying off rather than anything done on this page.
 * - **Announcing that content appeared.** A `role="status"` region reports the running count,
 *   so a screen reader hears "Showing 48 of 187 photos" instead of nothing. The Load more
 *   button below it is not decoration either: `IntersectionObserver` only fires on scroll, and
 *   a keyboard user tabbing through the grid never triggers it. The button is how they page.
 * - **The URL no longer describes the view, and that one stands.** The *filter* is in the query
 *   string and is shareable; how far you scrolled is not, so a refresh returns you to the first
 *   batch. Recording depth in the URL was considered and dropped: restoring it means fetching
 *   every photo up to that point in one request, which is the cost this page exists to avoid.
 *
 * ## What keeps ~200 photographs cheap
 *
 * The document count is not the expensive part — the LQIP is. Every projected photo carries a
 * base64 placeholder of roughly a kilobyte, so the whole set is ~200 kB of JSON before a single
 * image is requested. So: one page of documents per request via a GROQ slice; `MORE_PHOTOS_QUERY`
 * fetches only the new slice and the page appends, rather than re-fetching from zero; the grid
 * runs `compact`, which halves the requested pixel width per tile; and `SanityPhoto` already
 * lazy-loads everything below the fold and paints the LQIP while it waits.
 */
const route = useRoute()
const router = useRouter()

/** How many arrive per request. Large enough to fill a wide screen, small enough to be cheap. */
const PAGE_SIZE = 24

/**
 * The selected tag slugs. Empty means unfiltered.
 *
 * The *URL* parameter stays `?tag=` because that is what a visitor reads, and it repeats —
 * `?tag=life&tag=chile-2021` — which `vue-router` parses to an array natively, so there is no
 * comma-splitting to hand-roll. It hands back a bare string for one value and `null` for none,
 * hence the normalising below. Only the GROQ parameter is `$filterTags`, and
 * `~/queries/allShots` explains why it cannot be `$tag`.
 *
 * Sorted, so the same selection is always the same array whichever order she ticked the chips
 * in. That matters more than it looks: `params` below is stringified into a cache key, so an
 * unsorted array would make `?tag=a&tag=b` and `?tag=b&tag=a` two separate cache entries for
 * one set of photographs.
 */
const tags = computed(() => {
  const value = route.query.tag
  const list = Array.isArray(value) ? value : value == null ? [] : [value]
  return list.filter((entry): entry is string => Boolean(entry)).sort()
})

/** One string for the watchers, so they fire on a change of contents rather than of identity. */
const tagKey = computed(() => tags.value.join(','))

/**
 * A `reactive` object, and specifically not a `computed`.
 *
 * `useSanityQuery` does two things with what it is given: `reactive(params)`, and
 * `JSON.stringify(params)` to build its cache key. Hand it a `ComputedRef` and the second one
 * throws "Converting circular structure to JSON" pointing at `ComputedRefImpl` — a stringify
 * failure inside the composable, which says nothing about the call site that caused it. A
 * plain reactive object satisfies both, and the composable pushes it onto its own `watch`
 * list, so mutating a property below is what triggers the refetch.
 *
 * `end`, not `limit`. A GROQ slice takes two absolute indices — `[$offset...$end]` — so the
 * second one is where the slice stops, not how many rows it returns. Named `limit` it read as a
 * count, and `end: offset + PAGE_SIZE` in `loadMore` looked like arithmetic nobody could
 * justify.
 */
const params = reactive({ filterTags: tags.value, offset: 0, end: PAGE_SIZE })

const { data, error } = await useSanityQuery(ALL_SHOTS_QUERY, params)

/**
 * `error` before `data`, for the reason `pages/index.vue` spells out at length: a failed request
 * also leaves `data` null, and the two mean opposite things. Without this the template's
 * `v-if="data"` renders nothing at all on a transport failure — a page that looks like a dataset
 * holding no photographs, which is the one symptom a missing CORS origin is indistinguishable
 * from.
 */
if (error.value) {
  throw createError({
    statusCode: 502,
    statusMessage: 'Bad Gateway',
    message: 'Could not reach Sanity — see the logged cause. If this appears only after '
      + 'navigating between pages, this origin is missing from the project\'s CORS allowlist.',
    fatal: true,
    cause: error.value,
  })
}

/**
 * Everything fetched *after* the first page. Kept separate rather than merged into `data` so
 * that changing the filter — which refetches `data` — cannot leave photographs from the
 * previous filter stranded in the list.
 */
const appended = ref<PhotoProjection[]>([])

watch(tagKey, () => {
  // Order does not matter here, but both must happen: the param drives the refetch, and the
  // accumulator has to be dropped or the previous filter's photographs survive underneath the
  // new first page.
  params.filterTags = tags.value
  appended.value = []
})

const photos = computed(() => [...(data.value?.photos ?? []), ...appended.value])
const total = computed(() => data.value?.total ?? 0)
const hasMore = computed(() => photos.value.length < total.value)

/**
 * The chips, straight from the query.
 *
 * This used to do two jobs the query now does for it. It dropped `null`s, because
 * `array::unique` over a flattened `tags[]` of strings typed as `(Tag | null)[]` — GROQ could
 * not promise the array held none even though the filter required `count(tags) > 0`. And it
 * sorted, by looking each value up in a table of labels, because `array::unique` returns no
 * meaningful order and the row would otherwise reshuffle whenever the set changed.
 *
 * Tags are documents now, so `tagsInUse` selects `tag` documents and `| order(title asc)` sorts
 * them by the name that is actually on screen. Nothing is nullable and nothing needs a lookup.
 */
const tagsInUse = computed(() => data.value?.tagsInUse ?? [])

const sanity = useSanity()
const loading = ref(false)

async function loadMore() {
  // `hasMore` and `loading` are both load-bearing: the observer fires repeatedly while the
  // sentinel is in view, and without the guard a single scroll would launch several
  // overlapping requests for the same slice.
  if (loading.value || !hasMore.value) return

  loading.value = true
  try {
    const offset = photos.value.length

    /*
     * The filter this request was started for. A request in flight when she changes the filter
     * comes back describing the *previous* set, and the watcher above has already emptied the
     * accumulator by then — so appending it would refill the list with photographs that do not
     * carry the tags now in the URL, underneath the new first page. `loading` does not cover this:
     * it stops two requests overlapping, not a single one outliving the filter that asked for it.
     *
     * The key rather than the array is what gets compared afterwards: `tags` is a fresh array on
     * every route change, so an identity check would discard every in-flight request including
     * the ones still describing the right set.
     */
    const requestedTags = tags.value
    const requestedKey = tagKey.value

    /*
     * The result type is stated rather than inferred, and this is the one call on the site
     * that has to do that.
     *
     * `client.fetch` is overloaded four ways, and which one applies is decided by whether the
     * params argument looks like `QueryWithoutParams` (`Record<string, never> | undefined`).
     * A params object of plain values matches that first, so the call resolves to the
     * no-params overload and reports "string is not assignable to undefined" — an error about
     * the overload it landed on rather than about anything here. Naming `R` sidesteps the
     * whole resolution.
     *
     * It costs nothing in accuracy: `MORE_PHOTOS_QUERY_RESULT` is generated *from this query*,
     * so editing the GROQ and re-running typegen moves the type with it. This is not a
     * hand-written shape sitting parallel to a generated one — it is the generated one.
     *
     * `useSanityQuery` above does not need any of this; its own signature takes params
     * cleanly. Only the imperative path is affected.
     */
    const next = await sanity.client.fetch<MORE_PHOTOS_QUERY_RESULT>(MORE_PHOTOS_QUERY, {
      filterTags: requestedTags,
      offset,
      end: offset + PAGE_SIZE,
    })

    // Discarded rather than appended if the filter moved while this was in flight. See above.
    if (requestedKey !== tagKey.value) return

    appended.value.push(...next)
  }
  catch {
    // Swallowed deliberately, like the nav's. A failed *extra* page leaves the photographs
    // already on screen intact and the button available to try again; throwing would replace a
    // working page with an error screen over content the visitor is not waiting for.
  }
  finally {
    loading.value = false
  }
}

/**
 * The sentinel is not behind `v-if="hasMore"` — `loadMore` already refuses to do anything when
 * there is nothing left, so that condition would buy nothing and cost an element the observer
 * is watching.
 *
 * It *is* inside the `v-else` that hides the index while the showcase is open, and that is why
 * the wiring below watches the ref rather than attaching once in `onMounted`. Opening a
 * photograph destroys this element and closing it creates a different one; an observer attached
 * at mount would afterwards be holding a detached node, and infinite scroll would silently stop
 * working for the rest of the session — silently being the problem, since the Load more button
 * keeps working and nothing looks broken.
 *
 * Watching the ref covers both directions and also fixes a latent version of the same bug: the
 * old code assumed the sentinel existed at mount, which is not true on a first render with no
 * photographs. `useTemplateRef` is reactive, so this needs no extra bookkeeping.
 *
 * While the showcase is open there is no sentinel, so paging pauses on its own. `appended` is
 * untouched, so closing restores the full list.
 *
 * `rootMargin` starts the fetch while the sentinel is still 800px below the fold, so the next
 * batch is usually in place before the visitor reaches the end of the current one.
 */
const sentinel = useTemplateRef<HTMLElement>('sentinel')
let observer: IntersectionObserver | undefined

/*
 * Built lazily inside the watcher rather than in `onMounted`, so there is no question about
 * which of the two runs first — a template ref is assigned during the mount patch and an
 * `onMounted` hook after it, and an observer that did not exist yet when the element appeared
 * would never attach. `flush: 'post'` for the same reason, one layer up: the callback touches
 * the DOM, so it runs after Vue has finished writing to it.
 */
watch(sentinel, (element, _previous, onCleanup) => {
  if (!import.meta.client || !element) return

  observer ??= new IntersectionObserver(
    entries => entries[0]?.isIntersecting && loadMore(),
    { rootMargin: '800px' },
  )

  observer.observe(element)
  onCleanup(() => observer?.unobserve(element))
}, { flush: 'post' })

onBeforeUnmount(() => observer?.disconnect())

/**
 * Scrolling back to the top on a filter change is the point of the filter — landing halfway
 * down a different set of photographs reads as the page having broken. `router.afterEach` is
 * not used because this only concerns this route.
 */
watch(tagKey, () => {
  if (import.meta.client) window.scrollTo({ top: 0 })
})

/**
 * The showcase — one photograph, alone, at `?photo=<_id>`.
 *
 * See `usePhotoShowcase` for why the address is a query parameter. The short version is the one
 * that matters here: Nuxt keys a page by its interpolated path, so opening a photograph does
 * not re-run `setup`, and `appended` and the observer survive it untouched.
 *
 * ## Why this page needs a query and `/shots/<slug>` does not
 *
 * A gallery is unpaged, so its photographs are all in memory and the id always resolves out of
 * the array. This page holds 24 at a time out of a set that will be ~250, so a link someone
 * shared can name a photograph nobody on this device has scrolled to.
 *
 * `immediate` is what keeps that from costing anything in the common case. It is read once, at
 * setup: a hard load of `?photo=<id>` has the id before the first render and fetches it during
 * SSR, so a shared link paints the photograph on the server; an ordinary load has no id and
 * makes no request at all. Client-side opens are covered by the params watch, which
 * `useSanityQuery` maintains regardless of `immediate`.
 *
 * `!showcase.inList.value` is safe to read here because the first page has already been awaited
 * above — so an id that *is* among the first 24 costs no second request even on a hard load.
 */
const showcase = usePhotoShowcase(photos)

const showcaseParams = reactive({ photoId: showcase.activeId.value })

const { data: fetchedPhoto, status: fetchStatus } = await useSanityQuery(
  PHOTO_BY_ID_QUERY,
  showcaseParams,
  { immediate: Boolean(showcase.activeId.value) && !showcase.inList.value },
)

watch(showcase.activeId, (id) => {
  // Only ever set to a real id. Assigning `''` on close would refetch `*[_id == ""][0]`, whose
  // answer is always null — a request per close, for nothing. Leaving the last id in place is
  // safe because the result is only read while the showcase is open, and re-opening the same
  // photograph then costs no request at all.
  if (id) showcaseParams.photoId = id
})

/**
 * True while the by-id fetch is still out for the photograph named in the URL.
 *
 * Without this the template's `v-else` fires the moment a deep link opens — `fetchedPhoto` is
 * null until the request lands — so a perfectly good photograph announced itself as "not here"
 * and then appeared. The two terms are different waits: the params watch has not run yet, or it
 * has and the request is still in flight.
 */
const showcasePending = computed(() => {
  if (!showcase.activeId.value || showcase.inList.value) return false
  if (showcaseParams.photoId !== showcase.activeId.value) return true
  return fetchStatus.value === 'pending'
})

/**
 * In-memory first, the fetched document second. `null` means the id names nothing visible.
 *
 * The fetched document is checked against the id currently in the URL rather than used
 * whenever it is set, so moving from one deep-linked photograph to another shows nothing for a
 * moment instead of showing the previous one under the new address.
 */
const showcased = computed(
  () =>
    showcase.inList.value
    ?? (fetchedPhoto.value?._id === showcase.activeId.value ? fetchedPhoto.value : null),
)

useHead({
  // A showcased photograph titles the page, so a shared link says what it is. `caption || alt`
  // is the fallback chain `photo.ts`'s Studio preview already uses.
  title: computed(() =>
    showcased.value ? showcased.value.caption || showcased.value.alt : 'All Shots',
  ),
})

// Noindex on the filtered views, and on the showcase. Every filtered permutation is the same
// photographs in a different order, and letting a crawler index near-duplicates of one page is
// how a small site competes with itself in search results. A showcased photograph is the same
// argument again: it is reachable from here and from every gallery it appears in.
useSeoMeta({
  robots: computed(() =>
    tags.value.length || showcase.isOpen.value ? 'noindex, follow' : null,
  ),
})

// Not `router.currentRoute` in a template expression — `useRouter` is here so the empty state
// can offer a way back without hardcoding a second copy of the path.
const clearFilter = () => router.push({ path: '/shots/all' })
</script>

<template>
  <div v-if="data" class="space-y-10">
    <!-- The heading and the filter row stay above the showcase, so the outline and the way back
         to a filtered view are the same whether one photograph is open or all of them are.
         `tabindex="-1"` on the heading is where focus lands when the showcase closes and the
         tile that opened it cannot be found — a deep link, most often. -->
    <header class="max-w-read space-y-6">
      <h2 tabindex="-1" class="type-display-lg text-ink outline-none">
        All Shots
      </h2>

      <ShotsFilterBar :tags="tagsInUse" :active="tags" />
    </header>

    <!-- `v-if`/`v-else`, so "all other photos hidden" means not rendered. A `v-show` would keep
         up to 200 `<li>` in the DOM behind `display: none`, which is the weight the paging
         exists to bound; the scroll position it collapses is saved and restored by the
         composable. -->
    <ShotsPhotoShowcase
      v-if="showcase.isOpen.value"
      :photo="showcased"
      :pending="showcasePending"
      :close-to="showcase.closeTo.value"
      :previous-to="showcase.previous.value ? showcase.openTo(showcase.previous.value._id) : null"
      :next-to="showcase.next.value ? showcase.openTo(showcase.next.value._id) : null"
    />

    <template v-else>
      <PresetsGalleryGrid v-if="photos.length" :photos="photos" compact>
        <template #default="{ photo, sizes }">
          <ShotsPhotoLink :photo="photo" :sizes="sizes" :to="showcase.openTo(photo._id)" />
        </template>
      </PresetsGalleryGrid>

      <div v-else class="max-w-read space-y-4">
        <p class="type-body-serif-lg text-muted">
          No photos here.
        </p>
        <button v-if="tags.length" type="button" class="type-body-sm-strong uppercase tracking-[0.1em] text-ink underline" @click="clearFilter">
          Show all shots
        </button>
      </div>

      <!--
        The running count, announced. `role="status"` is an implicit `aria-live="polite"`, and the
        element is in the DOM from the first render — a live region added to the page at the
        moment it first has something to say is not announced by most screen readers.
      -->
      <p role="status" class="type-caption text-muted">
        <template v-if="photos.length">
          Showing {{ photos.length }} of {{ total }} {{ total === 1 ? 'photo' : 'photos' }}
        </template>
      </p>

      <!-- Not behind `v-if="hasMore"`; see the observer note above for why, and for why the
           observer watches this ref rather than attaching to it once. -->
      <div ref="sentinel" aria-hidden="true" />

      <!--
        The keyboard and assistive-tech path to the next batch, and the only one that exists
        before a scroll happens. It is a real control rather than a fallback that appears when
        something fails, because tabbing through a grid never fires a scroll observer.
      -->
      <div v-if="hasMore">
        <button
          type="button"
          class="type-body-sm-strong border border-ink px-5 py-3 uppercase tracking-[0.1em] text-ink transition-colors hover:bg-ink hover:text-canvas disabled:opacity-50"
          :disabled="loading"
          @click="loadMore"
        >
          {{ loading ? 'Loading…' : 'Load more' }}
        </button>
      </div>
    </template>
  </div>
</template>
