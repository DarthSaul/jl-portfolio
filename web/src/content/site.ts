/**
 * Site chrome that is structure rather than words: the routes in the menu, the social links,
 * the copyright line.
 *
 * The words moved to Sanity (`siteSettings`) when she asked to name things herself — the site
 * name, the byline, the description and the menu labels. What stays here is the shape of the
 * site, which changes when we change the route table, not when she edits a page — plus the
 * fallback copy of her words, used only when Sanity cannot be read.
 */

/** Every menu entry, by the key her label is stored under in `siteSettings.navLabels`. */
export type NavKey = 'start' | 'galleries' | 'featured' | 'allShots' | 'copy' | 'bio';

export type NavLabels = Record<NavKey, string>;

/**
 * One top-level menu item. `copy` and `bio` are links to a page; `galleries` is not — it is the
 * IMAGES dropdown, a button that opens the list of Featured, the galleries and ALL SHOTS. There is
 * no /gallery index page for it to link to.
 *
 * `start` and `featured` are still `NavKey`s because their labels are still hers to edit, but
 * neither is a top-level item any more: the wordmark links home, and Featured is the first entry
 * in the dropdown. Their `menuOrder` entries are dropped on read by `orderNav`.
 */
export type NavItem =
	| { key: 'galleries' }
	| { key: Exclude<NavKey, 'galleries' | 'allShots'>; to: string };

export type SocialIcon = 'mail' | 'substack' | 'instagram';

export type SocialLink = {
	/** Accessible name. The rendered link is icon-only, so this is the only label a screen reader gets. */
	label: string;
	href: string;
	icon: SocialIcon;
};

/**
 * Her words for the site, as the app shows them when Sanity cannot say.
 *
 * **The Studio is the source, not this.** Site name, byline, description and the menu labels
 * are `siteSettings` fields she edits; `sanity/siteSettings.ts` reads
 * them and falls back here, field by field, only when the read fails or a field is empty. So
 * this copy goes stale the moment she edits one — accepted, because the alternative on a Sanity
 * outage is a header with no name in it on every page. Do not chase her edits into this file;
 * the fallback's only job is to be plausible.
 */
export const SITE_FALLBACK = {
	title: 'Joan Lebow',
	byline: 'Staking things out, making a few claims',
	description:
		'Essays, blog posts and street photography from Joan Lebow — a former newspaper ' +
		'reporter with a taste for the wry side of real life.',
	navLabels: {
		start: 'Start',
		galleries: 'Images',
		featured: 'Featured',
		allShots: 'All Shots',
		copy: 'Copy',
		bio: 'Bio',
	} satisfies NavLabels,
};

export const SITE = {
	/**
	 * The shape of the menu: which pages exist, in their default order. The *words* and the
	 * *order* are hers — see `siteSettings.navLabels` and `.menuOrder`, applied by `orderNav`
	 * below — and the routes are ours: a label she can change is a name, and a route she could
	 * change would be a page that can vanish. `/copy` and `/bio` were renamed from `/writing` and
	 * `/about` at her request; `next.config.ts` redirects the old addresses.
	 *
	 * Labels are stored sentence case and uppercased in CSS so that assistive tech reads "Copy"
	 * rather than spelling it out. Keep them stored that way whatever the design does.
	 *
	 * IMAGES (`galleries`) has no `to`: it opens a dropdown, not a page. Its items — Featured, the
	 * galleries, then ALL SHOTS — are assembled in `SiteNav`. There is no START: the wordmark is
	 * the link home. /contact is deliberately absent — the header's icons carry contact.
	 */
	nav: [
		{ key: 'galleries' },
		{ key: 'copy', to: '/copy' },
		{ key: 'bio', to: '/bio' },
	] satisfies NavItem[],

	/** The header's three icon links, in the order they render. */
	social: [
		{ label: 'Joan on Instagram', href: 'https://www.instagram.com/joanatstake', icon: 'instagram' },
		{ label: 'Joan on Substack', href: 'https://substack.com/@joanatstake', icon: 'substack' },
		{ label: 'Email Joan', href: 'mailto:joanlebow@gmail.com', icon: 'mail' },
	] satisfies SocialLink[],

	copyright: 'copy + images © joan lebow',
	credit: 'made with ❤️ by saul graves',
};

/**
 * `SITE.nav` in her order (`siteSettings.menuOrder`), and never a broken menu.
 *
 * The Studio only lets her drag that list, but a stored value can still be short, repeat a page
 * or name one that no longer exists — a paste, a half-edited draft, a schema change. So an
 * unknown or repeated key is dropped, and any item she has not listed is inserted after the item
 * it follows in the default order (at the top if it has none) — so an item added to the site
 * later lands where it would by default, not at the bottom of her menu. Whatever is stored, the
 * menu has every item exactly once. `studio/scripts/seed-site-settings.ts` writes the same
 * insertion into the stored list, so the Studio shows what the site renders.
 */
export function orderNav(order: readonly string[] | null | undefined): NavItem[] {
	const ordered: NavItem[] = (order ?? [])
		.filter((key, index, keys) => keys.indexOf(key) === index)
		.flatMap(key => SITE.nav.filter(item => item.key === key));
	let previous: NavItem | null = null;
	for (const item of SITE.nav) {
		if (!ordered.includes(item))
			ordered.splice(previous ? ordered.indexOf(previous) + 1 : 0, 0, item);
		previous = item;
	}
	return ordered;
}
