<script setup lang="ts">
import { HOME_QUERY } from '~/queries/home';

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
const { data: home, error } = await useSanityQuery(HOME_QUERY);

/**
 * `error` is checked before `home`, because a failed request also leaves `home` null and the
 * two mean opposite things.
 *
 * This distinction cost real debugging time once. Nuxt purges a route's cached data when it
 * unmounts, so navigating away from `/` and back re-runs this query in the *browser* rather
 * than on the server — and a browser request carries an `Origin` header the server's does not.
 * The Vercel origin was missing from the project's CORS allowlist, so Sanity answered 403; the
 * page reported "No homePage document found in this dataset"; and the search went to the
 * dataset environment variable, which was correct all along. A hard load kept working, because
 * that path never leaves the server. See the CORS note in CLAUDE.md.
 *
 * So: transport failures say so, and the CORS hint is in the message because it is the one
 * cause that is invisible from the symptom. `cause` keeps the underlying error — a 403, a 404
 * for a dataset name that does not exist, an outage — attached rather than discarded.
 *
 * Where that surfaces depends on which side ran the query, and the two are not the same place.
 * A failure during SSR is printed in full by Nitro's default request-error logger, `cause` and
 * all: verified against a production build, where a bad dataset name logged the nested Sanity
 * `ClientError`, its 404 and the response body under `[request error]`. That is what reaches
 * Vercel. A failure on client-side navigation never touches the server, so it is in the
 * browser console instead — and since that is exactly the CORS case above, it is the console
 * to open first when the message mentions the allowlist.
 */
if (error.value) {
	throw createError({
		statusCode: 502,
		statusMessage:
			'Could not reach Sanity — see the logged cause. If this appears only after ' +
			"navigating between pages, this origin is missing from the project's CORS allowlist.",
		fatal: true,
		cause: error.value,
	});
}

/**
 * `homePage` is a singleton and the Studio will not let her delete it, so a missing document
 * means the dataset was never seeded. Failing loudly beats rendering a page with seven empty
 * slots, which reads as a broken site rather than a misconfigured one.
 *
 * Note this no longer covers a mistyped dataset *name*, which the branch above catches instead:
 * Sanity answers a nonexistent dataset with a 404, not an empty result. What still lands here
 * is a real dataset holding no `homePage` — including, per CLAUDE.md, a dataset that was made
 * private, since an anonymous read of one of those returns 200 and an empty result rather than
 * a 401.
 */
if (!home.value) {
	throw createError({
		statusCode: 500,
		statusMessage: 'No homePage document found in this dataset.',
		fatal: true,
	});
}

/**
 * `titleTemplate` is overridden to the bare title for this page only.
 *
 * app.vue appends " · Joan Lebow" to whatever a page sets, which is right everywhere else and
 * wrong here — `homePage.title` is already her name, and the default would render it twice.
 * Her current site titles its front page with the plain wordmark, and this matches it while
 * still taking the value from the field the Studio tells her controls the browser tab.
 */
useHead({ title: home.value.title, titleTemplate: '%s' });
</script>

<template>
	<!-- The four `mx-auto max-w-[1080px] px-5` wrappers this page used to carry are gone: the
       layout's `<main>` owns the gutter, and `bleed` is how the photo grid reaches past it.
       See `layouts/default.vue`.

       `space-y-section` is DESIGN.md's 48px section padding, opened up on a phone where the
       photo grid collapses to one column and the bands need more air to stay distinct. -->
	<div v-if="home" class="space-y-14 lg:space-y-section">
		<!-- :title="home.featuredTitle" :subtitle="home.featuredSubtitle"  -->
		<HomePhotoStrip :photos="home.featuredPhotos" />

		<!-- Slot 5. Parked, not deleted — `blurb` is still fetched by HOME_QUERY.
		<ProseText :value="home.blurb" class="type-body-serif-lg max-w-read" /> -->

		<HomeFeaturedWriting :items="home.featuredWriting" />
	</div>
</template>
