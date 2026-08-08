<script setup lang="ts">
import type { MORE_PHOTOS_QUERY_RESULT } from '~~/sanity.types'
import type { PhotoProjection } from '~/queries/photo'
import { tagLabel } from '~/content/tags'
import { EVERYTHING_QUERY, MORE_PHOTOS_QUERY } from '~/queries/everything'

/**
 * /shots/everything — every photograph she has uploaded, minus the ones she has hidden.
 *
 * A static route, so it wins over `[slug].vue`. That shadowing is why `gallery.ts` refuses a
 * slug of "everything": without the guard a gallery could claim this address, publish cleanly
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
 * `''` means unfiltered. The *URL* parameter stays `?tag=` because that is what a visitor
 * reads; only the GROQ parameter is `$filterTag`, and `~/queries/everything` explains why it
 * cannot be `$tag`.
 */
const tag = computed(() => String(route.query.tag ?? ''))

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
const params = reactive({ filterTag: tag.value, offset: 0, end: PAGE_SIZE })

const { data, error } = await useSanityQuery(EVERYTHING_QUERY, params)

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
    statusMessage: 'Could not reach Sanity — see the logged cause. If this appears only after '
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

watch(tag, (next) => {
  // Order does not matter here, but both must happen: the param drives the refetch, and the
  // accumulator has to be dropped or the previous filter's photographs survive underneath the
  // new first page.
  params.filterTag = next
  appended.value = []
})

const photos = computed(() => [...(data.value?.photos ?? []), ...appended.value])
const total = computed(() => data.value?.total ?? 0)
const hasMore = computed(() => photos.value.length < total.value)

/**
 * `array::unique` over a flattened `tags[]` types as `(Tag | null)[]`, because GROQ cannot
 * promise the array holds no nulls even though the filter requires `count(tags) > 0`. Dropping
 * them here rather than widening the filter row's prop to accept null keeps the nullability at
 * the boundary where it is actually known to be spurious.
 */
const tagsInUse = computed(() =>
  (data.value?.tagsInUse ?? [])
    .filter(t => t !== null)
    // `array::unique` returns no meaningful order, so without this the filter row reshuffles
    // whenever the underlying set changes. Sorted by the label rather than the value, because
    // the label is what is on screen — "USA 2020" belongs under U, not under the `usa-2020`
    // its value happens to start with.
    .sort((a, b) => tagLabel(a).localeCompare(tagLabel(b))),
)

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
     * carry the tag now in the URL, underneath the new first page. `loading` does not cover this:
     * it stops two requests overlapping, not a single one outliving the filter that asked for it.
     */
    const requestedTag = tag.value

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
      filterTag: requestedTag,
      offset,
      end: offset + PAGE_SIZE,
    })

    // Discarded rather than appended if the filter moved while this was in flight. See above.
    if (requestedTag !== tag.value) return

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
 * The sentinel is rendered unconditionally rather than behind `v-if="hasMore"`, so the element
 * the observer is attached to never gets torn down and recreated underneath it. `loadMore`
 * already refuses to do anything when there is nothing more, which makes the `v-if` an
 * observer-lifecycle bug in exchange for nothing.
 *
 * `rootMargin` starts the fetch while the sentinel is still 800px below the fold, so the next
 * batch is usually in place before the visitor reaches the end of the current one.
 */
const sentinel = useTemplateRef<HTMLElement>('sentinel')
let observer: IntersectionObserver | undefined

onMounted(() => {
  observer = new IntersectionObserver(
    entries => entries[0]?.isIntersecting && loadMore(),
    { rootMargin: '800px' },
  )
  if (sentinel.value) observer.observe(sentinel.value)
})

onBeforeUnmount(() => observer?.disconnect())

/**
 * Scrolling back to the top on a filter change is the point of the filter — landing halfway
 * down a different set of photographs reads as the page having broken. `router.afterEach` is
 * not used because this only concerns this route.
 */
watch(tag, () => {
  if (import.meta.client) window.scrollTo({ top: 0 })
})

useHead({ title: 'Everything' })

// Noindex on the filtered views only. Every filtered permutation is the same photographs in a
// different order, and letting a crawler index eleven near-duplicates of one page is how a
// small site competes with itself in search results.
useSeoMeta({
  robots: computed(() => (tag.value ? 'noindex, follow' : null)),
})

// Not `router.currentRoute` in a template expression — `useRouter` is here so the empty state
// can offer a way back without hardcoding a second copy of the path.
const clearFilter = () => router.push({ path: '/shots/everything' })
</script>

<template>
  <div v-if="data" class="space-y-10">
    <header class="max-w-read space-y-6">
      <h2 class="type-display-lg text-ink">
        Everything
      </h2>

      <ShotsFilterBar :tags="tagsInUse" :active="tag" />
    </header>

    <PresetsGalleryGrid v-if="photos.length" :photos="photos" compact />

    <div v-else class="max-w-read space-y-4">
      <p class="type-body-serif-lg text-muted">
        No photos here.
      </p>
      <button v-if="tag" type="button" class="type-body-sm-strong uppercase tracking-[0.1em] text-ink underline" @click="clearFilter">
        Show everything
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

    <!-- Always rendered; see the observer note above. -->
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
  </div>
</template>
