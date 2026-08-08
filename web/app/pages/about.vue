<script setup lang="ts">
import { ABOUT_QUERY } from '~/queries/about';

/**
 * BIO — a few paragraphs about her, with photographs among them, and her portrait below.
 *
 * The same body renderer as a writing post, because it is the same field shape: `ProseBody`
 * handles the prose, the links inside it, and the photographs that wrap text around
 * themselves. The page adds the column it sits in and the portrait at the end.
 *
 * No page heading, for the reason /writing has none: the nav already says BIO, and a heading
 * repeating the tab you just clicked is a heading worth deleting. The `title` field is the
 * browser tab only, which is what the Studio tells her it is — and it is used bare, because
 * its initial value already ends in her name and the default template would append it twice.
 *
 * `aboutPage` is a singleton the Studio will not let her delete, so a missing document means
 * the dataset is wrong — the wrong name, or one never seeded. It throws rather than rendering
 * an empty page, the same call `pages/index.vue` makes and for the same reason. That is the
 * difference from /writing, where the missing singleton only costs an optional intro.
 *
 * ## The portrait
 *
 * The photograph that used to open the front page. It comes from `homePage.introPhoto` and the
 * comment in `queries/about.ts` explains at length why reading another page's field is a
 * stopgap rather than the shape this should keep.
 *
 * It is placed after the body deliberately and only for now — "underneath the main bio". A
 * portrait of the author belongs above her own words at least as much as below them, and that
 * is a design call to make on purpose rather than inherit from the order it landed in.
 *
 * `portrait` is allowed to be null while `page` is not: a missing `homePage` costs a photograph
 * and nothing else, so the page drops it and renders the bio.
 */
const { data: about } = await useSanityQuery(ABOUT_QUERY);

const doc = about.value?.page;
if (!doc) {
	throw createError({
		statusCode: 500,
		statusMessage: 'No aboutPage document found in this dataset.',
		fatal: true,
	});
}

useHead({ title: doc.title, titleTemplate: '%s' });
</script>

<template>
	<!-- `max-w-read` and no `mx-auto`: the prose measure sits flush left in the main column,
       under the sidenav's alignment rather than floating in the middle of the page. -->
	<div v-if="about?.page" class="max-w-read">
		<ProseBody :value="about.page.body" class="type-body-serif-lg" />

		<!-- Square corners, like everything else: DESIGN.md's radius scale is `{rounded.none}`
         plus a circle for icon containers, and a photograph is neither.

         `sizes` is the reading column's real width, not a viewport fraction — the shell caps
         at 1440px with a 240px sidenav beside it, so `100vw` would over-request badly here. -->
		<figure v-if="about.portrait" class="mt-section">
			<SanityPhoto :photo="about.portrait" sizes="(min-width: 768px) 750px, 100vw" />

			<figcaption v-if="about.portrait.caption" class="type-caption mt-3 text-muted">
				{{ about.portrait.caption }}
			</figcaption>
		</figure>
	</div>
</template>
