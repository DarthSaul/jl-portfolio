<script setup lang="ts">
import { SITE } from '~/content/site';

/**
 * All of the site's chrome: wordmark, byline, nav, social links, copyright.
 *
 * A left-hand column from `lg` up, and a slide-free drawer below it. It replaces `SiteHeader`
 * (centred wordmark + tagline + horizontal nav) and `SiteFooter` (social circles + copyright),
 * both of which are gone — there is no `<footer>` element on the site any more.
 *
 * ## One element, two shapes, and exactly one `<h1>`
 *
 * There is a single `<aside>` in the DOM at every viewport width. Nothing is rendered
 * conditionally on width, because Vue cannot know the viewport during SSR and any attempt to
 * would be a hydration mismatch rather than a layout.
 *
 * The split that makes that work is between the **header strip**, which is visible at every
 * width, and the **panel**, which is a static block in the column on desktop and a full-screen
 * overlay on a phone. The wordmark lives in the strip.
 *
 * That placement is the whole trick, and the obvious alternative gets it wrong. Put the `<h1>`
 * in the drawer and, on a phone with the nav closed, the drawer is `display: none` — so the
 * wordmark is not merely invisible, it is **out of the accessibility tree, and the page has no
 * level-1 heading at all**. In the strip it is always present, always announced, and the mobile
 * bar needs no second non-heading copy of her name to make up for it.
 *
 * The byline is in the panel rather than the strip, and that is the one thing the arrangement
 * costs: on a phone it is visible only while the nav is open. The alternatives were a second
 * copy of the string (one string, two places — the thing CLAUDE.md's "prefer deleting a knob"
 * instinct is about) or an 80px bar on a 390px screen to hold three words of decoration.
 *
 * ## Two Tailwind v4 traps this markup is shaped around
 *
 * **Conflicting utilities resolve by emitted-CSS order, not class-list order.** So
 * `:class="isOpen ? 'fixed' : 'sticky'"` on one element is a coin flip rather than a toggle.
 * Every conditional class below is a `display` pair — `flex flex-col` against `hidden lg:flex`
 * — two branches that never both apply.
 *
 * **The panel is a full-screen opaque overlay**, so there is no backdrop element and no
 * backdrop-click handler. There is nothing behind it to click. If it ever becomes a
 * partial-width drawer, that handler comes back with it.
 */
const { isOpen, close, toggle } = useNavDrawer();

const toggleBtn = useTemplateRef<HTMLButtonElement>('toggleBtn');

/**
 * Every effect lives here rather than in `useNavDrawer`, because the composable is also called
 * by `layouts/default.vue` and a listener registered per-caller would be registered twice.
 */

/** Escape closes from anywhere, including with focus on a nav link inside the drawer. */
const onKeydown = (event: KeyboardEvent) => {
	if (event.key === 'Escape' && isOpen.value) closeAndRestoreFocus();
};

/**
 * The drawer and the desktop column are the same element, so crossing the `lg` breakpoint
 * while the drawer is open would leave `isOpen` true against a layout that has no drawer — and
 * `<main>` would stay `inert`, which is to say the desktop page would be silently unclickable.
 * Closing on the crossing is the fix; a resize is not a state we can render our way out of.
 */
let wide: MediaQueryList | undefined;
const onWiden = (event: MediaQueryListEvent) => {
	if (event.matches) close();
};

onMounted(() => {
	window.addEventListener('keydown', onKeydown);
	wide = window.matchMedia('(min-width: 64rem)'); // Tailwind's `lg`
	wide.addEventListener('change', onWiden);
});

onBeforeUnmount(() => {
	window.removeEventListener('keydown', onKeydown);
	wide?.removeEventListener('change', onWiden);
});

/**
 * Focus follows the drawer. Opening moves it onto the toggle — which is also the close button,
 * so this is usually where it already is — and closing puts it back there, which is the case
 * that actually matters: Escape pressed with focus deep in the nav would otherwise drop focus
 * to the top of a page that just became interactive again.
 *
 * There is no focus *trap* here and none is needed. `<main>` is `inert` while the drawer is
 * open (see `layouts/default.vue`), and an inert subtree leaves the tab order entirely — so
 * the only tabbable things left are the toggle and the drawer's own links. `inert` is the trap.
 */
const closeAndRestoreFocus = () => {
	close();
	nextTick(() => toggleBtn.value?.focus());
};

const onToggle = async () => {
	toggle();
	await nextTick();
	toggleBtn.value?.focus();
};

/** Navigating closes it. `fullPath`, so a hash-only link closes the drawer too. */
const route = useRoute();
watch(() => route.fullPath, close);

/**
 * Scroll lock. `overflow-hidden` on `<html>` rather than the `position: fixed` body-lock hack,
 * which loses the scroll position on close and is a well-known source of jank. It does not
 * fully stop iOS Safari rubber-banding; `overscroll-contain` on the panel covers the
 * scroll-chaining half of that, and the remainder is not worth the hack.
 */
useHead(() => ({
	htmlAttrs: { class: { 'overflow-hidden': isOpen.value } },
}));
</script>

<template>
	<!--
    The sidebar sets its own gutter rather than using `main-column`. That utility's `xl` step
    widens to 56px, which is right for a 1120px reading column and would leave this 240px one
    with 128px of usable width.
  -->
	<aside
		class="sticky top-0 z-40 bg-canvas lg:flex lg:h-dvh lg:w-sidebar lg:shrink-0 lg:flex-col lg:self-start lg:overflow-y-auto"
	>
		<!-- Always visible, at every width. Holds the site's only level-1 heading. -->
		<div
			class="flex h-bar shrink-0 items-center justify-between border-b border-hairline px-5 lg:h-auto lg:block lg:border-b-0 lg:px-8 lg:pt-14"
		>
			<h1 class="type-display-sm lg:type-display-md">
				<NuxtLink to="/" class="text-ink transition-opacity hover:opacity-60">
					{{ SITE.title }}
				</NuxtLink>
			</h1>

			<button
				ref="toggleBtn"
				type="button"
				class="-mr-2 p-2 text-ink lg:hidden"
				:aria-expanded="isOpen"
				:aria-label="isOpen ? 'Close menu' : 'Open menu'"
				aria-controls="site-nav-panel"
				@click="onToggle"
			>
				<svg
					class="size-6"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					aria-hidden="true"
				>
					<template v-if="isOpen">
						<path d="M5 5 19 19" />
						<path d="M19 5 5 19" />
					</template>
					<template v-else>
						<path d="M3 7h18" />
						<path d="M3 17h18" />
					</template>
				</svg>
			</button>
		</div>

		<!--
      The panel. `lg:static` returns it to the column; below that it is a full-screen sheet
      starting under the bar, which is what `top-bar` and `--spacing-bar` are for — one number
      for the bar's height and the sheet's offset.
    -->
		<div
			id="site-nav-panel"
			class="fixed inset-x-0 bottom-0 top-bar z-40 overflow-y-auto overscroll-contain bg-canvas px-5 pt-8 pb-10 lg:static lg:z-auto lg:mt-4 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-8 lg:pt-0"
			:class="isOpen ? 'flex flex-col' : 'hidden lg:flex'"
		>
			<!-- `uppercase` is a class rather than part of the type token, deliberately: the tokens
           carry no `text-transform` so that the decision stays visible beside the text it
           changes. `SITE.nav` and this line both depend on that. -->
			<p class="type-body-sm uppercase tracking-[0.18em] text-muted">
				{{ SITE.tagline }}
			</p>

			<SiteNav class="mt-10" />

			<!--
        `lg:mt-auto` anchors the bottom group — portrait, socials, copyright — to the foot of
        the sticky column. It sits on the portrait's wrapper above, because that is now the
        first element of the group; it was on this `<ul>` while the socials led it. On a phone
        the panel is content-height inside a scrolling sheet, so they simply follow the nav.

        Bare glyphs rather than filled circles. `{rounded.full}` is the one radius DESIGN.md
        allows and it scopes it to "circular icon containers only" — but a filled container on
        a page whose only other mark is a 1px hairline reads as four buttons demanding
        attention, so the shape is kept for the hit area and the fill is not drawn.
      -->
			<!--
        Her illustrated portrait, and **the second `<img>` in the app** — so the check in
        `SanityPhoto.vue` and in CLAUDE.md ("grep -rn '<img' web/app finds one tag") now finds
        two. It is not a hole in that rule so much as a case the rule does not reach: the rule
        routes *photographs* through `SanityPhoto` for srcset, LQIP and alt-from-the-document,
        and all three of those need a Sanity asset. This is a static file in `web/public/`, in
        the same category as `SiteSocialIcon`'s hand-written glyphs — chrome that ships with the
        code, not content she edits. Teaching `SanityPhoto` to also swallow bare URLs was
        considered and rejected once already, for putting a permanent hole in the rule to serve
        a single call site.

        What that costs, and is paid for by hand here: `width`/`height` reserve the box so
        nothing shifts as it loads, and the `alt` is written at the call site because there is
        no photo document to read one off. Both are things `SanityPhoto` would have done.

        `max-h` rather than a fixed `h`/`w` pair, per CLAUDE.md's bound-vs-crop line — the
        image's own proportions survive, so the cap is the only number decided here and the
        width follows from it: 196×250 renders ~98px wide inside a 176px column.

        **`width`/`height` must be re-measured from the file every time it changes, not
        carried over.** They have been wrong once already — they said 1254×1254 against an
        848×1082 file, because the image was swapped and the old square was assumed rather
        than checked. A stale pair reserves the wrong box and shifts the socials and the
        copyright as the portrait loads, and nothing errors to say so.

        The file is stored at 250px on its long side, twice the cap, so it is sharp on a 2×
        screen and not a pixel wider. Nothing in `web/public/` is processed at build time — no
        srcset, no format negotiation, no resizing — so the file on disk is exactly what every
        visitor downloads, and it is the only place that size can be decided. Raising the cap
        means re-exporting the source, not editing this line. Resize with `sips -Z 250`, which
        fits within the bound; lowercase `-z` takes an exact width and height and will happily
        squash the picture to reach them.
      -->
			<div class="mt-12 lg:mt-auto lg:pt-12">
				<img
					src="/joan-animated.png"
					alt="Illustrated portrait of Joan Lebow"
					width="196"
					height="250"
					class="max-h-[125px] w-auto"
				/>
			</div>

			<ul class="mt-6 flex items-center gap-5">
				<li v-for="link in SITE.social" :key="link.href">
					<!--
            Icon-only, so `aria-label` is the only name a screen reader gets. `mail` opens a
            mail client rather than a tab, which is why it alone is exempt from the target/rel
            pair.
          -->
					<a
						:href="link.href"
						:aria-label="link.label"
						v-bind="link.icon === 'mail' ? {} : { target: '_blank', rel: 'me noopener' }"
						class="block rounded-full text-muted transition-colors hover:text-ink"
					>
						<SiteSocialIcon :name="link.icon" class="size-5" />
					</a>
				</li>
			</ul>

			<div class="type-caption mt-6 text-muted lg:pb-10">
				<p class="mb-2">
					{{ SITE.copyright }}
				</p>
				<p>
					{{ SITE.credit }}
				</p>
			</div>
		</div>
	</aside>
</template>
