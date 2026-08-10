<script setup lang="ts">
import { ABOUT_QUERY } from '~/queries/about';

/**
 * ABOUT — a heading and introduction, then a few paragraphs with photographs among them.
 *
 * `ProseBody` is the same renderer a writing post uses, because it is the same field shape: it
 * handles the prose, the links inside it, and the photographs that wrap text around themselves.
 * The page adds the column they sit in and nothing else.
 *
 * **Every photograph on this page comes from the body.** There is no separate photo field and
 * no photo rendered outside the prose — she places them by typing around them, which is
 * `aboutPage`'s design and the reason it has no `portrait`. A pinned portrait briefly appeared
 * below the body, read across from `homePage.introPhoto` because the front page had stopped
 * showing it; both that field and the cross-document read are gone.
 *
 * No page heading beyond her own: the nav already says ABOUT, so a second "About" under the tab
 * you just clicked is a heading worth deleting. `introHeading` is hers and is something else —
 * "Welcome" — which is why it renders and a route-name heading would not. The `title` field is
 * the browser tab only, which is what the Studio tells her it is, and it is used bare because
 * its initial value already ends in her name and the default template would append it twice.
 *
 * `aboutPage` is a singleton the Studio will not let her delete, so a missing document means
 * the dataset is wrong — the wrong name, or one never seeded. It throws rather than rendering
 * an empty page, the same call `pages/index.vue` makes and for the same reason. That is the
 * difference from /copy, where the missing singleton only costs an optional intro.
 */
const { data: about, error } = await useSanityQuery(ABOUT_QUERY);

/**
 * `error` before `about`, the same order and for the same reason as `pages/index.vue`, which
 * spells it out at length: a failed request also leaves the data null, so without this branch a
 * transport failure reports "No aboutPage document found in this dataset" and sends the search
 * to the dataset name, which was right all along. The CORS case is the one that is invisible
 * from the symptom, so the message names it.
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

const doc = about.value;
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
       under the sidenav's alignment rather than floating in the middle of the page.

       `space-y` rather than a margin on the body, so the gap disappears along with the intro
       when both of its fields are empty — both are optional in the schema. -->
	<div v-if="about" class="max-w-read space-y-5">
		<AboutIntro :heading="about.introHeading" :intro="about.intro" class="border-b border-hairline pb-4" />

		<ProseBody :value="about.body" class="type-body-serif-lg" />
	</div>
</template>
