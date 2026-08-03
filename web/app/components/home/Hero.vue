<script setup lang="ts">
import type { HOME_QUERY_RESULT } from '~~/sanity.types';

type Home = NonNullable<HOME_QUERY_RESULT>;

/**
 * Slot 4 — the heading and introduction, on a card overlapping her photograph.
 *
 * The photograph takes the right two-thirds and the card sits at the top left, crossing the
 * photo's left edge by 100px. Both live in the same grid cell rather than being absolutely
 * positioned, so the card cannot escape the container or collide with what follows at any
 * width — the overlap is a width overrun inside a grid track, not a coordinate.
 *
 * Below `md` there is no room for two-thirds-plus-an-overlap, so the two stack: the photo runs
 * full-bleed and the card is pulled up over its lower edge. Deliberately the *lower* edge — the
 * intro photo is a portrait of her, and a card near the top of a full-width phone-sized photo
 * lands squarely on the subject's face. The desktop overlap sits beside her, not on her.
 *
 * ## What the rules cost here, still
 *
 * CLAUDE.md calls this the first real test of the no-crop rule and that has not changed by
 * narrowing the photo. There is no hotspot to crop around, so the photograph renders at its own
 * proportions and **the photo decides how tall this section is** — now at two-thirds width
 * rather than full, which makes a tall portrait roughly a third shorter than it was. The cost
 * still lands on her: which photo she picks matters. That is a sentence in the Studio field
 * description, not a knob.
 *
 * The card is solid `bg-ink`, not the translucent band it was when it sat wholly over the
 * photo. Only 100px of it overlaps now; the rest is over the white page, where a translucent
 * dark panel reads as washed out rather than deliberate.
 *
 * This lives in `components/home/`, not `components/presets/`. A preset is something she picks
 * from the fixed list in the gallery schema, and CLAUDE.md requires a component and a schema
 * option always land together. This is a fixed composition belonging to one page.
 */
defineProps<{
	heading: Home['introHeading'];
	intro: Home['intro'];
	photo: Home['introPhoto'];
}>();
</script>

<template>
	<section class="grid md:grid-cols-3 md:items-start">
		<!-- Right two-thirds, flush to the container's right edge. -->
		<div class="md:col-span-2 md:col-start-2 md:row-start-1">
			<SanityPhoto :photo="photo" priority sizes="(min-width: 1080px) 693px, (min-width: 768px) 66vw, 100vw" />
		</div>

		<!-- Left third plus 100px, which is what puts the card over the photo's edge. `min-w-0`
         is load-bearing: a grid track's automatic minimum is its item's min-content size, so
         without it an item deliberately wider than its track widens the track instead of
         overflowing it — and the photo would be squeezed below two-thirds. Later in the DOM
         than the photo, so it paints on top without a z-index. -->
		<div class="-mt-16 px-5 md:col-start-1 md:row-start-1 md:mt-10 md:w-[calc(100%_+_100px)] md:min-w-0 md:px-0">
			<div class="bg-ink p-8 text-white sm:p-10">
				<h2 v-if="heading" class="text-xl font-light sm:text-2xl">
					{{ heading }}
				</h2>
				<ProseText :value="intro" :class="['text-lg leading-relaxed sm:text-xl', heading && 'mt-3']" />
			</div>
		</div>
	</section>
</template>
